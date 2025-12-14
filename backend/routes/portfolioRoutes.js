/*
  File: routes/portfolioRoutes.js
  Purpose: Define portfolio-related API endpoints for holdings, positions, and updates.
*/
const express = require('express');
const { getPortfolio, getPortfolioDistributionByStock, getPortfolioDistributionBySector, getPortfolioGrowthOverTime, getPortfolioSummary } = require('../controllers/portfolioController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All portfolio routes are protected
router.use(protect);

// @route GET /api/portfolio
// @desc Get user's portfolio holdings
// @access Private
router.get('/', getPortfolio);

// @route GET /api/portfolio/distribution/stock
// @desc Get portfolio distribution by stock
// @access Private
router.get('/distribution/stock', getPortfolioDistributionByStock);

// @route GET /api/portfolio/distribution/sector
// @desc Get portfolio distribution by sector
// @access Private
router.get('/distribution/sector', getPortfolioDistributionBySector);

// @route GET /api/portfolio/growth
// @desc Get portfolio growth over time
// @access Private
router.get('/growth', getPortfolioGrowthOverTime);

// @route GET /api/portfolio/summary
// @desc Get portfolio summary (Total Value, Total Invested, Profit/Loss, Daily P/L, Best/Worst stock)
// @access Private
router.get('/summary', getPortfolioSummary);

module.exports = router;
