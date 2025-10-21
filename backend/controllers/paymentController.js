/*
  File: controllers/paymentController.js
  Purpose: Handle payment operations including card and QR code payments.
*/
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const momoService = require('../services/momoService');

// Tạo thanh toán bằng thẻ ảo
exports.createCardPayment = async (req, res) => {
  try {
    const { amount, cardNumber, cardHolder, cardType, expiryDate, cvv } = req.body;

    // Validate input
    if (!amount || !cardNumber || !cardHolder || !cardType || !expiryDate || !cvv) {
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp đầy đủ thông tin thẻ' 
      });
    }

    if (amount < 1000) {
      return res.status(400).json({ 
        message: 'Số tiền tối thiểu là 1,000 VND' 
      });
    }

    // Validate card number (16 digits)
    if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        message: 'Số thẻ không hợp lệ (phải có 16 chữ số)' 
      });
    }

    // Validate CVV (3-4 digits)
    if (!/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({ 
        message: 'CVV không hợp lệ (phải có 3-4 chữ số)' 
      });
    }

    // Validate expiry date (MM/YY)
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
      return res.status(400).json({ 
        message: 'Ngày hết hạn không hợp lệ (MM/YY)' 
      });
    }

    // Check if card is expired
    const [month, year] = expiryDate.split('/');
    const expiryDate_full = new Date(2000 + parseInt(year), parseInt(month), 0);
    if (expiryDate_full < new Date()) {
      return res.status(400).json({ 
        message: 'Thẻ đã hết hạn' 
      });
    }

    // Tạo order ID
    const orderId = Payment.generateOrderId();
    
    // Lấy 4 số cuối của thẻ
    const lastFourDigits = cardNumber.slice(-4);

    // Tạo payment record
    const payment = await Payment.create({
      user: req.user.id,
      paymentMethod: 'CARD',
      orderId,
      amount,
      type: 'DEPOSIT',
      status: 'PENDING',
      cardInfo: {
        cardNumber: `****${lastFourDigits}`,
        cardHolder: cardHolder.toUpperCase(),
        cardType: cardType.toUpperCase(),
        expiryDate
      },
      description: `Nạp tiền bằng thẻ ${cardType}`,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 phút
    });

    // Mô phỏng xử lý thanh toán (trong thực tế sẽ gọi API payment gateway)
    // Giả lập thành công ngay lập tức
    await processCardPayment(payment._id);

    const updatedPayment = await Payment.findById(payment._id);

    res.status(201).json({
      message: 'Thanh toán thành công',
      payment: updatedPayment
    });
  } catch (err) {
    console.error('Error creating card payment:', err);
    res.status(400).json({ message: err.message });
  }
};

