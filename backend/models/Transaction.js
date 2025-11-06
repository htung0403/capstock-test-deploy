/*
  File: models/Transaction.js
  Purpose: Define Mongoose schema for executed trades and account cash transactions.
*/
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'buy', 'sell'], required: true },
    amount: { type: Number, required: true, min: 0 },
    
    // Fields for stock transactions (buy/sell)
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    quantity: { type: Number },
    price: { type: Number },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema); 