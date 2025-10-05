/*
  File: routes/portfolioRoutes.js
  Purpose: Define portfolio-related API endpoints for holdings, positions, and updates.
*/
const express = require('express');
const { getPortfolio } = require('../controller/portfolioController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getPortfolio);

module.exports = router;
