/*
  File: controllers/trainingDataController.js
  Purpose: Handle CRUD operations for training data (admin only)
  Date: 2025-01-15
  
  CHANGES (2025-01-15):
  - Added uploadTrainingDataset for bulk CSV/Excel upload
  - Added exportTrainingDataset for exporting training data to CSV
*/
const TrainingData = require('../models/TrainingData');
const fs = require('fs');
const path = require('path');
const { processDataset, DEFAULT_SYMBOLS } = require('../utils/datasetParser');

/**
 * Create new training data entry
 * POST /api/admin/training-data
 */
exports.createTrainingData = async (req, res) => {
  try {
    const {
      data_type,
      symbol,
      input_text,
      input_data,
      predicted_sentiment,
      predicted_sentiment_score,
      predicted_price,
      predicted_trend,
      actual_sentiment,
      actual_sentiment_score,
      actual_price,
      actual_trend,
      prediction_date,
      actual_date,
      model_type,
      model_version,
      notes,
    } = req.body;

    // Validation
    if (!data_type || !['sentiment', 'price_prediction', 'hybrid'].includes(data_type)) {
      return res.status(400).json({ message: 'Invalid data_type. Must be: sentiment, price_prediction, or hybrid' });
    }

    if (!prediction_date) {
      return res.status(400).json({ message: 'prediction_date is required' });
    }

    // Create training data entry
    const trainingData = new TrainingData({
      data_type,
      symbol: symbol ? symbol.toUpperCase() : null,
      input_text,
      input_data,
      predicted_sentiment,
      predicted_sentiment_score,
      predicted_price,
      predicted_trend,
      actual_sentiment,
      actual_sentiment_score,
      actual_price,
      actual_trend,
      prediction_date: new Date(prediction_date),
      actual_date: actual_date ? new Date(actual_date) : null,
      model_type,
      model_version,
      notes,
      added_by: req.user.id,
      source: 'manual',
      status: 'pending', // Admin can verify later
    });

    await trainingData.save();

    res.status(201).json({
      message: 'Training data created successfully',
      data: trainingData,
    });
  } catch (error) {
    console.error('Error creating training data:', error);
    res.status(500).json({ message: 'Failed to create training data', error: error.message });
  }
};

/**
 * Get all training data (with filters)
 * GET /api/admin/training-data
 */
exports.getTrainingData = async (req, res) => {
  try {
    const {
      data_type,
      symbol,
      status,
      model_type,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (data_type) query.data_type = data_type;
    if (symbol) query.symbol = symbol.toUpperCase();
    if (status) query.status = status;
    if (model_type) query.model_type = model_type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      TrainingData.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('added_by', 'username email')
        .populate('verified_by', 'username email'),
      TrainingData.countDocuments(query),
    ]);

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching training data:', error);
    res.status(500).json({ message: 'Failed to fetch training data', error: error.message });
  }
};

/**
 * Get single training data entry
 * GET /api/admin/training-data/:id
 */
exports.getTrainingDataById = async (req, res) => {
  try {
    const trainingData = await TrainingData.findById(req.params.id)
      .populate('added_by', 'username email')
      .populate('verified_by', 'username email');

    if (!trainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }

    res.json(trainingData);
  } catch (error) {
    console.error('Error fetching training data:', error);
    res.status(500).json({ message: 'Failed to fetch training data', error: error.message });
  }
};

/**
 * Update training data
 * PUT /api/admin/training-data/:id
 */
exports.updateTrainingData = async (req, res) => {
  try {
    const trainingData = await TrainingData.findById(req.params.id);

    if (!trainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'input_text',
      'input_data',
      'predicted_sentiment',
      'predicted_sentiment_score',
      'predicted_price',
      'predicted_trend',
      'actual_sentiment',
      'actual_sentiment_score',
      'actual_price',
      'actual_trend',
      'prediction_date',
      'actual_date',
      'model_type',
      'model_version',
      'notes',
      'symbol',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'prediction_date' || field === 'actual_date') {
          trainingData[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          trainingData[field] = req.body[field];
        }
      }
    });

    await trainingData.save();

    res.json({
      message: 'Training data updated successfully',
      data: trainingData,
    });
  } catch (error) {
    console.error('Error updating training data:', error);
    res.status(500).json({ message: 'Failed to update training data', error: error.message });
  }
};

