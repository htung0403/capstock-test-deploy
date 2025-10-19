/*
  File: routes/paymentRoutes.js
  Purpose: Define payment-related API endpoints for card and QR code payments.
*/
const express = require('express');
const { 
  createCardPayment,
  createQRPayment,
  confirmQRPayment,
  getPayments,
  getPaymentById,
  cancelPayment
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tạo thanh toán bằng thẻ
router.post('/card', protect, createCardPayment);

// Tạo thanh toán bằng QR code
router.post('/qr', protect, createQRPayment);

// Xác nhận thanh toán QR (webhook simulation)
router.post('/qr/confirm', protect, confirmQRPayment);

// Lấy danh sách payment (có thể filter)
router.get('/', protect, getPayments);

// Lấy chi tiết payment theo orderId
router.get('/:orderId', protect, getPaymentById);

// Hủy payment
router.patch('/:orderId/cancel', protect, cancelPayment);

module.exports = router;
