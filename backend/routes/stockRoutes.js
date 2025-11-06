/*
  File: routes/stockRoutes.js
  Purpose: Define stock-related API endpoints (list, detail, create, update) and restrict mutations to admin users.
*/
const express = require('express');
const { 
  getStocks, 
  getStock, 
  createStock, 
  updateStock, 
  refreshStockBySymbol, 
  refreshAllStocks, 
  getHistoryBySymbol,
  backfillOHLC 
} = require('../controllers/stockController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getStocks);
router.get('/:id', getStock);
// Public history endpoint by symbol
router.get('/symbol/:symbol/history', getHistoryBySymbol);
router.post('/', protect, admin, createStock);   // chỉ admin thêm
router.put('/:id', protect, admin, updateStock);
// Admin-only refresh endpoints
router.post('/refresh/:symbol', protect, admin, refreshStockBySymbol);
router.post('/refresh', protect, admin, refreshAllStocks);
// Admin-only backfill OHLC data
router.post('/backfill/:symbol', protect, admin, backfillOHLC);

module.exports = router;
