/*
  File: models/Transaction.js
  Purpose: Define Mongoose schema for executed trades and account cash transactions.
*/
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw'], required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema); 