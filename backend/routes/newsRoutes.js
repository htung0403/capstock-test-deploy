/*
  File: routes/newsRoutes.js
  Purpose: Define news-related API endpoints (list, detail, create, update/delete as applicable).
*/
const express = require('express');
const { getNews, createNews } = require('../controllers/newsController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getNews);
router.post('/', protect, admin, createNews);

module.exports = router;
