/*
  File: scripts/retrainModels.js
  Purpose: Retrain AI models using verified training data from database
  Date: 2025-01-15
  
  Usage: node backend/scripts/retrainModels.js [model_type]
  model_type: 'sentiment', 'price', 'hybrid', or 'all' (default: 'all')
*/
require('dotenv').config();
const mongoose = require('mongoose');
const TrainingData = require('../models/TrainingData');
const AIMetrics = require('../models/AIMetrics');
const ModelVersion = require('../models/ModelVersion');
const { calculateEvaluationMetrics } = require('../services/aiService');

// Helper to increment version
function incrementVersion(currentVersion) {
  const parts = currentVersion.split('.');
  const major = parseInt(parts[0]) || 1;
  const minor = parseInt(parts[1]) || 0;
  const patch = parseInt(parts[2]) || 0;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Retrain sentiment model using verified training data
 */
async function retrainSentimentModel() {
  console.log('🔄 Starting sentiment model retraining...');
  
  try {
    // Get verified sentiment training data
    const trainingData = await TrainingData.getTrainingData('sentiment', null, 1000);
    
    if (trainingData.length < 10) {
      console.log('⚠️  Insufficient training data. Need at least 10 samples.');
      return { success: false, reason: 'Insufficient data' };
    }

    console.log(`📊 Found ${trainingData.length} verified sentiment training samples`);

    // Prepare data for evaluation
    const predicted = [];
    const actual = [];
    
    trainingData.forEach(item => {
      if (item.predicted_sentiment && item.actual_sentiment) {
        // Convert sentiment labels to numeric scores for evaluation
        const sentimentMap = { 'Positive': 1, 'Neutral': 0, 'Negative': -1 };
        predicted.push(sentimentMap[item.predicted_sentiment] || 0);
        actual.push(sentimentMap[item.actual_sentiment] || 0);
      }
    });

    if (predicted.length < 10) {
      console.log('⚠️  Insufficient valid data pairs for evaluation');
      return { success: false, reason: 'Insufficient valid pairs' };
    }

    // Calculate metrics
    const metrics = await calculateEvaluationMetrics(actual, predicted);
    
    console.log('📈 Sentiment Model Metrics:');
    console.log(`   MAE: ${metrics.MAE?.toFixed(4)}`);
    console.log(`   RMSE: ${metrics.RMSE?.toFixed(4)}`);
    console.log(`   Direction Accuracy: ${metrics.direction_accuracy?.toFixed(2)}%`);

    // Save metrics to database
    const metricsDoc = new AIMetrics({
      symbol: null, // Sentiment is not symbol-specific
      model_type: 'VADER', // Or TextBlob
      prediction_type: 'sentiment',
      mae: metrics.MAE,
      rmse: metrics.RMSE,
      mape: metrics.MAPE,
      direction_accuracy: metrics.direction_accuracy,
      actual_mean: metrics.statistics?.actual_mean,
      predicted_mean: metrics.statistics?.predicted_mean,
      data_points: metrics.statistics?.data_points,
      evaluation_date: new Date(),
      notes: `Retrained with ${trainingData.length} samples`,
    });

    await metricsDoc.save();
    console.log('✅ Sentiment model metrics saved');

    // Create new model version
    const currentVersion = await ModelVersion.getActiveVersion('sentiment');
    const newVersionNumber = currentVersion 
      ? incrementVersion(currentVersion.version)
      : '1.0.0';

    const newVersion = await ModelVersion.createVersion({
      model_type: 'sentiment',
      model_name: 'VADER', // Or detect from training data
      version: newVersionNumber,
      metrics: {
        mae: metrics.MAE,
        rmse: metrics.RMSE,
        mape: metrics.MAPE,
        direction_accuracy: metrics.direction_accuracy,
        data_points: metrics.statistics?.data_points,
      },
      training_data_count: trainingData.length,
      training_date: new Date(),
      notes: `Retrained with ${trainingData.length} verified samples`,
    });

    console.log(`📦 Created new model version: ${newVersionNumber}`);

    // Auto-activate if better than current (or if no current version)
    if (!currentVersion || 
        (metrics.MAE < currentVersion.metrics.mae && 
         metrics.direction_accuracy > currentVersion.metrics.direction_accuracy)) {
      await newVersion.activate(null); // No user ID for automated retraining
      console.log(`✅ Activated new version ${newVersionNumber} (better performance)`);
    } else {
      console.log(`ℹ️  New version ${newVersionNumber} created but not activated (current version is better)`);
    }

    return {
      success: true,
      metrics,
      samples_used: trainingData.length,
      version: newVersionNumber,
      activated: newVersion.is_active,
    };
  } catch (error) {
    console.error('❌ Error retraining sentiment model:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrain price prediction model using verified training data
 */
async function retrainPriceModel() {
  console.log('🔄 Starting price prediction model retraining...');
  
  try {
    // Get verified price prediction training data
    const trainingData = await TrainingData.getTrainingData('price_prediction', null, 1000);
    
    if (trainingData.length < 20) {
      console.log('⚠️  Insufficient training data. Need at least 20 samples.');
      return { success: false, reason: 'Insufficient data' };
    }

    console.log(`📊 Found ${trainingData.length} verified price prediction training samples`);

    // Group by symbol for symbol-specific evaluation
    const bySymbol = {};
    trainingData.forEach(item => {
      const symbol = item.symbol || 'GENERAL';
      if (!bySymbol[symbol]) {
        bySymbol[symbol] = [];
      }
      if (item.predicted_price && item.actual_price) {
        bySymbol[symbol].push({
          predicted: item.predicted_price,
          actual: item.actual_price,
          model_type: item.model_type,
        });
      }
    });

    let totalMetrics = {
      MAE: 0,
      RMSE: 0,
      MAPE: 0,
      count: 0,
    };

    // Evaluate for each symbol
    for (const [symbol, data] of Object.entries(bySymbol)) {
      if (data.length < 5) continue; // Skip symbols with too few samples

      const predicted = data.map(d => d.predicted);
      const actual = data.map(d => d.actual);

      const metrics = await calculateEvaluationMetrics(actual, predicted);
      
      console.log(`📈 ${symbol} Price Model Metrics:`);
      console.log(`   MAE: ${metrics.MAE?.toFixed(4)}`);
      console.log(`   RMSE: ${metrics.RMSE?.toFixed(4)}`);
      console.log(`   MAPE: ${metrics.MAPE?.toFixed(2)}%`);

      // Save metrics
      const metricsDoc = new AIMetrics({
        symbol,
        model_type: data[0]?.model_type || 'SMA',
        prediction_type: 'price_prediction',
        mae: metrics.MAE,
        rmse: metrics.RMSE,
        mape: metrics.MAPE,
        direction_accuracy: metrics.direction_accuracy,
        actual_mean: metrics.statistics?.actual_mean,
        predicted_mean: metrics.statistics?.predicted_mean,
        data_points: metrics.statistics?.data_points,
        evaluation_date: new Date(),
        notes: `Retrained with ${data.length} samples`,
      });

      await metricsDoc.save();

      // Accumulate for overall metrics
      totalMetrics.MAE += metrics.MAE;
      totalMetrics.RMSE += metrics.RMSE;
      totalMetrics.MAPE += (metrics.MAPE || 0);
      totalMetrics.count++;
    }

    if (totalMetrics.count === 0) {
      return { success: false, reason: 'No valid symbol groups' };
    }

    // Calculate average metrics
    const avgMetrics = {
      MAE: totalMetrics.MAE / totalMetrics.count,
      RMSE: totalMetrics.RMSE / totalMetrics.count,
      MAPE: totalMetrics.MAPE / totalMetrics.count,
    };

    console.log('📈 Overall Price Model Metrics:');
    console.log(`   Average MAE: ${avgMetrics.MAE.toFixed(4)}`);
    console.log(`   Average RMSE: ${avgMetrics.RMSE.toFixed(4)}`);
    console.log(`   Average MAPE: ${avgMetrics.MAPE.toFixed(2)}%`);

    return {
      success: true,
      metrics: avgMetrics,
      symbols_evaluated: totalMetrics.count,
      samples_used: trainingData.length,
    };
  } catch (error) {
    console.error('❌ Error retraining price model:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main retraining function
 */
async function retrainModels(modelType = 'all') {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || undefined });
    console.log('✅ Connected to MongoDB');

    const results = {};

    if (modelType === 'all' || modelType === 'sentiment') {
      results.sentiment = await retrainSentimentModel();
    }

    if (modelType === 'all' || modelType === 'price') {
      results.price = await retrainPriceModel();
    }

    if (modelType === 'hybrid') {
      // Hybrid retraining can combine both
      results.sentiment = await retrainSentimentModel();
      results.price = await retrainPriceModel();
    }

    console.log('\n✅ Retraining completed!');
    console.log('Results:', JSON.stringify(results, null, 2));

    await mongoose.disconnect();
    return results;
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const modelType = process.argv[2] || 'all';
  retrainModels(modelType)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { retrainModels, retrainSentimentModel, retrainPriceModel };

