const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
// Assuming Transaction model is needed for historical data for growth over time
// const Transaction = require('../models/Transaction');

/**
 * @desc Get portfolio distribution by stock (Pie Chart data)
 * @param {string} userId - The ID of the user.
 * @returns {Array} An array of objects: [{ name: 'AAPL', value: 1000 }, ...]
 */
exports.getPortfolioDistributionByStock = async (userId) => {
  const portfolio = await Portfolio.findOne({ user: userId }).populate('holdings.stock');

  if (!portfolio || portfolio.holdings.length === 0) {
    return [];
  }

  let totalPortfolioValue = 0;
  const stockDistribution = {};

  for (const holding of portfolio.holdings) {
    const currentPrice = holding.stock.currentPrice; // Assuming Stock model has currentPrice
    const holdingValue = holding.quantity * currentPrice;
    totalPortfolioValue += holdingValue;
    stockDistribution[holding.stock.symbol] = (stockDistribution[holding.stock.symbol] || 0) + holdingValue;
  }

  // Convert to format for Pie Chart
  const result = Object.entries(stockDistribution).map(([symbol, value]) => ({
    name: symbol,
    value: parseFloat(value.toFixed(2)),
    percentage: parseFloat(((value / totalPortfolioValue) * 100).toFixed(2)),
  }));

  return result;
};

/**
 * @desc Get portfolio distribution by sector (Bar Chart data)
 * @param {string} userId - The ID of the user.
 * @returns {Array} An array of objects: [{ name: 'Technology', value: 5000 }, ...]
 */
exports.getPortfolioDistributionBySector = async (userId) => {
  const portfolio = await Portfolio.findOne({ user: userId }).populate('holdings.stock');

  if (!portfolio || portfolio.holdings.length === 0) {
    return [];
  }

  let totalPortfolioValue = 0;
  const sectorDistribution = {};

  for (const holding of portfolio.holdings) {
    const currentPrice = holding.stock.currentPrice;
    const holdingValue = holding.quantity * currentPrice;
    totalPortfolioValue += holdingValue;

    const sector = holding.stock.sector || 'Unknown'; // Assuming Stock model has a 'sector' field
    sectorDistribution[sector] = (sectorDistribution[sector] || 0) + holdingValue;
  }

  // Convert to format for Bar Chart
  const result = Object.entries(sectorDistribution).map(([sector, value]) => ({
    name: sector,
    value: parseFloat(value.toFixed(2)),
    percentage: parseFloat(((value / totalPortfolioValue) * 100).toFixed(2)),
  }));

  return result;
};

/**
 * @desc Get portfolio growth over time (Line Chart data)
 * @param {string} userId - The ID of the user.
 * @param {string} period - e.g., '7d', '1m', '3m', '1y'
 * @returns {Array} An array of objects: [{ date: '2023-01-01', value: 10000 }, ...]
 */
exports.getPortfolioGrowthOverTime = async (userId, period = '1m') => {
  // This is a complex calculation requiring historical snapshots of portfolio value
  // or re-calculating based on historical stock prices and past transactions.
  // For simplicity and as a placeholder, return dummy data for now.
  // In a real application, you would need to:
  // 1. Store daily/weekly snapshots of portfolio value.
  // 2. Fetch historical stock prices for all holdings for the given period.
  // 3. Reconstruct portfolio value at each point in time based on holdings and historical prices.

  console.warn('Portfolio growth over time is using dummy data. Real implementation requires historical data management.');

  const dummyGrowthData = [];
  const now = new Date();
  let days;

  switch (period) {
    case '7d': days = 7; break;
    case '1m': days = 30; break;
    case '3m': days = 90; break;
    case '1y': days = 365; break;
    default: days = 30;
  }

  let currentValue = 10000; // Starting dummy value
  for (let i = 0; i < days; i++) {
    const date = new Date(now.setDate(now.getDate() - 1));
    currentValue = currentValue * (1 + (Math.random() - 0.5) * 0.02); // Simulate small daily fluctuations
    dummyGrowthData.unshift({
      date: date.toISOString().split('T')[0],
      value: parseFloat(currentValue.toFixed(2)),
    });
  }

  return dummyGrowthData;
};
