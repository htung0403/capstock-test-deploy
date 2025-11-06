/*
  File: models/Order.js
  Purpose: Define Mongoose schema for buy/sell orders with advanced order types (Market, Limit, Stop, Stop-Limit)
*/
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
    stockSymbol: { type: String, required: true },
    
    // Order type: BUY or SELL
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    
    // Order category: MARKET, LIMIT, STOP, STOP_LIMIT
    orderType: { 
      type: String, 
      enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'], 
      default: 'MARKET',
      required: true 
    },
    
    // Quantity of shares
    quantity: { type: Number, required: true },
    
    // Filled quantity (for partial fills)
    filledQuantity: { type: Number, default: 0 },
    
    // Market price at order creation time (saved for reference)
    marketPrice: { type: Number },
    
    // Limit price (for LIMIT and STOP_LIMIT orders)
    limitPrice: { type: Number },
    
    // Stop price (for STOP and STOP_LIMIT orders)
    stopPrice: { type: Number },
    
    // Average filled price
    avgFilledPrice: { type: Number, default: 0 },
    
    // Total cost/proceeds
    totalAmount: { type: Number, default: 0 },
    
    // Order status
    status: { 
      type: String, 
      enum: ['PENDING', 'TRIGGERED', 'PARTIAL', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'], 
      default: 'PENDING' 
    },
    
    // Execution details
    executedAt: { type: Date },
    
    // Expiry time (optional)
    expiresAt: { type: Date },
    
    // Rejection/cancellation reason
    reason: { type: String },
    
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for performance
OrderSchema.index({ user: 1, status: 1 });
OrderSchema.index({ stockSymbol: 1, status: 1 });
OrderSchema.index({ status: 1, orderType: 1 });
OrderSchema.index({ createdAt: -1 });

// Virtual for remaining quantity
OrderSchema.virtual('remainingQuantity').get(function() {
  return this.quantity - this.filledQuantity;
});

// Method to check if order is active
OrderSchema.methods.isActive = function() {
  return ['PENDING', 'TRIGGERED', 'PARTIAL'].includes(this.status);
};

// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function() {
  return ['PENDING', 'TRIGGERED', 'PARTIAL'].includes(this.status);
};

// Static method to get active orders for a stock
OrderSchema.statics.getActiveOrders = function(stockSymbol, orderType = null) {
  const query = { 
    stockSymbol, 
    status: { $in: ['PENDING', 'TRIGGERED', 'PARTIAL'] } 
  };
  if (orderType) {
    query.orderType = orderType;
  }
  return this.find(query).populate('user', 'username email').sort({ createdAt: 1 });
};

module.exports = mongoose.model('Order', OrderSchema);
  