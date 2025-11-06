/*
  File: routes/orderRoutes.js
  Purpose: Define order-related API endpoints for placing and managing buy/sell orders.
*/
const express = require('express');
const { 
  placeOrder, 
  getOrders, 
  getOrderById, 
  cancelOrder,
  getActiveOrders
} = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Đặt lệnh mua/bán (hỗ trợ Market, Limit, Stop, Stop-Limit)
router.post('/', protect, placeOrder);

// Lấy danh sách lệnh của user (có thể filter theo status, type, orderType, stockSymbol)
router.get('/', protect, getOrders);

// Lấy lệnh đang hoạt động (PENDING, TRIGGERED) - MUST be before /:id route
router.get('/active', protect, getActiveOrders);

// Lấy chi tiết một lệnh
router.get('/:id', protect, getOrderById);

// Hủy lệnh
router.patch('/:id/cancel', protect, cancelOrder);

module.exports = router;
