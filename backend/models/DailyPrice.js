/*
  File: models/DailyPrice.js
  Purpose: Define Mongoose schema for daily OHLCV price data with date as string (YYYY-MM-DD).
  Used for backfilling historical data from Alpha Vantage.
*/
const mongoose = require('mongoose');

const DailyPriceSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, trim: true, index: true },
    date: { type: String, required: true, trim: true }, // "YYYY-MM-DD"
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, required: true },
  },
  { timestamps: false }
);

// Unique compound index to prevent duplicates
DailyPriceSchema.index({ symbol: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPrice', DailyPriceSchema);

