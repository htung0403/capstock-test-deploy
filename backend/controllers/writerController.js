/*
  File: controllers/writerController.js
  Purpose: Handle API requests for Writers to create, view, and update articles.
  Date: 2025-10-20
*/
const Article = require('../models/Article'); // Updated path
const Category = require('../models/Category'); // Updated path
const Tag = require('../models/Tag'); // Assuming Tag model is also needed for articles
const User = require('../models/User'); // Updated path

// Create a new article (defaults to draft)
const createArticle = async (req, res) => {
  const { title, summary, content, category, tags, authorId, symbol, isPremium, thumbnail } = req.body;

  try {
    // Validate category and tags exist
    if (category) {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
          return res.status(400).json({ message: 'Invalid category provided.' });
      }
    }
    
    // Ensure all provided tags actually exist in the database
    if (tags && tags.length > 0) {
      const existingTags = await Tag.find({ '_id': { $in: tags } });
      if (existingTags.length !== tags.length) {
          return res.status(400).json({ message: 'One or more tags provided are invalid.' });
      }
    }

    const newArticle = await Article.create({
      title,
      summary,
      content,
      category,
      tags,
      author: authorId || req.user.id,
      symbol,
      isPremium,
      thumbnail,
      status: 'draft', // Default to draft, writer must submit for review
    });
    res.status(201).json(newArticle);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all articles by a specific writer
const getWriterArticles = async (req, res) => {
  const { authorId } = req.params; // Or from req.user if authenticated
  try {
    const articles = await Article.find({ author: authorId })
      .populate('category', 'category_name')
      .populate('tags', 'tag_name') // Populate tags as well
      .populate('author', 'username pen_name');
    res.status(200).json(articles);
  } catch (error) {
    console.error('Error getting writer articles:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single article by ID (for editing)
const getArticleById = async (req, res) => {
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
    console.error('Error getting article by ID:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update an article with different rules based on status
const updateArticle = async (req, res) => {
  const { id } = req.params;
  const { title, summary, content, category, tags, symbol, isPremium, thumbnail, submitForReview } = req.body;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Check if the requesting user is the author of the article
    if (req.user && req.user.id !== article.author.toString()) {
        return res.status(403).json({ message: 'Not authorized to edit this article' });
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

    // Handle different statuses
    if (article.status === 'draft') {
      // Normal editing, keep as draft unless submitForReview is true
      article.title = title || article.title;
      article.summary = summary || article.summary;
      article.content = content || article.content;
      article.category = category || article.category;
      article.tags = tags || article.tags;
      article.symbol = symbol || article.symbol;
      article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
      article.thumbnail = thumbnail || article.thumbnail;
      article.updatedAt = Date.now();
      
      if (submitForReview) {
        article.status = 'pending';
      }
    } else if (article.status === 'denied') {
      // Allow editing, but status stays denied until explicitly submitted
      article.title = title || article.title;
      article.summary = summary || article.summary;
      article.content = content || article.content;
      article.category = category || article.category;
      article.tags = tags || article.tags;
      article.symbol = symbol || article.symbol;
      article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
      article.thumbnail = thumbnail || article.thumbnail;
      article.updatedAt = Date.now();
      
      if (submitForReview) {
        article.status = 'pending';
        // Clear review fields when resubmitting
        article.reviewedBy = null;
        article.reviewedAt = null;
      }
    } else if (article.status === 'published') {
      // Allow editing, but changes must go back to review
      article.title = title || article.title;
      article.summary = summary || article.summary;
      article.content = content || article.content;
      article.category = category || article.category;
      article.tags = tags || article.tags;
      article.symbol = symbol || article.symbol;
      article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
      article.thumbnail = thumbnail || article.thumbnail;
      article.updatedAt = Date.now();
      
      if (submitForReview) {
        article.status = 'pending';
        // Reset review fields
        article.reviewedBy = null;
        article.reviewedAt = null;
        // Keep publishedAt for reference, but article needs re-review
      }
    } else {
      // pending status - can edit but status stays pending
      article.title = title || article.title;
      article.summary = summary || article.summary;
      article.content = content || article.content;
      article.category = category || article.category;
      article.tags = tags || article.tags;
      article.symbol = symbol || article.symbol;
      article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
      article.thumbnail = thumbnail || article.thumbnail;
      article.updatedAt = Date.now();
    }

    const updatedArticle = await article.save();
    res.status(200).json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete an article (only draft, pending, or denied - not published)
const deleteArticle = async (req, res) => {
  const { id } = req.params;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Check authorization
    if (req.user && req.user.id !== article.author.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this article' });
    }

    // Only allow deletion of draft, pending, or denied articles
    if (article.status === 'published') {
      return res.status(403).json({ 
        message: 'Cannot directly delete published articles. Please request deletion instead.' 
      });
    }

    await article.deleteOne();
    res.status(200).json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ message: 'Failed to delete article.', error: error.message });
  }
};

// Submit article for review (draft/denied → pending)
const submitForReview = async (req, res) => {
  const { id } = req.params;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (req.user && req.user.id !== article.author.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (article.status === 'draft' || article.status === 'denied') {
      article.status = 'pending';
      if (article.status === 'denied') {
        // Clear previous review info when resubmitting
        article.reviewedBy = null;
        article.reviewedAt = null;
      }
      article.updatedAt = Date.now();
      await article.save();
      res.status(200).json(article);
    } else {
      res.status(400).json({ message: 'Article must be in draft or denied status to submit for review' });
    }
  } catch (error) {
    console.error('Error submitting article for review:', error);
    res.status(500).json({ message: error.message });
  }
};

// Request deletion of a published article
const requestDelete = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (req.user && req.user.id !== article.author.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (article.status !== 'published') {
      return res.status(400).json({ message: 'Can only request deletion for published articles' });
    }

    article.deleteRequest = {
      requested: true,
      requestedBy: req.user.id,
      requestedAt: Date.now(),
      reason: reason || '',
    };
    await article.save();
    res.status(200).json({ message: 'Delete request submitted', article });
  } catch (error) {
    console.error('Error requesting article deletion:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createArticle,
  getWriterArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  submitForReview,
  requestDelete,
  // New function for admin to get all articles
  getAllArticles: async (req, res) => {
    try {
      const articles = await Article.find()
        .populate('category', 'category_name')
        .populate('tags', 'tag_name')
        .populate('author', 'username pen_name')
        .populate('reviewedBy', 'username pen_name')
        .populate('deleteRequest.requestedBy', 'username pen_name');
      res.status(200).json(articles);
    } catch (error) {
      console.error('Error getting all articles for admin:', error);
      res.status(500).json({ message: 'Failed to fetch all articles.', error: error.message });
    }
  },
};
