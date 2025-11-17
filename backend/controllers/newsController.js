/*
  File: controllers/newsController.js
  Purpose: Handle news listing, retrieval, and management logic for financial news articles.
  Date: 2025-10-20
*/
const Article = require('../models/Article'); // Use Article model instead of News

exports.getNews = async (req, res) => {
  try {
    // Fetch only published articles
    const news = await Article.find({ status: 'published' })
      .populate('author', 'username pen_name')
      .populate('category', 'category_name')
      .populate('tags', 'tag_name')
      .sort({ publishedAt: -1 });
    res.json(news);
  } catch (error) {
    console.error('Error fetching published news:', error);
    res.status(500).json({ message: 'Failed to fetch news.', error: error.message });
  }
};

/**
 * Get a single news article by ID.
 * GET /api/news/:id
 */
exports.getNewsById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'username pen_name')
      .populate('category', 'category_name')
      .populate('tags', 'tag_name');

    if (!article || article.status !== 'published') {
      return res.status(404).json({ message: 'Article not found or not published.' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error fetching single news article:', error);
    res.status(500).json({ message: 'Failed to fetch article.', error: error.message });
  }
};

// The createNews functionality is now handled by writerController.createArticle
// exports.createNews = async (req, res) => {
//   const news = await Article.create(req.body);
//   res.status(201).json(news);
// };
