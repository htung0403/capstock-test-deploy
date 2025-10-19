/*
  File: controllers/orderController.js
  Purpose: Handle order creation, retrieval, status updates, and cancellation logic.
*/
const Order = require('../models/Order');
const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const User = require('../models/User');

// Đặt lệnh mua/bán cổ phiếu
exports.placeOrder = async (req, res) => {
  try {
    const { stockSymbol, type, quantity, price } = req.body;

    console.log('=== PLACE ORDER REQUEST ===');
    console.log('User ID:', req.user?.id);
    console.log('Request Body:', req.body);

    // Validate input
    if (!stockSymbol || !type || !quantity || !price) {
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp đầy đủ thông tin: stockSymbol, type, quantity, price' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
    }

    if (price <= 0) {
      return res.status(400).json({ message: 'Giá phải lớn hơn 0' });
    }

    // Kiểm tra cổ phiếu có tồn tại không
    const stock = await Stock.findOne({ symbol: stockSymbol.toUpperCase() });
    console.log('Found Stock:', stock);
    
    if (!stock) {
      return res.status(404).json({ message: 'Không tìm thấy cổ phiếu' });
    }

    // Lấy thông tin user
    const user = await User.findById(req.user.id);
    console.log('Found User:', { id: user?._id, balance: user?.balance });
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const totalValue = quantity * price;

    console.log('User Balance:', user.balance);
    console.log('Total Value Required:', totalValue);

    // Kiểm tra điều kiện đặt lệnh
    if (type === 'BUY') {
      // Kiểm tra số dư
      if (user.balance < totalValue) {
        console.log('❌ Insufficient balance!');
        return res.status(400).json({ 
          message: 'Số dư không đủ để thực hiện giao dịch',
          required: totalValue,
          available: user.balance
        });
      }
    } else if (type === 'SELL') {
      // Kiểm tra số lượng cổ phiếu trong portfolio
      const portfolio = await Portfolio.findOne({ 
        user: req.user.id, 
        stock: stock._id 
      });
      
      if (!portfolio || portfolio.quantity < quantity) {
        return res.status(400).json({ 
          message: 'Không đủ số lượng cổ phiếu để bán',
          required: quantity,
          available: portfolio ? portfolio.quantity : 0
        });
      }
    } else {
      return res.status(400).json({ message: 'Loại lệnh không hợp lệ (BUY hoặc SELL)' });
    }

    // Tạo lệnh
    console.log('Creating order with data:', {
      user: req.user.id,
      stock: stock._id,
      stockSymbol: stock.symbol,
      type,
      quantity,
      price,
      status: 'PENDING'
    });
    
    const order = await Order.create({
      user: req.user.id,
      stock: stock._id,
      stockSymbol: stock.symbol,
      type,
      quantity,
      price,
      status: 'PENDING'
    });
    
    console.log('✅ Order created successfully:', order._id);

    // Tự động khớp lệnh ngay lập tức (matching engine đơn giản)
    await executeOrder(order._id);

    // Lấy lệnh đã cập nhật
    const executedOrder = await Order.findById(order._id).populate('stock');
    
    // Lấy user data mới để trả về số dư đã cập nhật
    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(201).json({
      message: 'Đặt lệnh thành công',
      order: executedOrder,
      user: updatedUser
    });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(400).json({ message: err.message });
  }
};

// Hàm thực thi lệnh (matching engine đơn giản)
async function executeOrder(orderId) {
  const order = await Order.findById(orderId).populate('stock');
  if (!order || order.status !== 'PENDING') {
    return;
  }

  try {
    const user = await User.findById(order.user);
    const totalValue = order.quantity * order.price;

    if (order.type === 'BUY') {
      // Trừ tiền từ tài khoản
      user.balance -= totalValue;
      await user.save();

      // Cập nhật hoặc tạo mới portfolio
      let portfolio = await Portfolio.findOne({ 
        user: order.user, 
        stock: order.stock 
      });

      if (portfolio) {
        // Tính lại giá mua trung bình
        const totalCost = (portfolio.quantity * portfolio.avgBuyPrice) + totalValue;
        const totalQuantity = portfolio.quantity + order.quantity;
        portfolio.avgBuyPrice = totalCost / totalQuantity;
        portfolio.quantity = totalQuantity;
      } else {
        // Tạo mới portfolio
        portfolio = new Portfolio({
          user: order.user,
          stock: order.stock,
          quantity: order.quantity,
          avgBuyPrice: order.price
        });
      }
      await portfolio.save();

    } else if (order.type === 'SELL') {
      // Cộng tiền vào tài khoản
      user.balance += totalValue;
      await user.save();

      // Cập nhật portfolio
      const portfolio = await Portfolio.findOne({ 
        user: order.user, 
        stock: order.stock 
      });

      if (portfolio) {
        portfolio.quantity -= order.quantity;
        
        // Nếu bán hết, xóa khỏi portfolio
        if (portfolio.quantity === 0) {
          await Portfolio.deleteOne({ _id: portfolio._id });
        } else {
          await portfolio.save();
        }
      }
    }

    // Cập nhật trạng thái lệnh
    order.status = 'FILLED';
    await order.save();

  } catch (error) {
    console.error('Error executing order:', error);
    // Nếu có lỗi, đánh dấu lệnh là CANCELLED
    order.status = 'CANCELLED';
    await order.save();
    throw error;
  }
}

// Lấy danh sách lệnh của user
exports.getOrders = async (req, res) => {
  try {
    const { status, type } = req.query;
    
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const orders = await Order.find(filter)
      .populate('stock')
      .sort({ createdAt: -1 });
    
    res.json({
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Error getting orders:', err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy chi tiết một lệnh
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('stock');
    
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh' });
    }

    // Kiểm tra quyền truy cập
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền truy cập lệnh này' });
    }

    res.json(order);
  } catch (err) {
    console.error('Error getting order:', err);
    res.status(500).json({ message: err.message });
  }
};

// Hủy lệnh
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy lệnh' });
    }

    // Kiểm tra quyền
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền hủy lệnh này' });
    }

    // Chỉ có thể hủy lệnh đang PENDING
    if (order.status !== 'PENDING') {
      return res.status(400).json({ 
        message: `Không thể hủy lệnh đã ${order.status}` 
      });
    }

    order.status = 'CANCELLED';
    await order.save();

    res.json({
      message: 'Hủy lệnh thành công',
      order
    });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ message: err.message });
  }
};
