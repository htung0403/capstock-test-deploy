/*
  File: models/Payment.js
  Purpose: Define Mongoose schema for payments and funding operations within the system.
*/
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentMethod: { 
      type: String, 
      enum: ['CARD', 'QR_CODE', 'BANK_TRANSFER', 'MOMO', 'WALLET'], 
      required: true 
    },
    orderId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    amount: { 
      type: Number, 
      required: true,
      min: 1000 // Minimum 1000 VND
    },
    type: { 
      type: String, 
      enum: ['DEPOSIT', 'WITHDRAW'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'], 
      default: 'PENDING' 
    },
    
    // Thông tin thẻ (Card Payment)
    cardInfo: {
      cardNumber: { type: String }, // Lưu 4 số cuối
      cardHolder: { type: String },
      cardType: { type: String, enum: ['VISA', 'MASTERCARD', 'JCB', 'AMEX'] },
      expiryDate: { type: String }
    },
    
    // Thông tin QR Code
    qrInfo: {
      qrCode: { type: String }, // QR code string
      qrImageUrl: { type: String }, // URL ảnh QR
      bankName: { type: String },
      accountNumber: { type: String },
      accountName: { type: String }
    },
    
    // Thông tin giao dịch
    transactionId: { type: String }, // ID từ payment gateway
    description: { type: String },
    ipAddress: { type: String },
    
    // Timestamps
    paidAt: { type: Date },
    expiresAt: { type: Date }, // QR/Order hết hạn sau 15 phút
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
PaymentSchema.index({ user: 1, status: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ createdAt: -1 });

// Virtual field để kiểm tra đã hết hạn chưa
PaymentSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method để tạo order ID
PaymentSchema.statics.generateOrderId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD${timestamp}${random}`.toUpperCase();
};

module.exports = mongoose.model('Payment', PaymentSchema);
  