// Tạo QR code thanh toán
exports.createQRPayment = async (req, res) => {
  try {
    const { amount, bankName } = req.body;

    if (!amount) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập số tiền cần nạp' 
      });
    }

    if (amount < 1000) {
      return res.status(400).json({ 
        message: 'Số tiền tối thiểu là 1,000 VND' 
      });
    }

    // Tạo order ID
    const orderId = Payment.generateOrderId();

    // Thông tin ngân hàng mô phỏng
    const bankInfo = {
      'VIETCOMBANK': {
        name: 'Vietcombank',
        accountNumber: '1234567890',
        accountName: 'STOCK TRADING PLATFORM'
      },
      'TECHCOMBANK': {
        name: 'Techcombank',
        accountNumber: '9876543210',
        accountName: 'STOCK TRADING PLATFORM'
      },
      'MBBANK': {
        name: 'MB Bank',
        accountNumber: '5555666677',
        accountName: 'STOCK TRADING PLATFORM'
      },
      'VIETINBANK': {
        name: 'VietinBank',
        accountNumber: '1111222233',
        accountName: 'STOCK TRADING PLATFORM'
      }
    };

    const selectedBank = bankInfo[bankName] || bankInfo['VIETCOMBANK'];

    // Tạo nội dung chuyển khoản
    const transferContent = `${orderId} ${req.user.id}`;

    // Tạo QR code string (mô phỏng - trong thực tế dùng VietQR API)
    const qrString = generateQRString(
      selectedBank.accountNumber,
      selectedBank.accountName,
      amount,
      transferContent
    );

    // Tạo URL ảnh QR (sử dụng API QR code generator miễn phí)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;

    // Tạo payment record
    const payment = await Payment.create({
      user: req.user.id,
      paymentMethod: 'QR_CODE',
      orderId,
      amount,
      type: 'DEPOSIT',
      status: 'PENDING',
      qrInfo: {
        qrCode: qrString,
        qrImageUrl,
        bankName: selectedBank.name,
        accountNumber: selectedBank.accountNumber,
        accountName: selectedBank.accountName
      },
      description: `Nạp tiền qua ${selectedBank.name}`,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 phút
    });

    res.status(201).json({
      message: 'Tạo QR code thành công',
      payment: {
        orderId: payment.orderId,
        amount: payment.amount,
        qrImageUrl: payment.qrInfo.qrImageUrl,
        bankName: payment.qrInfo.bankName,
        accountNumber: payment.qrInfo.accountNumber,
        accountName: payment.qrInfo.accountName,
        transferContent,
        expiresAt: payment.expiresAt,
        note: 'Vui lòng chuyển khoản với nội dung chính xác để tự động xác nhận'
      }
    });
  } catch (err) {
    console.error('Error creating QR payment:', err);
    res.status(400).json({ message: err.message });
  }
};

// Xác nhận thanh toán QR (mô phỏng webhook từ ngân hàng)
exports.confirmQRPayment = async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID là bắt buộc' });
    }

    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    if (payment.status === 'SUCCESS') {
      return res.status(400).json({ message: 'Giao dịch đã được xác nhận trước đó' });
    }

    if (payment.isExpired) {
      payment.status = 'FAILED';
      await payment.save();
      return res.status(400).json({ message: 'Giao dịch đã hết hạn' });
    }

    // Cập nhật trạng thái
    payment.status = 'SUCCESS';
    payment.paidAt = new Date();
    payment.transactionId = transactionId || `TXN${Date.now()}`;
    await payment.save();

    // Cộng tiền vào tài khoản
    const user = await User.findById(payment.user);
    user.balance += payment.amount;
    await user.save();

    // Tạo transaction record
    await Transaction.create({
      user: payment.user,
      type: 'deposit',
      amount: payment.amount
    });

    res.json({
      message: 'Xác nhận thanh toán thành công',
      payment,
      newBalance: user.balance
    });
  } catch (err) {
    console.error('Error confirming QR payment:', err);
    res.status(400).json({ message: err.message });
  }
};

// Lấy danh sách payment của user
exports.getPayments = async (req, res) => {
  try {
    const { status, paymentMethod } = req.query;

    const filter = { user: req.user.id };
    if (status) filter.status = status.toUpperCase();
    if (paymentMethod) filter.paymentMethod = paymentMethod.toUpperCase();

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      count: payments.length,
      payments
    });
  } catch (err) {
    console.error('Error getting payments:', err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy chi tiết một payment
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({ 
      orderId: req.params.orderId 
    });

    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    // Kiểm tra quyền
    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền truy cập giao dịch này' });
    }

    res.json(payment);
  } catch (err) {
    console.error('Error getting payment:', err);
    res.status(500).json({ message: err.message });
  }
};

// Hủy payment
exports.cancelPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });

    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền hủy giao dịch này' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ 
        message: `Không thể hủy giao dịch đã ${payment.status}` 
      });
    }

    payment.status = 'CANCELLED';
    await payment.save();

    res.json({
      message: 'Hủy giao dịch thành công',
      payment
    });
  } catch (err) {
    console.error('Error cancelling payment:', err);
    res.status(500).json({ message: err.message });
  }
};

