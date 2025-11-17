/*
  File: controllers/editorController.js
  Purpose: Handle API requests for Editors to review, approve, and reject articles.
  Date: 2025-10-20
*/
const Article = require('../models/Article'); // Updated path
const Category = require('../models/Category'); // Updated path
const Tag = require('../models/Tag'); // Assuming Tag model is also needed for articles
const User = require('../models/User'); // Updated path

// Get all pending articles for editor review
const getPendingArticles = async (req, res) => {
  try {
    // In a real application, you might filter by editor's assigned categories
    const articles = await Article.find({ status: 'pending' })
      .populate('category', 'category_name')
      .populate('tags', 'tag_name') // Populate tags as well
      .populate('author', 'username pen_name');
    res.status(200).json(articles);
  } catch (error) {
    console.error('Error getting pending articles:', error);
    res.status(500).json({ message: error.message });
  }
};

// Approve an article
const approveArticle = async (req, res) => {
  const { id } = req.params;
  // editorId will come from authenticated user (req.user._id)
  const { category, tags, publishedAt, isPremium, note, symbol, thumbnail } = req.body; 

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (article.status === 'pending' || article.status === 'denied') {
      article.status = 'published';
      article.isPublished = true;
      article.category = category || article.category;
      article.tags = tags || article.tags;
      article.publishedAt = publishedAt || Date.now();
      article.publishBy = req.user._id; // Use authenticated user's ID
      article.updatedAt = Date.now();
      article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
      article.note = note || article.note; // Editor can add/update notes
      article.symbol = symbol || article.symbol;
      article.thumbnail = thumbnail || article.thumbnail;

      // Validate category and tags exist if they are being updated
      if (category) {
          const existingCategory = await Category.findById(category);
          if (!existingCategory) {
              return res.status(400).json({ message: 'Invalid category provided.' });
          }
      }
      if (tags && tags.length > 0) {
          const existingTags = await Tag.find({ '_id': { $in: tags } });
          if (existingTags.length !== tags.length) {
              return res.status(400).json({ message: 'One or more tags provided are invalid.' });
          }
      }

      const updatedArticle = await article.save();
      res.status(200).json(updatedArticle);
    } else {
      res.status(403).json({ message: 'Article cannot be approved in its current status' });
    }
  } catch (error) {
    console.error('Error approving article:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reject an article
const rejectArticle = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body; // Reason for rejection

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (article.status === 'pending') {
      article.status = 'denied';
      article.note = note;
      article.updatedAt = Date.now();

      const updatedArticle = await article.save();
      res.status(200).json(updatedArticle);
    } else {
      res.status(403).json({ message: 'Article cannot be rejected in its current status' });
    }
  } catch (error) {
    console.error('Error rejecting article:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single article by ID (for editor to view/edit)
const getArticleForEditor = async (req, res) => {
  const { id } = req.params;
  try {
    const article = await Article.findById(id)
      .populate('category', 'category_name')
      .populate('tags', 'tag_name') // Populate tags as well
      .populate('author', 'username pen_name');
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.status(200).json(article);
  } catch (error) {
    console.error('Error getting article for editor:', error);
    res.status(500).json({ message: error.message });
  }
};

// Editor edits an article (e.g., category, tags, publish date)
const editorUpdateArticle = async (req, res) => {
  const { id } = req.params;
  const { title, summary, content, category, tags, publishedAt, isPremium, note, symbol, thumbnail } = req.body;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Validate category and tags exist if they are being updated
    if (category) {
        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return res.status(400).json({ message: 'Invalid category provided.' });
        }
    }
    if (tags && tags.length > 0) {
        const existingTags = await Tag.find({ '_id': { $in: tags } });
        if (existingTags.length !== tags.length) {
            return res.status(400).json({ message: 'One or more tags provided are invalid.' });
        }
    }

    article.title = title || article.title;
    article.summary = summary || article.summary;
    article.content = content || article.content;
    article.category = category || article.category;
    article.tags = tags || article.tags;
    article.publishedAt = publishedAt || article.publishedAt;
    article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
    article.note = note || article.note; // Editor can add/update notes
    article.symbol = symbol || article.symbol;
    article.thumbnail = thumbnail || article.thumbnail;
    article.updatedAt = Date.now();

    const updatedArticle = await article.save();
    res.status(200).json(updatedArticle);
  } catch (error) {
    console.error('Error editor updating article:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPendingArticles,
  approveArticle,
  rejectArticle,
  getArticleForEditor,
  editorUpdateArticle,
};
