/*
  File: models/Portfolio.js
  Purpose: Define Mongoose schema for user holdings, including quantity and average buy price.
*/
const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    quantity: { type: Number, required: true },
    avgBuyPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', PortfolioSchema); 