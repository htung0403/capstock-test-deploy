/*
  File: routes/newsRoutes.js
  Purpose: Define news-related API endpoints (list, detail, create, update/delete as applicable).
*/
const express = require('express');
const { getNews, getNewsById } = require('../controllers/newsController');
// const { protect, admin } = require('../middlewares/authMiddleware'); // No longer needed for this simplified route

const router = express.Router();

router.get('/', getNews);
router.get('/:id', getNewsById); // New route for single news article
// Removed the POST route for creating news as it's now handled by writerRoutes
// router.post('/', protect, admin, createNews);

module.exports = router;
