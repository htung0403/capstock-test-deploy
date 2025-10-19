import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../components/Toast";
import api from "../services/api";
import {
  CARD_TYPES,
  detectCardType,
  formatCardNumber,
  getCardTypeInfo,
  isValidCardLength,
  getCVVLength,
  isValidCVV,
  isValidExpiryDate,
  validateCard,
  maskCardNumber,
} from "../helper/cardDetection";

// Import card logos
import visaLogo from "../assets/card_logo/visa.svg";
import mastercardLogo from "../assets/card_logo/mastercard.svg";
import amexLogo from "../assets/card_logo/amex.svg";
import jcbLogo from "../assets/card_logo/jcb.svg";

// Card logo mapping
const CARD_LOGOS = {
  VISA: visaLogo,
  MASTERCARD: mastercardLogo,
  AMEX: amexLogo,
  JCB: jcbLogo,
};

const BANKS = [
  { code: "VIETCOMBANK", name: "Vietcombank", logo: "🏦" },
  { code: "TECHCOMBANK", name: "Techcombank", logo: "🏦" },
  { code: "MBBANK", name: "MB Bank", logo: "🏦" },
  { code: "VIETINBANK", name: "VietinBank", logo: "🏦" },
];

function Payment() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { show } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("CARD"); // CARD or QR
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  
  const isDark = theme === 'dark';

  // Card payment state
  const [cardData, setCardData] = useState({
    amount: "",
    cardNumber: "",
    cardHolder: "",
    cardType: "",
    expiryDate: "",
    cvv: "",
  });

  const [detectedCardType, setDetectedCardType] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // QR payment state
  const [qrPayment, setQrPayment] = useState({
    amount: "",
    bankName: "VIETCOMBANK",
  });

  // Validation function
  const validateCardData = () => {
    const errors = {};
    
    // Validate amount
    const amountValue = parseFloat(cardData.amount.replace(/\./g, ''));
    if (!cardData.amount || amountValue <= 0) {
      errors.amount = 'Vui lòng nhập số tiền hợp lệ';
    } else if (amountValue < 1000) {
      errors.amount = 'Số tiền tối thiểu là 1.000';
    }
    
    // Validate card number
    if (!cardData.cardNumber) {
      errors.cardNumber = 'Vui lòng nhập số thẻ';
    } else if (!detectedCardType && cardData.cardNumber.replace(/\s/g, '').length >= 16) {
      errors.cardNumber = 'Số thẻ không hợp lệ hoặc loại thẻ không được hỗ trợ';
    } else if (cardData.cardNumber.replace(/\s/g, '').length < 13) {
      errors.cardNumber = 'Số thẻ phải có ít nhất 13 chữ số';
    }
    
    // Validate card holder
    if (!cardData.cardHolder.trim()) {
      errors.cardHolder = 'Vui lòng nhập tên chủ thẻ';
    } else if (cardData.cardHolder.trim().length < 2) {
      errors.cardHolder = 'Tên chủ thẻ phải có ít nhất 2 ký tự';
    }
    
    // Validate expiry date
    if (!cardData.expiryDate) {
      errors.expiryDate = 'Vui lòng nhập ngày hết hạn';
    } else if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) {
      errors.expiryDate = 'Ngày hết hạn phải có định dạng MM/YY';
    } else {
      const [month, year] = cardData.expiryDate.split('/');
      const currentDate = new Date();
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      if (expiryDate <= currentDate) {
        errors.expiryDate = 'Thẻ đã hết hạn';
      }
    }
    
    // Validate CVV
    if (!cardData.cvv) {
      errors.cvv = 'Vui lòng nhập CVV';
    } else {
      const expectedLength = detectedCardType === 'AMEX' ? 4 : 3;
      if (cardData.cvv.length !== expectedLength) {
        errors.cvv = `CVV phải có ${expectedLength} chữ số`;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCardPayment = async (e) => {
    e.preventDefault();
    
    if (!validateCardData()) {
      show('Vui lòng kiểm tra lại thông tin thẻ', 'error');
      return;
    }
    
    setLoading(true);

    try {
      // Sử dụng cardType đã detect hoặc mặc định
      const finalCardType = cardData.cardType || detectedCardType || "VISA";

      const response = await api.post("/payments/card", {
        ...cardData,
        cardType: finalCardType,
        cardNumber: cardData.cardNumber.replace(/\s/g, ""), // Remove spaces
        amount: cardData.amount.replace(/\./g, ""), // Remove dots from amount
      });

      if (response.status === 200 || response.status === 201) {
        show(
          `✅ Thanh toán thành công! Số dư mới: $${response.data.payment?.amount || response.data.newBalance}`,
          'success'
        );
        // Reset form
        setCardData({
          amount: "",
          cardNumber: "",
          cardHolder: "",
          cardType: "",
          expiryDate: "",
          cvv: "",
        });
        setDetectedCardType(null);
        setValidationErrors({});
        // Reload trang để lấy số dư mới
        window.location.reload();
      } else {
        show(`❌ Lỗi: ${response.data.message || 'Có lỗi xảy ra'}`, 'error');
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      show(`❌ Lỗi: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler cho thay đổi số tiền với auto-format
  const handleAmountChange = (e) => {
    let value = e.target.value.replace(/\./g, ''); // Remove existing dots
    
    if (/^\d*$/.test(value)) { // Only allow digits
      // Remove leading zeros, but keep at least one digit
      value = value.replace(/^0+/, '') || '0';
      
      // If it's just "0", don't format with dots
      if (value === '0') {
        setCardData({ ...cardData, amount: '0' });
      } else {
        const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Add dots every 3 digits
        setCardData({ ...cardData, amount: formatted });
      }
      
      // Clear amount error when user types
      if (validationErrors.amount) {
        setValidationErrors({ ...validationErrors, amount: '' });
      }
    }
  };

  // Handler cho thay đổi số thẻ với auto-detect
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, ""); // Remove spaces

    if (value.length <= 16 && /^\d*$/.test(value)) {
      const formatted = formatCardNumber(value);
      const detected = detectCardType(value);

      setCardData({
        ...cardData,
        cardNumber: formatted,
        cardType: detected || cardData.cardType,
      });

      setDetectedCardType(detected);
      
      // Clear card number error when user types
      if (validationErrors.cardNumber) {
        setValidationErrors({ ...validationErrors, cardNumber: '' });
      }
    }
  };

  // Handler cho thay đổi ngày hết hạn với auto-format
  const handleExpiryDateChange = (e) => {
    const input = e.target.value;
    const currentValue = cardData.expiryDate;
    
    // Nếu đang xóa (input ngắn hơn current value)
    if (input.length < currentValue.length) {
      // Nếu xóa dấu /, thì xóa luôn số trước đó
      if (currentValue.endsWith('/') && !input.endsWith('/')) {
        setCardData({ ...cardData, expiryDate: input.slice(0, -1) });
        return;
      }
      setCardData({ ...cardData, expiryDate: input });
      return;
    }
    
    // Logic format khi thêm ký tự mới
    let value = input.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    
    if (value.length <= 5) {
      setCardData({ ...cardData, expiryDate: value });
    }
    
    // Clear expiry error when user types
    if (validationErrors.expiryDate) {
      setValidationErrors({ ...validationErrors, expiryDate: '' });
    }
  };

  const handleQRPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/payments/qr", qrPayment);

      if (response.status === 200 || response.status === 201) {
        setQrData(response.data.payment);
      } else {
        showToast(`Lỗi: ${response.data.message || 'Có lỗi xảy ra'}`, "error");
      }
    } catch (error) {
      console.error("QR payment error:", error);
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      showToast(`Lỗi: ${errorMsg}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmQR = async () => {
    if (!qrData) return;

    try {
      const response = await api.post("/payments/qr/confirm", {
        orderId: qrData.orderId,
      });

      if (response.status === 200 || response.status === 201) {
        showToast(`Xác nhận thành công! Số dư mới: $${response.data.newBalance}`, "success");
        setQrData(null);
        setQrPayment({ amount: "", bankName: "VIETCOMBANK" });
        // Reload trang để lấy số dư mới
        window.location.reload();
      } else {
        showToast(`Lỗi: ${response.data.message || 'Có lỗi xảy ra'}`, "error");
      }
    } catch (error) {
      console.error("Confirm error:", error);
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      showToast(`Lỗi: ${errorMsg}`, "error");
    }
  };

  return (
    <div className="container px-4 py-8 transition-colors duration-200 text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-slate-100">
          💳 Nạp Tiền
        </h1>

        {/* Balance Display */}
        <div className="card mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Số dư hiện tại</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {`$${user?.balance?.toLocaleString() || 0}`}
              </p>
            </div>
            <div className="text-4xl opacity-20">💰</div>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setPaymentMethod("CARD")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              paymentMethod === "CARD"
                ? "bg-blue-600 text-white shadow-lg transform -translate-y-0.5"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            💳 Thanh toán bằng thẻ
          </button>
          <button
            onClick={() => setPaymentMethod("QR")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              paymentMethod === "QR"
                ? "bg-blue-600 text-white shadow-lg transform -translate-y-0.5"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            📱 Thanh toán QR Code
          </button>
        </div>

        {/* Card Payment Form */}
        {paymentMethod === "CARD" && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
              💳 Thanh toán bằng thẻ
            </h2>

            <form onSubmit={handleCardPayment} className="space-y-6">
              <div>
                <label className="form-label">
                  Số tiền (USD)
                </label>
                <input
                  type="text"
                  value={cardData.amount}
                  onChange={handleAmountChange}
                  className={`form-input ${validationErrors.amount ? 'border-red-500' : ''}`}
                  placeholder="10.000"
                  required
                />
                {validationErrors.amount && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Số thẻ
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={cardData.cardNumber}
                    onChange={handleCardNumberChange}
                    className={`form-input flex-1 ${validationErrors.cardNumber ? 'border-red-500' : ''}`}
                    // placeholder="4532 1234 5678 9012"
                    maxLength="19"
                    required
                  />
                  {detectedCardType && (
                    <div className="flex-shrink-0">
                      <img 
                        src={CARD_LOGOS[detectedCardType]} 
                        alt={CARD_TYPES.find((c) => c.code === detectedCardType)?.name}
                        className="w-12 h-8 object-contain bg-white rounded border border-gray-200 dark:border-gray-600 p-1"
                      />
                    </div>
                  )}
                </div>
                {validationErrors.cardNumber && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.cardNumber}</p>
                )}
                {!detectedCardType && cardData.cardNumber.replace(/\s/g, '').length >= 16 && !validationErrors.cardNumber && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ❌ Số thẻ không hợp lệ hoặc loại thẻ không được hỗ trợ
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Tên chủ thẻ
                </label>
                <input
                  type="text"
                  value={cardData.cardHolder}
                  onChange={(e) => {
                    setCardData({
                      ...cardData,
                      cardHolder: e.target.value.toUpperCase(),
                    });
                    // Clear cardholder error when user types
                    if (validationErrors.cardHolder) {
                      setValidationErrors({ ...validationErrors, cardHolder: '' });
                    }
                  }}
                  className={`form-input ${validationErrors.cardHolder ? 'border-red-500' : ''}`}
                  placeholder="NGUYEN VAN A"
                  required
                />
                {validationErrors.cardHolder && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.cardHolder}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Ngày hết hạn (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={cardData.expiryDate}
                    onChange={handleExpiryDateChange}
                    className={`form-input ${validationErrors.expiryDate ? 'border-red-500' : ''}`}
                    placeholder="MM/YY"
                    maxLength="5"
                    required
                  />
                  {validationErrors.expiryDate && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.expiryDate}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">CVV</label>
                  <input
                    type="text"
                    value={cardData.cvv}
                    onChange={(e) => {
                      setCardData({ ...cardData, cvv: e.target.value });
                      // Clear CVV error when user types
                      if (validationErrors.cvv) {
                        setValidationErrors({ ...validationErrors, cvv: '' });
                      }
                    }}
                    className={`form-input ${validationErrors.cvv ? 'border-red-500' : ''}`}
                    placeholder="123"
                    maxLength="4"
                    required
                  />
                  {validationErrors.cvv && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.cvv}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : "💳 Thanh toán"}
              </button>
          </form>
        </div>
      )}

        {/* QR Payment Form */}
        {paymentMethod === "QR" && !qrData && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
              📱 Thanh toán QR Code
            </h2>

            <form onSubmit={handleQRPayment} className="space-y-6">
              <div>
                <label className="form-label">
                  Số tiền (VND)
                </label>
                <input
                  type="number"
                  value={qrPayment.amount}
                  onChange={(e) =>
                    setQrPayment({ ...qrPayment, amount: e.target.value })
                  }
                  className="form-input"
                  placeholder="50000"
                  min="1000"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Chọn ngân hàng
                </label>
                <select
                  value={qrPayment.bankName}
                  onChange={(e) =>
                    setQrPayment({ ...qrPayment, bankName: e.target.value })
                  }
                  className="form-input"
                >
                  {BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.logo} {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? "Đang tạo QR..." : "📱 Tạo mã QR"}
              </button>
          </form>
        </div>
      )}

        {/* QR Code Display */}
        {qrData && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100 text-center">
              📱 Quét mã QR để thanh toán
            </h2>

            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-6">
                <img
                  src={qrData.qrImageUrl}
                  alt="QR Code"
                  className="mx-auto w-64 h-64 object-contain"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl mb-6 text-left border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Thông tin chuyển khoản
                </h3>
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Ngân hàng:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{qrData.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Số tài khoản:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{qrData.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Tên người nhận:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{qrData.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Số tiền:</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      {qrData.amount.toLocaleString()} VND
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Nội dung:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{qrData.transferContent}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-red-600 dark:text-red-400 text-sm flex items-center justify-center gap-2">
                    <span>⏰</span>
                    <span>Hết hạn: {new Date(qrData.expiresAt).toLocaleString("vi-VN")}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConfirmQR}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  ✅ Xác nhận đã chuyển khoản
                </button>

                <button
                  onClick={() => setQrData(null)}
                  className="w-full bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-4 rounded-xl font-semibold transition-all duration-200"
                >
                  ❌ Hủy
                </button>
              </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              💡 Trong môi trường test, bạn có thể click "Xác nhận" ngay mà
              không cần chuyển khoản thật
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Payment;
