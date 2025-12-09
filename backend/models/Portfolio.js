/*
  File: models/Portfolio.js
  Purpose: Define Mongoose schema for user holdings, including quantity and average buy price.
*/
const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  avgBuyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
});

const PortfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    holdings: [HoldingSchema], // Array of holdings
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', PortfolioSchema); 