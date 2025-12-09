/*
  File: models/ModelVersion.js
  Purpose: Track AI model versions and their performance metrics
  Date: 2025-01-15
*/
const mongoose = require('mongoose');

const ModelVersionSchema = new mongoose.Schema(
  {
    model_type: {
      type: String,
      enum: ['sentiment', 'price_prediction', 'hybrid'],
      required: true,
      index: true,
    },
    
    model_name: {
      type: String, // e.g., 'VADER', 'ARIMA', 'Prophet', 'Hybrid'
      required: true,
    },
    
    version: {
      type: String, // Semantic versioning: '1.0.0', '1.1.0', etc.
      required: true,
    },
    
    // Performance metrics at time of deployment
    metrics: {
      mae: Number,
      rmse: Number,
      mape: Number,
      direction_accuracy: Number,
      data_points: Number,
    },
    
    // Training information
    training_data_count: {
      type: Number,
      required: true,
    },
    training_date: {
      type: Date,
      default: Date.now,
    },
    
    // Deployment information
    is_active: {
      type: Boolean,
      default: false,
      index: true,
    },
    deployed_at: {
      type: Date,
    },
    deployed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Model file/storage (if applicable)
    model_file_path: {
      type: String, // Path to saved model file (if custom trained)
    },
    
    // Notes
    notes: {
      type: String,
    },
    
    // Comparison with previous version
    improvement: {
      mae_change: Number, // Negative = improvement
      rmse_change: Number,
      mape_change: Number,
      direction_accuracy_change: Number, // Positive = improvement
    },
  },
  { timestamps: true }
);

// Indexes
ModelVersionSchema.index({ model_type: 1, is_active: 1 });
ModelVersionSchema.index({ model_type: 1, version: 1 }, { unique: true });

// Static method to get active version for a model type
ModelVersionSchema.statics.getActiveVersion = function(modelType) {
  return this.findOne({
    model_type: modelType,
    is_active: true,
  }).sort({ deployed_at: -1 });
};

// Static method to get all versions for a model type
ModelVersionSchema.statics.getVersions = function(modelType, limit = 10) {
  return this.find({
    model_type: modelType,
  })
    .sort({ version: -1, deployed_at: -1 })
    .limit(limit);
};

// Method to deactivate all other versions when activating this one
ModelVersionSchema.methods.activate = async function(userId) {
  // Deactivate all other versions of the same type
  await this.constructor.updateMany(
    {
      model_type: this.model_type,
      _id: { $ne: this._id },
    },
    {
      is_active: false,
    }
  );

  // Activate this version
  this.is_active = true;
  this.deployed_at = new Date();
  this.deployed_by = userId;
  return this.save();
};

// Static method to create new version
ModelVersionSchema.statics.createVersion = async function(data) {
  // Get current active version for comparison
  const currentActive = await this.getActiveVersion(data.model_type);
  
  const newVersion = new this(data);
  
  // Calculate improvement if previous version exists
  if (currentActive && currentActive.metrics) {
    newVersion.improvement = {
      mae_change: currentActive.metrics.mae - (data.metrics.mae || 0),
      rmse_change: currentActive.metrics.rmse - (data.metrics.rmse || 0),
      mape_change: currentActive.metrics.mape - (data.metrics.mape || 0),
      direction_accuracy_change: (data.metrics.direction_accuracy || 0) - (currentActive.metrics.direction_accuracy || 0),
    };
  }
  
  await newVersion.save();
  return newVersion;
};

module.exports = mongoose.model('ModelVersion', ModelVersionSchema);

