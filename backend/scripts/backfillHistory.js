/*
  File: scripts/backfillHistory.js
  Purpose: Backfill last ~30 trading days of daily closes into StockHistory for selected tickers or all in DB.
  Usage:
    node scripts/backfillHistory.js             # all tickers from DB
    node scripts/backfillHistory.js AAPL MSFT   # specific tickers
*/
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const { fetchDailySeries } = require('../services/marketDataService');

async function backfillForSymbol(symbol) {
  const rows = await fetchDailySeries(symbol);
  // Keep only last ~30 entries
  const last30 = rows.slice(-30);
  let inserted = 0;
  for (const r of last30) {
    const timestamp = new Date(r.date);
    const exists = await StockHistory.findOne({ stockSymbol: symbol, timestamp });
    if (exists) continue;
    await StockHistory.create({
      stockSymbol: symbol,
      price: r.close,
      volume: r.volume ?? 0,
      timestamp,
    });
    inserted += 1;
  }
  return { inserted };
}

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || undefined });

  const args = process.argv.slice(2);
  let symbols = args;
  if (symbols.length === 0) {
    const stocks = await Stock.find({}, { symbol: 1 });
    symbols = stocks.map((s) => s.symbol);
  }

  const results = [];
  for (const sym of symbols) {
    try {
      const r = await backfillForSymbol(sym);
      results.push({ symbol: sym, ok: true, ...r });
    } catch (e) {
      results.push({ symbol: sym, ok: false, error: e.message });
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ message: 'Backfill completed', results }));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Backfill failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});


