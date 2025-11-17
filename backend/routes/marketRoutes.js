/*
  File: backend/routes/marketRoutes.js
  Purpose: Define API routes for market summary data.
  Date: 2025-11-17
*/

const express = require('express');
const marketSummaryController = require('../controllers/marketSummaryController');
const { protect } = require('../middlewares/authMiddleware'); // Assuming protect is always needed for authenticated access

const router = express.Router();

// Protect all market routes (optional, depending on whether this data should be public)
router.use(protect);

// GET /api/market/overview?limit=10
router.get('/overview', marketSummaryController.getMarketOverview);

module.exports = router;
