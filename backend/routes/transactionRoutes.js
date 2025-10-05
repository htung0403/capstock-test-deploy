/*
  File: routes/transactionRoutes.js
  Purpose: Define transaction-related API endpoints (list, detail) for executed trades and cash movements.
*/
const express = require('express');
const { deposit, withdraw, getTransactions } = require('../controllers/transactionController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/deposit', protect, deposit);
router.post('/withdraw', protect, withdraw);
router.get('/', protect, getTransactions);

module.exports = router;
