const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getMarketHeatmapData } = require('../controllers/marketHeatmapController');

// All routes here are protected
router.use(protect);

// @route GET /api/market-heatmap
// @desc Get market data for heatmap
// @access Private
router.get('/', getMarketHeatmapData);

module.exports = router;
