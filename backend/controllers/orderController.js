/*
  File: controllers/orderController.js
  Purpose: Handle order creation, retrieval, status updates, and cancellation logic.
*/
const Order = require('../models/Order');
const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const User = require('../models/User');
const matchingEngine = require('../services/matchingEngine');

// Đặt lệnh mua/bán cổ phiếu với các loại lệnh: Market, Limit, Stop, Stop-Limit
exports.placeOrder = async (req, res) => {
  try {
    const { 
      stockSymbol, 
      type, 
      orderType = 'MARKET',  // Default to MARKET order
      quantity, 
      limitPrice, 
      stopPrice,
      expiresAt 
    } = req.body;

    console.log('=== PLACE ORDER REQUEST ===');
    console.log('User ID:', req.user?.id);
    console.log('Request Body:', req.body);

    // Validate input
    if (!stockSymbol || !type || !quantity) {
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp đầy đủ thông tin: stockSymbol, type, quantity' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
    }

    // Validate order type specific requirements
    if (orderType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) {
        return res.status(400).json({ message: 'Lệnh Limit phải có giá giới hạn hợp lệ' });
      }
    }

    if (orderType === 'STOP') {
      if (!stopPrice || stopPrice <= 0) {
        return res.status(400).json({ message: 'Lệnh Stop phải có giá kích hoạt hợp lệ' });
      }
    }

    if (orderType === 'STOP_LIMIT') {
      if (!stopPrice || stopPrice <= 0 || !limitPrice || limitPrice <= 0) {
        return res.status(400).json({ message: 'Lệnh Stop-Limit phải có cả giá kích hoạt và giá giới hạn hợp lệ' });
      }
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

    // Tạo lệnh mới
    console.log('Creating order with data:', {
      user: req.user.id,
      stock: stock._id,
      stockSymbol: stock.symbol,
      type,
      orderType,
      quantity,
      marketPrice: stock.currentPrice,
      limitPrice,
      stopPrice,
      expiresAt,
      status: 'PENDING'
    });
    
    const order = await Order.create({
      user: req.user.id,
      stock: stock._id,
      stockSymbol: stock.symbol,
      type,
      orderType,
      quantity,
      marketPrice: stock.currentPrice, // Save market price at order creation
      limitPrice,
      stopPrice,
      expiresAt,
      status: 'PENDING'
    });
    
    console.log('✅ Order created successfully:', order._id);

    // Process order through matching engine
    const result = await matchingEngine.processOrder(order);

    // Lấy lệnh đã cập nhật
    const executedOrder = await Order.findById(order._id).populate('stock');
    
    // Lấy user data mới để trả về số dư đã cập nhật
    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(201).json({
      message: result.message || 'Đặt lệnh thành công',
      order: executedOrder,
      user: updatedUser,
      executionDetails: result.executionPrice ? {
        executionPrice: result.executionPrice,
        totalAmount: result.totalAmount
      } : null
    });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(400).json({ message: err.message });
  }
}


// Lấy danh sách lệnh của user
exports.getOrders = async (req, res) => {
  try {
    const { status, type, orderType, stockSymbol } = req.query;
    
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (orderType) filter.orderType = orderType;
    if (stockSymbol) filter.stockSymbol = stockSymbol.toUpperCase();

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

    // Chỉ có thể hủy lệnh nếu canBeCancelled() trả về true
    if (!order.canBeCancelled()) {
      return res.status(400).json({ 
        message: `Không thể hủy lệnh đã ${order.status}` 
      });
    }

    order.status = 'CANCELLED';
    order.reason = 'Người dùng hủy lệnh';
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

// Lấy lệnh đang hoạt động (PENDING, TRIGGERED)
exports.getActiveOrders = async (req, res) => {
  try {
    const { stockSymbol } = req.query;
    
    const filter = { 
      user: req.user.id,
      status: { $in: ['PENDING', 'TRIGGERED'] }
    };
    
    if (stockSymbol) {
      filter.stockSymbol = stockSymbol.toUpperCase();
    }

    const orders = await Order.find(filter)
      .populate('stock')
      .sort({ createdAt: -1 });

    res.json({
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Error getting active orders:', err);
    res.status(500).json({ message: err.message });
  }
};

