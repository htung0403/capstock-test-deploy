const asyncHandler = require('express-async-handler');
const marketDataService = require('../services/marketDataService');
const Watchlist = require('../models/Watchlist');
const Portfolio = require('../models/Portfolio');

/**
 * @desc Get market data formatted for heatmap display, market indices, and top gainers/losers
 * @route GET /api/market-heatmap
 * @access Private
 */
exports.getMarketHeatmapData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const heatmapData = await marketDataService.getHeatmapData();
  const { topGainers, topLosers } = marketDataService.getTopGainersLosers(heatmapData);

  // Get user's watchlist symbols
  const watchlist = await Watchlist.findOne({ user: userId });
  const watchlistSymbols = watchlist ? watchlist.stocks.map(s => s.toUpperCase()) : [];

  // Get user's holdings symbols
  const portfolio = await Portfolio.findOne({ user: userId }).populate('holdings.stock');
  const holdingsSymbols = portfolio && portfolio.holdings 
    ? portfolio.holdings
        .map(h => {
          if (h.stock && typeof h.stock === 'object') {
            return h.stock.symbol;
          }
          return null;
        })
        .filter(Boolean)
    : [];

  res.status(200).json({
    heatmapData,
    topGainers,
    topLosers,
    watchlistSymbols,
    holdingsSymbols,
  });
});