// ===== HELPER FUNCTIONS =====

// Xử lý thanh toán thẻ (mô phỏng)
async function processCardPayment(paymentId) {
  try {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) return;

    // Mô phỏng delay xử lý (1-2 giây)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Mô phỏng tỷ lệ thành công 95%
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      payment.status = 'SUCCESS';
      payment.paidAt = new Date();
      payment.transactionId = `TXN${Date.now()}`;
      await payment.save();

      // Cộng tiền vào tài khoản
      const user = await User.findById(payment.user);
      user.balance += payment.amount;
      await user.save();

      // Tạo transaction record
      await Transaction.create({
        user: payment.user,
        type: 'deposit',
        amount: payment.amount
      });

      console.log(`✅ Card payment ${payment.orderId} processed successfully`);
    } else {
      payment.status = 'FAILED';
      await payment.save();
      console.log(`❌ Card payment ${payment.orderId} failed`);
    }
  } catch (error) {
    console.error('Error processing card payment:', error);
  }
}

// Tạo QR string (mô phỏng VietQR format)
function generateQRString(accountNumber, accountName, amount, content) {
  // Format đơn giản hóa (trong thực tế dùng VietQR standard)
  return JSON.stringify({
    accountNumber,
    accountName,
    amount,
    content,
    type: 'TRANSFER'
  });
}

// ===== MOMO PAYMENT INTEGRATION =====

/**
 * Tạo thanh toán MoMo
 */
exports.createMoMoPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate
    if (!amount || amount < 10000) {
      return res.status(400).json({ 
        message: 'Số tiền tối thiểu là 10,000 VND' 
      });
    }

    if (amount > 50000000) {
      return res.status(400).json({ 
        message: 'Số tiền tối đa là 50,000,000 VND' 
      });
    }

    // Tạo orderId unique
    const orderId = `MOMO${Date.now()}`;
    const orderInfo = `Nạp tiền vào tài khoản ${req.user.username}`;
    const extraData = JSON.stringify({ 
      userId: req.user.id,
      username: req.user.username 
    });

    // Tạo payment record trong DB
    const payment = await Payment.create({
      user: req.user.id,
      paymentMethod: 'MOMO',
      orderId,
      amount,
      type: 'DEPOSIT',
      status: 'PENDING',
      description: orderInfo,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 phút
    });

    console.log('📝 Created MoMo payment record:', orderId);

    // Gọi MoMo API
    const momoResponse = await momoService.createPayment(
      orderId,
      amount,
      orderInfo,
      extraData
    );

    console.log('📱 MoMo response:', momoResponse);

    // Kiểm tra response
    if (momoResponse.resultCode === 0) {
      // Lưu thông tin MoMo vào payment
      payment.momoInfo = {
        payUrl: momoResponse.payUrl,
        deeplink: momoResponse.deeplink,
        qrCodeUrl: momoResponse.qrCodeUrl
      };
      await payment.save();

      return res.status(201).json({
        success: true,
        message: 'Tạo thanh toán MoMo thành công',
        payUrl: momoResponse.payUrl,
        deeplink: momoResponse.deeplink,
        qrCodeUrl: momoResponse.qrCodeUrl,
        orderId
      });
    } else {
      // Cập nhật status failed
      payment.status = 'FAILED';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: momoService.getResultMessage(momoResponse.resultCode),
        error: momoResponse.message
      });
    }
  } catch (error) {
    console.error('❌ MoMo payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi tạo thanh toán MoMo',
      error: error.message 
    });
  }
};

/**
 * Xử lý IPN từ MoMo (webhook)
 * Endpoint này sẽ được MoMo gọi khi có kết quả thanh toán
 */
