/*
  File: models/StockHistory.js
  Purpose: Define Mongoose schema for historical stock prices and volumes over time.
*/
const mongoose = require('mongoose');

const StockHistorySchema = new mongoose.Schema(
  {
    stockSymbol: { type: String, required: true },
    price: { type: Number, required: true },
    volume: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('StockHistory', StockHistorySchema);
  