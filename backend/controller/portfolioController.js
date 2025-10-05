/*
  File: controller/portfolioController.js (duplicate directory)
  Purpose: Mirror of controllers/portfolioController.js; should be consolidated to avoid duplication.
*/
const Portfolio = require('../models/Portfolio');

exports.getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.find({ user: req.user.id }).populate('stock');
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 