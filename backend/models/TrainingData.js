/*
  File: models/TrainingData.js
  Purpose: Store training data for AI models (sentiment labels, price predictions with actual results)
  Date: 2025-01-15
*/
const mongoose = require('mongoose');

const TrainingDataSchema = new mongoose.Schema(
  {
    // Data type
    data_type: {
      type: String,
      enum: ['sentiment', 'price_prediction', 'hybrid'],
      required: true,
      index: true,
    },
    
    // Stock symbol (if applicable)
    symbol: {
      type: String,
      index: true,
    },
    
    // Input data
    input_text: {
      type: String, // For sentiment: news/article text
    },
    input_data: {
      type: mongoose.Schema.Types.Mixed, // For price: historical price data
    },
    
    // Predictions (what the model predicted)
    predicted_sentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral'],
    },
    predicted_sentiment_score: {
      type: Number, // -1 to 1
    },
    predicted_price: {
      type: Number,
    },
    predicted_trend: {
      type: String,
      enum: ['Bullish', 'Bearish', 'Neutral'],
    },
    
    // Actual results (ground truth - what actually happened)
    actual_sentiment: {
      type: String,
      enum: ['Positive', 'Negative', 'Neutral'],
    },
    actual_sentiment_score: {
      type: Number,
    },
    actual_price: {
      type: Number, // Actual price after prediction period
    },
    actual_trend: {
      type: String,
      enum: ['Bullish', 'Bearish', 'Neutral'],
    },
    
    // Prediction period
    prediction_date: {
      type: Date,
      required: true,
      index: true,
    },
    actual_date: {
      type: Date, // When actual result was recorded
    },
    
    // Model information
    model_type: {
      type: String,
      enum: ['TextBlob', 'VADER', 'SMA', 'ARIMA', 'Prophet', 'Hybrid'],
    },
    model_version: {
      type: String, // Version of the model used
    },
    
    // Metadata
    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'auto', 'import'],
      default: 'manual',
    },
    notes: {
      type: String,
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verified_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
TrainingDataSchema.index({ data_type: 1, symbol: 1, prediction_date: -1 });
TrainingDataSchema.index({ status: 1, data_type: 1 });
TrainingDataSchema.index({ added_by: 1, createdAt: -1 });

// Static method to get training data for a specific type and symbol
TrainingDataSchema.statics.getTrainingData = function(dataType, symbol = null, limit = 100) {
  const query = { data_type: dataType, status: 'verified' };
  if (symbol) {
    query.symbol = symbol.toUpperCase();
  }
  return this.find(query)
    .sort({ prediction_date: -1 })
    .limit(limit)
    .populate('added_by', 'username email');
};

// Static method to get pending training data for review
TrainingDataSchema.statics.getPendingData = function(limit = 50) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('added_by', 'username email')
    .populate('verified_by', 'username email');
};

// Method to verify training data
TrainingDataSchema.methods.verify = function(userId) {
  this.status = 'verified';
  this.verified_by = userId;
  this.verified_at = new Date();
  return this.save();
};

// Method to reject training data
TrainingDataSchema.methods.reject = function(userId, reason = '') {
  this.status = 'rejected';
  this.verified_by = userId;
  this.verified_at = new Date();
  if (reason) {
    this.notes = (this.notes || '') + ` [Rejected: ${reason}]`;
  }
  return this.save();
};

module.exports = mongoose.model('TrainingData', TrainingDataSchema);

