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
  cancelPayment,
  createMoMoPayment,
  handleMoMoIPN,
  handleMoMoReturn,
  queryMoMoTransaction
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// ===== CARD & QR PAYMENTS =====
// Tạo thanh toán bằng thẻ
router.post('/card', protect, createCardPayment);

// Tạo thanh toán bằng QR code
router.post('/qr', protect, createQRPayment);

// Xác nhận thanh toán QR (webhook simulation)
router.post('/qr/confirm', protect, confirmQRPayment);

// ===== MOMO PAYMENTS =====
// Tạo thanh toán MoMo
router.post('/momo', protect, createMoMoPayment);

// IPN endpoint - MoMo webhook (không cần protect vì đến từ MoMo server)
router.post('/momo/ipn', handleMoMoIPN);

// Return URL - User quay lại sau thanh toán (không cần protect)
router.get('/momo/return', handleMoMoReturn);

// Query trạng thái giao dịch MoMo
router.get('/momo/:orderId/query', protect, queryMoMoTransaction);

// ===== GENERAL PAYMENT ROUTES =====
// Lấy danh sách payment (có thể filter)
router.get('/', protect, getPayments);

// Lấy chi tiết payment theo orderId
router.get('/:orderId', protect, getPaymentById);

// Hủy payment
router.patch('/:orderId/cancel', protect, cancelPayment);

module.exports = router;
