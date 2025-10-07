/*
  File: controllers/newsController.js
  Purpose: Handle news listing, retrieval, and management logic for financial news articles.
*/
const News = require('../models/News');

exports.getNews = async (req, res) => {
  const news = await News.find().sort({ createdAt: -1 });
  res.json(news);
};

exports.createNews = async (req, res) => {
  const news = await News.create(req.body);
  res.status(201).json(news);
};
