/*
  File: routes/orderRoutes.js
  Purpose: Define order-related API endpoints for placing and managing buy/sell orders.
*/
const express = require('express');
const { placeOrder, getOrders } = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, placeOrder);
router.get('/', protect, getOrders);

module.exports = router;
