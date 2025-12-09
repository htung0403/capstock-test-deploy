const asyncHandler = require('express-async-handler');
const Watchlist = require('../models/Watchlist');
const Stock = require('../models/Stock'); // Assuming Stock model is needed to validate symbols

/**
 * @desc Get user's watchlist
 * @route GET /api/watchlist
 * @access Private
 */
exports.getWatchlist = asyncHandler(async (req, res) => {
  const userId = req.user.id; // User ID from authenticated request

  const watchlist = await Watchlist.findOne({ user: userId }).populate('stocks'); // TODO: populate actual stock details if needed

  if (watchlist) {
    res.status(200).json(watchlist.stocks);
  } else {
    res.status(200).json([]); // Return empty array if no watchlist found
  }
});

/**
 * @desc Add a stock to user's watchlist
 * @route POST /api/watchlist
 * @access Private
 */
exports.addStockToWatchlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { symbol } = req.body;

  if (!symbol) {
    res.status(400).json({ message: 'Stock symbol is required.' });
    return;
  }

  // Optional: Validate if the stock symbol actually exists in your Stock collection
  const stockExists = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stockExists) {
    res.status(404).json({ message: `Stock with symbol ${symbol} not found.` });
    return;
  }

  let watchlist = await Watchlist.findOne({ user: userId });

  if (!watchlist) {
    // Create a new watchlist if one doesn't exist for the user
    watchlist = await Watchlist.create({ user: userId, stocks: [symbol.toUpperCase()] });
    res.status(201).json(watchlist.stocks);
  } else {
    // Add stock if not already present
    if (!watchlist.stocks.includes(symbol.toUpperCase())) {
      watchlist.stocks.push(symbol.toUpperCase());
      await watchlist.save();
      res.status(200).json(watchlist.stocks);
    } else {
      res.status(409).json({ message: 'Stock already in watchlist.' });
    }
  }
});

/**
 * @desc Remove a stock from user's watchlist
 * @route DELETE /api/watchlist/:symbol
 * @access Private
 */
exports.removeStockFromWatchlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { symbol } = req.params;

  if (!symbol) {
    res.status(400).json({ message: 'Stock symbol is required.' });
    return;
  }

  const watchlist = await Watchlist.findOne({ user: userId });

  if (!watchlist) {
    res.status(404).json({ message: 'Watchlist not found for this user.' });
    return;
  }

  const initialLength = watchlist.stocks.length;
  watchlist.stocks = watchlist.stocks.filter(stock => stock !== symbol.toUpperCase());

  if (watchlist.stocks.length < initialLength) {
    await watchlist.save();
    res.status(200).json(watchlist.stocks);
  } else {
    res.status(404).json({ message: 'Stock not found in watchlist.' });
  }
});
