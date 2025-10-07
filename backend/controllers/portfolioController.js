/*
  File: controllers/portfolioController.js
  Purpose: Handle portfolio retrieval and update logic for user holdings and positions.
*/
const Portfolio = require('../models/Portfolio');

exports.getPortfolio = async (req, res) => {
  const portfolio = await Portfolio.find({ user: req.user.id }).populate('stock');
  res.json(portfolio);
};
