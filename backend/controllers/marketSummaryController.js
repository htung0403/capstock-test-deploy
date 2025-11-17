/*
  File: backend/controllers/marketSummaryController.js
  Purpose: Controller for handling market summary API requests.
  Date: 2025-11-17
*/

const marketSummaryService = require('../services/marketSummaryService');

/**
 * Get summary for a list of specific stock symbols.
 * GET /api/market/summary?symbols=AAPL,MSFT,GOOG
 */


exports.getMarketOverview = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default to 10 stocks
    const stocksSummary = await marketSummaryService.getTopNStocksSummary(limit);
    res.json(stocksSummary);
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({ message: 'Failed to fetch market overview.', error: error.message });
  }
};
