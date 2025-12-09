/*
  File: models/Stock.js
  Purpose: Define Mongoose schema for stock instruments with pricing fields and metadata.
*/
const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    currentPrice: { type: Number, required: true },
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
    sector: { type: String, trim: true }, // New sector field
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Stock', StockSchema);
  