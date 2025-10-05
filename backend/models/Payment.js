/*
  File: models/Payment.js
  Purpose: Define Mongoose schema for payments and funding operations within the system.
*/
const mongoose = require('mongoose');

// đang để mỗi momo
const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, default: 'MoMo' },
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAW'], required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Payment', PaymentSchema);
  