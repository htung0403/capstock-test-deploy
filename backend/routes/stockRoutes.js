/*
  File: routes/stockRoutes.js
  Purpose: Define stock-related API endpoints (list, detail, create, update) and restrict mutations to admin users.
*/
const express = require('express');
const { getStocks, getStock, createStock, updateStock } = require('../controllers/stockController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getStocks);
router.get('/:id', getStock);
router.post('/', protect, admin, createStock);   // chỉ admin thêm
router.put('/:id', protect, admin, updateStock);

module.exports = router;
