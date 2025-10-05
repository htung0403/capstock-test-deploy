/*
  File: models/Order.js
  Purpose: Define Mongoose schema for buy/sell orders including status and pricing.
*/
const mongoose = require('mongoose');

// đặt lệnh mua bán
const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    stockSymbol: { type: String, required: true },
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // giá tại thời điểm đặt lệnh
    status: { type: String, enum: ['PENDING', 'FILLED', 'CANCELLED'], default: 'PENDING' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Order', OrderSchema);
  