/**
 * Verify training data (admin only)
 * POST /api/admin/training-data/:id/verify
 */
exports.verifyTrainingData = async (req, res) => {
  try {
    const trainingData = await TrainingData.findById(req.params.id);

    if (!trainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }

    await trainingData.verify(req.user.id);

    res.json({
      message: 'Training data verified successfully',
      data: trainingData,
    });
  } catch (error) {
    console.error('Error verifying training data:', error);
    res.status(500).json({ message: 'Failed to verify training data', error: error.message });
  }
};

/**
 * Reject training data (admin only)
 * POST /api/admin/training-data/:id/reject
 */
exports.rejectTrainingData = async (req, res) => {
  try {
    const { reason } = req.body;
    const trainingData = await TrainingData.findById(req.params.id);

    if (!trainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }

    await trainingData.reject(req.user.id, reason);

    res.json({
      message: 'Training data rejected successfully',
      data: trainingData,
    });
  } catch (error) {
    console.error('Error rejecting training data:', error);
    res.status(500).json({ message: 'Failed to reject training data', error: error.message });
  }
};

/**
 * Delete training data
 * DELETE /api/admin/training-data/:id
 */
exports.deleteTrainingData = async (req, res) => {
  try {
    const trainingData = await TrainingData.findByIdAndDelete(req.params.id);

    if (!trainingData) {
      return res.status(404).json({ message: 'Training data not found' });
    }

    res.json({ message: 'Training data deleted successfully' });
  } catch (error) {
    console.error('Error deleting training data:', error);
    res.status(500).json({ message: 'Failed to delete training data', error: error.message });
  }
};

/**
 * Get training data statistics
 * GET /api/admin/training-data/stats
 */
