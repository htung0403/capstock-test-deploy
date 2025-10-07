/*
  File: controllers/stockController.js
  Purpose: Handle stock CRUD operations (list, get by id, create, update) via Mongoose model.
*/
const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const { fetchQuote } = require('../services/marketDataService');

exports.getStocks = async (req, res) => {
  const stocks = await Stock.find();
  res.json(stocks);
};

exports.getStock = async (req, res) => {
  const stock = await Stock.findById(req.params.id);
  res.json(stock);
};

exports.createStock = async (req, res) => {
  const stock = await Stock.create(req.body);
  res.status(201).json(stock);
};

exports.updateStock = async (req, res) => {
  const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(stock);
};

// Get history snapshots for a symbol
exports.getHistoryBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 5000);
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const query = { stockSymbol: symbol };
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = from;
      if (to) query.timestamp.$lte = to;
    }

    const history = await StockHistory.find(query)
      .sort({ timestamp: 1 })
      .limit(limit);
    res.json(history);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Refresh live price for a single symbol (by symbol code)
exports.refreshStockBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = await Stock.findOne({ symbol });
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    const quote = await fetchQuote(symbol);
    const update = {
      currentPrice: quote.currentPrice ?? stock.currentPrice,
      open: quote.open ?? stock.open,
      high: quote.high ?? stock.high,
      low: quote.low ?? stock.low,
      close: quote.close ?? stock.close,
      volume: quote.volume ?? stock.volume,
      updatedAt: new Date(),
    };
    Object.assign(stock, update);
    await stock.save();
    if (update.currentPrice != null) {
      await StockHistory.create({
        stockSymbol: symbol,
        price: update.currentPrice,
        volume: update.volume ?? 0,
        timestamp: new Date(),
      });
    }
    res.json({ message: 'Stock refreshed', symbol, provider: quote.provider, stock });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Refresh live prices for all known symbols in the DB (best-effort)
exports.refreshAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({}, { symbol: 1 });
    const results = [];
    for (const s of stocks) {
      try {
        const quote = await fetchQuote(s.symbol);
        const update = {
          currentPrice: quote.currentPrice,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          volume: quote.volume,
          updatedAt: new Date(),
        };
        await Stock.updateOne({ _id: s._id }, update);
        if (update.currentPrice != null) {
          await StockHistory.create({
            stockSymbol: s.symbol,
            price: update.currentPrice,
            volume: update.volume ?? 0,
            timestamp: new Date(),
          });
        }
        results.push({ symbol: s.symbol, ok: true, provider: quote.provider });
      } catch (e) {
        results.push({ symbol: s.symbol, ok: false, error: e.message });
      }
    }
    res.json({ message: 'Refresh completed', count: stocks.length, results });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
