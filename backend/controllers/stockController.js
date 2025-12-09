/*
  File: controllers/stockController.js
  Purpose: Handle stock CRUD operations (list, get by id, create, update) via Mongoose model.
*/
const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const DailyPrice = require('../models/DailyPrice');
const { fetchQuote, fetchDailySeries } = require('../services/marketDataService');
const stockService = require('../services/stockService'); // Import the new stockService

exports.getStocks = async (req, res) => {
  // Sort by symbol for consistent ordering, or by currentPrice descending to show most valuable first
  const stocks = await Stock.find().sort({ symbol: 1 });
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
// Priority: DailyPrice (from backfill) > StockHistory (from real-time updates)
exports.getHistoryBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 5000);
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    // Try DailyPrice first (from backfill script)
    let dailyPriceQuery = { symbol: symbol.toUpperCase() };
    if (from || to) {
      // Convert Date to YYYY-MM-DD string for DailyPrice
      const dateFilter = {};
      if (from) {
        const fromStr = from.toISOString().split('T')[0];
        dateFilter.$gte = fromStr;
      }
      if (to) {
        const toStr = to.toISOString().split('T')[0];
        dateFilter.$lte = toStr;
      }
      if (Object.keys(dateFilter).length > 0) {
        dailyPriceQuery.date = dateFilter;
      }
    }

    const dailyPrices = await DailyPrice.find(dailyPriceQuery)
      .sort({ date: 1 })
      .limit(limit);

    // If we have DailyPrice data, use it (convert to StockHistory format)
    if (dailyPrices.length > 0) {
      const history = dailyPrices.map(dp => ({
        stockSymbol: dp.symbol,
        price: dp.close,
        open: dp.open,
        high: dp.high,
        low: dp.low,
        close: dp.close,
        volume: dp.volume,
        timestamp: new Date(dp.date), // Convert YYYY-MM-DD string to Date
      }));
      return res.json(history);
    }

    // Fallback to StockHistory (for real-time updates)
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
        open: update.open,
        high: update.high,
        low: update.low,
        close: update.close,
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
    const results = await stockService.refreshAllStocksData(); // Call the service function
    res.json({ message: 'Refresh completed', count: results.length, results });
  } catch (err) {
    console.error('Error refreshing all stocks:', err);
    res.status(500).json({ message: 'Failed to refresh all stocks.', error: err.message });
  }
};

// Backfill OHLC data for a specific symbol from Alpha Vantage daily series
exports.backfillOHLC = async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    
    if (!stock) {
      return res.status(404).json({ message: `Stock ${symbol} not found` });
    }

    console.log(`Fetching daily series for ${symbol}...`);
    const dailySeries = await fetchDailySeries(symbol);
    console.log(`Retrieved ${dailySeries.length} data points`);

    let updated = 0;
    let created = 0;

    for (const day of dailySeries) {
      const timestamp = new Date(day.date);
      
      // Check if record exists for this date
      const startOfDay = new Date(timestamp);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(timestamp);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await StockHistory.findOne({
        stockSymbol: stock.symbol,
        timestamp: { $gte: startOfDay, $lt: endOfDay }
      });

      if (existing) {
        // Update if OHLC data is missing
        if (!existing.open || !existing.high || !existing.low || !existing.close) {
          existing.price = day.close || existing.price;
          existing.open = day.open;
          existing.high = day.high;
          existing.low = day.low;
          existing.close = day.close;
          existing.volume = day.volume || existing.volume;
          await existing.save();
          updated++;
        }
      } else {
        // Create new record
        await StockHistory.create({
          stockSymbol: stock.symbol,
          price: day.close,
          open: day.open,
          high: day.high,
          low: day.low,
          close: day.close,
          volume: day.volume,
          timestamp: new Date(day.date)
        });
        created++;
      }
    }

    res.json({ 
      message: 'OHLC backfill completed', 
      symbol,
      updated,
      created,
      total: dailySeries.length
    });
  } catch (err) {
    console.error('Backfill error:', err);
    res.status(400).json({ message: err.message });
  }
};
