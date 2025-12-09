/*
  File: routes/aiRoutes.js
  Purpose: Define API routes for AI-related functionalities (sentiment, price analysis, comprehensive analysis).
  
  CHANGES (2025-10-20):
  - Added POST `/sentiment` route for sentiment analysis.
  - Added GET `/price-analysis/:symbol` route for historical price analysis.
  - Added GET `/analysis/:symbol` route for comprehensive stock analysis.
  
  CHANGES (2025-01-15):
  - Added GET `/hybrid-analysis/:symbol` route for hybrid analysis (technical indicators + sentiment).
*/
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/sentiment', aiController.analyzeSentiment);
router.get('/price-analysis/:symbol', aiController.analyzeStockPrice); // New route for price analysis
router.get('/analysis/:symbol', aiController.getComprehensiveAnalysis); // New route for comprehensive analysis
router.get('/hybrid-analysis/:symbol', aiController.getHybridAnalysis); // New route for hybrid analysis
router.get('/models', aiController.listAvailableModels); // List available trained ML models

module.exports = router;
