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
  getQuoteBySymbol,
  getStatsBySymbol,
  backfillOHLC 
} = require('../controllers/stockController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getStocks);
// Public endpoints by symbol (must be before /:id to avoid route conflicts)
router.get('/symbol/:symbol/history', getHistoryBySymbol);
router.get('/symbol/:symbol/quote', getQuoteBySymbol);
router.get('/symbol/:symbol/stats', getStatsBySymbol);
router.get('/:id', getStock);
router.post('/', protect, authorize(['ADMIN']), createStock);   // chỉ admin thêm
router.put('/:id', protect, authorize(['ADMIN']), updateStock);
// Admin-only refresh endpoints
router.post('/refresh/:symbol', protect, authorize(['ADMIN']), refreshStockBySymbol);
router.post('/refresh', protect, authorize(['ADMIN']), refreshAllStocks);
// Admin-only backfill OHLC data
router.post('/backfill/:symbol', protect, authorize(['ADMIN']), backfillOHLC);

module.exports = router;
