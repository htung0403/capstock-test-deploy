const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getWatchlist, addStockToWatchlist, removeStockFromWatchlist } = require('../controllers/watchlistController');

// All watchlist routes require authentication
router.use(protect);

// @route GET /api/watchlist
// @desc Get user's watchlist
// @access Private
router.get('/', getWatchlist);

// @route POST /api/watchlist
// @desc Add a stock to user's watchlist
// @access Private
router.post('/', addStockToWatchlist);

// @route DELETE /api/watchlist/:symbol
// @desc Remove a stock from user's watchlist
// @access Private
router.delete('/:symbol', removeStockFromWatchlist);

module.exports = router;