exports.getTrainingDataStats = async (req, res) => {
  try {
    const stats = await TrainingData.aggregate([
      {
        $group: {
          _id: {
            data_type: '$data_type',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await TrainingData.aggregate([
      {
        $group: {
          _id: '$data_type',
          total: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      by_type: byType,
      breakdown: stats,
    });
  } catch (error) {
    console.error('Error fetching training data stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

/**
 * Upload and process dataset file (CSV/Excel)
 * POST /api/admin/training-data/upload-dataset
 * 
 * @route POST /api/admin/training-data/upload-dataset
 * @access Admin only
 * @body {file} file - CSV or Excel file (multipart/form-data)
 * @body {string} mode - 'price_prediction' or 'sentiment'
 * @body {string} allowedSymbols - Comma-separated list of symbols (optional)
 */
exports.uploadTrainingDataset = async (req, res) => {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { mode, allowedSymbols, defaultSymbol } = req.body;

    // Validate mode
    if (!mode || !['price_prediction', 'sentiment'].includes(mode)) {
      return res.status(400).json({ 
        message: 'Invalid mode. Must be "price_prediction" or "sentiment"' 
      });
    }

    // Parse allowed symbols
    let symbols = DEFAULT_SYMBOLS;
    if (allowedSymbols) {
      symbols = allowedSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
      if (symbols.length === 0) {
        symbols = DEFAULT_SYMBOLS;
      }
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname);

    console.log(`[CONTROLLER] Processing dataset: ${req.file.originalname}`);
    console.log(`[CONTROLLER] Mode: ${mode}, allowedSymbols: ${allowedSymbols}, defaultSymbol: ${defaultSymbol}`);
    console.log(`[CONTROLLER] Symbols array: ${symbols.join(', ')}`);

    // Process dataset
    const { trainingDataDocs, stats } = processDataset(
      filePath,
      fileExtension,
      mode,
      symbols,
      req.user.id,
      defaultSymbol || null
    );
    
    console.log(`[CONTROLLER] Processed result: ${trainingDataDocs.length} documents, stats:`, stats);

    if (trainingDataDocs.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        message: 'No valid training data found in file. Check symbols and data format.',
        stats 
      });
    }

    // Bulk insert
    const result = await TrainingData.insertMany(trainingDataDocs, { ordered: false });

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }

    console.log(`Successfully inserted ${result.length} training data records`);

    res.status(201).json({
      message: 'Dataset uploaded and processed successfully',
      mode,
      insertedCount: result.length,
      skippedCount: stats.skippedRecords,
      allowedSymbols: symbols,
      stats: {
        rawRecords: stats.rawRecords,
        filteredRecords: stats.filteredRecords,
        mappedRecords: stats.mappedRecords,
      },
    });
  } catch (error) {
    console.error('Error uploading dataset:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file on error:', cleanupError);
      }
    }

    res.status(500).json({ 
      message: 'Failed to upload and process dataset', 
      error: error.message 
    });
  }
};

/**
 * Export training data to CSV
 * GET /api/admin/training-data/export
 * 
 * @route GET /api/admin/training-data/export
 * @access Admin only
 * @query {string} data_type - Filter by data type (optional)
 * @query {string} symbol - Comma-separated list of symbols (optional)
 * @query {string} from - Start date (ISO format, optional)
 * @query {string} to - End date (ISO format, optional)
 */
exports.exportTrainingDataset = async (req, res) => {
  try {
    const { data_type, symbol, from, to } = req.query;

    // Build query
    const query = { status: 'verified' }; // Only export verified data
    
    if (data_type) {
      query.data_type = data_type;
    }

    if (symbol) {
      const symbols = symbol.split(',').map(s => s.trim().toUpperCase());
      query.symbol = { $in: symbols };
    }

    if (from || to) {
      query.$or = [];
      if (from) {
        query.$or.push({ prediction_date: { $gte: new Date(from) } });
        query.$or.push({ actual_date: { $gte: new Date(from) } });
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (!query.$or) query.$or = [];
        query.$or.push({ prediction_date: { $lte: toDate } });
        query.$or.push({ actual_date: { $lte: toDate } });
      }
    }

    // Fetch training data
    const trainingData = await TrainingData.find(query)
      .sort({ symbol: 1, prediction_date: 1 })
      .limit(10000); // Limit to prevent memory issues

    if (trainingData.length === 0) {
      return res.status(404).json({ message: 'No training data found matching criteria' });
    }

    // Build CSV content
    let csvContent = '';
    const dataType = data_type || trainingData[0].data_type;

    if (dataType === 'price_prediction') {
      // CSV header for price prediction
      csvContent = 'symbol,date,open,high,low,close,adjusted_close,volume,actual_trend\n';
      
      trainingData.forEach(item => {
        const date = item.prediction_date || item.actual_date || '';
        const inputData = item.input_data || {};
        const row = [
          item.symbol || '',
          date instanceof Date ? date.toISOString().split('T')[0] : date,
          inputData.open || '',
          inputData.high || '',
          inputData.low || '',
          inputData.close || item.actual_price || '',
          inputData.adjusted_close || inputData.close || '',
          inputData.volume || '',
          item.actual_trend || '',
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (dataType === 'sentiment') {
      // CSV header for sentiment
      csvContent = 'symbol,date,input_text,actual_sentiment,actual_sentiment_score\n';
      
      trainingData.forEach(item => {
        const date = item.prediction_date || item.actual_date || '';
        const row = [
          item.symbol || '',
          date instanceof Date ? date.toISOString().split('T')[0] : date,
          `"${(item.input_text || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
          item.actual_sentiment || '',
          item.actual_sentiment_score !== null && item.actual_sentiment_score !== undefined 
            ? item.actual_sentiment_score 
            : '',
        ];
        csvContent += row.join(',') + '\n';
      });
    } else {
      // Generic export (all fields)
      const headers = ['symbol', 'date', 'data_type', 'input_text', 'actual_sentiment', 'actual_sentiment_score', 
                      'actual_price', 'actual_trend', 'prediction_date', 'actual_date'];
      csvContent = headers.join(',') + '\n';
      
      trainingData.forEach(item => {
        const date = item.prediction_date || item.actual_date || '';
        const row = [
          item.symbol || '',
          date instanceof Date ? date.toISOString().split('T')[0] : date,
          item.data_type || '',
          `"${(item.input_text || '').replace(/"/g, '""')}"`,
          item.actual_sentiment || '',
          item.actual_sentiment_score !== null ? item.actual_sentiment_score : '',
          item.actual_price || '',
          item.actual_trend || '',
          item.prediction_date instanceof Date ? item.prediction_date.toISOString().split('T')[0] : '',
          item.actual_date instanceof Date ? item.actual_date.toISOString().split('T')[0] : '',
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    // Set response headers for CSV download
    const filename = `training_data_${dataType || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting training data:', error);
    res.status(500).json({ 
      message: 'Failed to export training data', 
      error: error.message 
    });
  }
};

