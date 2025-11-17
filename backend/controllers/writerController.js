/*
  File: controllers/writerController.js
  Purpose: Handle API requests for Writers to create, view, and update articles.
  Date: 2025-10-20
*/
const Article = require('../models/Article'); // Updated path
const Category = require('../models/Category'); // Updated path
const Tag = require('../models/Tag'); // Assuming Tag model is also needed for articles
const User = require('../models/User'); // Updated path

// Create a new article
const createArticle = async (req, res) => {
  const { title, summary, content, category, tags, authorId, symbol, isPremium, thumbnail } = req.body;

  try {
    // Validate category and tags exist
    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
        return res.status(400).json({ message: 'Invalid category provided.' });
    }
    
    // Ensure all provided tags actually exist in the database
    const existingTags = await Tag.find({ '_id': { $in: tags } });
    if (existingTags.length !== tags.length) {
        return res.status(400).json({ message: 'One or more tags provided are invalid.' });
    }

    const newArticle = await Article.create({
      title,
      summary,
      content,
      category,
      tags,
      author: authorId, // Assuming authorId is passed in the request body from isAuthenticated user
      symbol,
      isPremium,
      thumbnail,
      status: 'pending', // Default status for new articles by writer
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

// Update an article (only if status is 'draft' or 'denied')
const updateArticle = async (req, res) => {
  const { id } = req.params;
  const { title, summary, content, category, tags, symbol, isPremium, thumbnail } = req.body;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Check if the requesting user is the author of the article
    // if (req.user._id.toString() !== article.author.toString()) {
    //     return res.status(403).json({ message: 'Not authorized to edit this article' });
    // }

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

    if (article.status === 'draft' || article.status === 'denied') {
      article.title = title || article.title;
      article.summary = summary || article.summary;
      article.content = content || article.content;
      article.category = category || article.category;
      article.tags = tags || article.tags;
      article.symbol = symbol || article.symbol;
      article.isPremium = isPremium !== undefined ? isPremium : article.isPremium;
      article.thumbnail = thumbnail || article.thumbnail;
      article.updatedAt = Date.now();
      // If an article was denied and is now updated, change its status back to pending
      if (article.status === 'denied') {
        article.status = 'pending';
      }

      const updatedArticle = await article.save();
      res.status(200).json(updatedArticle);
    } else {
      res.status(403).json({ message: 'Can only edit articles with status draft or denied' });
    }
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createArticle,
  getWriterArticles,
  getArticleById,
  updateArticle,
  // New function for admin to get all articles
  getAllArticles: async (req, res) => {
    try {
      const articles = await Article.find()
        .populate('category', 'category_name')
        .populate('tags', 'tag_name')
        .populate('author', 'username pen_name');
      res.status(200).json(articles);
    } catch (error) {
      console.error('Error getting all articles for admin:', error);
      res.status(500).json({ message: 'Failed to fetch all articles.', error: error.message });
    }
  },
};