exports.handleMoMoIPN = async (req, res) => {
  try {
    const data = req.body;

    console.log('📥 MoMo IPN received:', JSON.stringify(data, null, 2));

    // Verify signature để đảm bảo request đến từ MoMo
    if (!momoService.verifySignature(data)) {
      console.error('❌ Invalid MoMo signature');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid signature' 
      });
    }

    console.log('✅ MoMo signature verified');

    // Tìm payment trong DB
    const payment = await Payment.findOne({ orderId: data.orderId });
    
    if (!payment) {
      console.error('❌ Payment not found:', data.orderId);
      return res.status(404).json({ 
        success: false,
        message: 'Payment not found' 
      });
    }

    // Kiểm tra nếu đã xử lý rồi (idempotency)
    if (payment.status === 'SUCCESS') {
      console.log('⚠️ Payment already processed:', data.orderId);
      return res.status(204).send();
    }

    // Kiểm tra resultCode
    if (data.resultCode === 0) {
      // ✅ Thanh toán thành công
      console.log('💰 Processing successful payment:', data.orderId);

      payment.status = 'SUCCESS';
      payment.paidAt = new Date();
      payment.transactionId = data.transId;
      payment.momoInfo = {
        ...payment.momoInfo,
        transId: data.transId,
        payType: data.payType,
        responseTime: data.responseTime
      };
      await payment.save();

      // Cộng tiền vào tài khoản user
      const user = await User.findById(payment.user);
      const oldBalance = user.balance;
      user.balance += payment.amount;
      await user.save();

      console.log(`💵 Updated user balance: ${oldBalance} -> ${user.balance}`);

      // Tạo transaction record
      await Transaction.create({
        user: payment.user,
        type: 'deposit',
        amount: payment.amount,
        description: `Nạp tiền qua MoMo - ${data.orderId}`
      });

      console.log('✅ MoMo payment processed successfully:', data.orderId);
    } else {
      // ❌ Thanh toán thất bại
      console.log('❌ MoMo payment failed:', data.orderId, data.message);

      payment.status = 'FAILED';
      payment.momoInfo = {
        ...payment.momoInfo,
        resultCode: data.resultCode,
        message: data.message,
        responseTime: data.responseTime
      };
      await payment.save();
    }

    // MoMo yêu cầu trả về status 204 No Content
    res.status(204).send();
  } catch (error) {
    console.error('❌ MoMo IPN error:', error);
    // Vẫn phải trả về 204 để MoMo không retry
    res.status(204).send();
  }
};

/**
 * Xử lý redirect từ MoMo (user quay lại sau khi thanh toán)
 */
exports.handleMoMoReturn = async (req, res) => {
  try {
    const { orderId, resultCode, message } = req.query;

    console.log('🔙 MoMo return:', { orderId, resultCode, message });

    // Tìm payment
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.redirect('/payment?status=error&message=Payment+not+found');
    }

    // Redirect dựa trên resultCode
    if (resultCode === '0') {
      // Thành công
      return res.redirect(`/payment?status=success&orderId=${orderId}&amount=${payment.amount}`);
    } else {
      // Thất bại
      const errorMsg = momoService.getResultMessage(parseInt(resultCode)) || message;
      return res.redirect(`/payment?status=failed&orderId=${orderId}&message=${encodeURIComponent(errorMsg)}`);
    }
  } catch (error) {
    console.error('❌ MoMo return error:', error);
    res.redirect('/payment?status=error&message=System+error');
  }
};

/**
 * Query trạng thái giao dịch MoMo
 */
exports.queryMoMoTransaction = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy giao dịch' 
      });
    }

    // Kiểm tra quyền
    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Không có quyền truy cập giao dịch này' 
      });
    }

    // Query từ MoMo
    const momoResponse = await momoService.queryTransaction(orderId, orderId);

    res.json({
      success: true,
      payment,
      momoStatus: momoResponse
    });
  } catch (error) {
    console.error('❌ Query MoMo transaction error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

