/*
  File: controllers/portfolioController.js
  Purpose: Handle portfolio retrieval and update logic for user holdings and positions.
*/
const Portfolio = require('../models/Portfolio');
const portfolioService = require('../services/portfolioService');
const asyncHandler = require('express-async-handler');

exports.getPortfolio = asyncHandler(async (req, res) => {
  let portfolio = await Portfolio.findOne({ user: req.user.id }).populate('holdings.stock');
  
  // If portfolio doesn't exist for new user, create an empty one
  if (!portfolio) {
    portfolio = await Portfolio.create({
      user: req.user.id,
      holdings: [], // Empty portfolio for new users
    });
  }
  
  res.json(portfolio);
});

/**
 * @desc Get portfolio distribution by stock (for Pie Chart)
 * @route GET /api/portfolio/distribution/stock
 * @access Private
 */
exports.getPortfolioDistributionByStock = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const distribution = await portfolioService.getPortfolioDistributionByStock(userId);
  res.status(200).json(distribution);
});

/**
 * @desc Get portfolio distribution by sector (for Bar Chart)
 * @route GET /api/portfolio/distribution/sector
 * @access Private
 */
exports.getPortfolioDistributionBySector = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const distribution = await portfolioService.getPortfolioDistributionBySector(userId);
  res.status(200).json(distribution);
});

/**
 * @desc Get portfolio growth over time (for Line Chart)
 * @route GET /api/portfolio/growth
 * @access Private
 */
exports.getPortfolioGrowthOverTime = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period } = req.query; // e.g., ?period=7d
  const growthData = await portfolioService.getPortfolioGrowthOverTime(userId, period);
  res.status(200).json(growthData);
});

/**
 * @desc Get portfolio summary (Total Value, Total Invested, Profit/Loss, Daily P/L, Best/Worst stock)
 * @route GET /api/portfolio/summary
 * @access Private
 */
exports.getPortfolioSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const summary = await portfolioService.getPortfolioSummary(userId);
  res.status(200).json(summary);
});
