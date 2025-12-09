/*
  File: models/AIMetrics.js
  Purpose: Store AI prediction evaluation metrics (MAE, RMSE, MAPE) for tracking model performance over time.
  Date: 2025-01-15
*/
const mongoose = require('mongoose');

const AIMetricsSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      index: true, // Index for faster queries by symbol
    },
    model_type: {
      type: String,
      enum: ['SMA', 'ARIMA', 'Prophet', 'Hybrid', 'Sentiment'],
      required: true,
    },
    prediction_type: {
      type: String,
      enum: ['short_term', 'long_term', 'sentiment', 'hybrid'],
      required: true,
    },
    // Evaluation metrics
    mae: {
      type: Number, // Mean Absolute Error
    },
    rmse: {
      type: Number, // Root Mean Squared Error
    },
    mape: {
      type: Number, // Mean Absolute Percentage Error (%)
    },
    direction_accuracy: {
      type: Number, // Percentage of correct direction predictions
    },
    // Statistics
    actual_mean: {
      type: Number,
    },
    predicted_mean: {
      type: Number,
    },
    data_points: {
      type: Number,
      required: true,
    },
    // Metadata
    evaluation_date: {
      type: Date,
      default: Date.now,
      index: true, // Index for time-based queries
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
AIMetricsSchema.index({ symbol: 1, model_type: 1, evaluation_date: -1 });
AIMetricsSchema.index({ prediction_type: 1, evaluation_date: -1 });

// Static method to get latest metrics for a symbol and model
AIMetricsSchema.statics.getLatestMetrics = function(symbol, modelType, predictionType) {
  return this.findOne({
    symbol: symbol.toUpperCase(),
    model_type: modelType,
    prediction_type: predictionType,
  })
    .sort({ evaluation_date: -1 })
    .limit(1);
};

// Static method to get metrics trend over time
AIMetricsSchema.statics.getMetricsTrend = function(symbol, modelType, predictionType, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    symbol: symbol.toUpperCase(),
    model_type: modelType,
    prediction_type: predictionType,
    evaluation_date: { $gte: startDate },
  })
    .sort({ evaluation_date: 1 })
    .select('evaluation_date mae rmse mape direction_accuracy');
};

module.exports = mongoose.model('AIMetrics', AIMetricsSchema);

