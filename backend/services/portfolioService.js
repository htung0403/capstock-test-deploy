const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');
const Transaction = require('../models/Transaction');
const DailyPrice = require('../models/DailyPrice');
const User = require('../models/User');

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
 * @param {string} period - e.g., '1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'
 * @returns {Array} An array of objects: [{ date: '2023-01-01', value: 10000 }, ...]
 */
exports.getPortfolioGrowthOverTime = async (userId, period = '1M') => {
  const portfolio = await Portfolio.findOne({ user: userId }).populate('holdings.stock');
  const user = await User.findById(userId);
  
  if (!portfolio || portfolio.holdings.length === 0) {
    // Return cash balance only if no holdings
    const cashBalance = user?.balance || 0;
    return [{
      date: new Date().toISOString().split('T')[0],
      value: parseFloat(cashBalance.toFixed(2)),
    }];
  }

  // Determine date range based on period
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  let startDate = new Date();
  
  switch (period) {
    case '1D':
      startDate.setDate(now.getDate() - 1);
      break;
    case '1W':
      startDate.setDate(now.getDate() - 7);
      break;
    case '1M':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'ALL':
      // Get earliest transaction date
      const earliestTransaction = await Transaction.findOne({ user: userId })
        .sort({ createdAt: 1 });
      if (earliestTransaction) {
        startDate = new Date(earliestTransaction.createdAt);
      } else {
        startDate.setMonth(now.getMonth() - 1); // Default to 1 month if no transactions
      }
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }
  
  startDate.setHours(0, 0, 0, 0);

  // Get all unique symbols in portfolio
  const symbols = [...new Set(portfolio.holdings.map(h => h.stock.symbol))];
  
  // Build date range (sample every day, but for longer periods, we can sample weekly)
  const dateRange = [];
  const currentDate = new Date(startDate);
  const sampleInterval = period === 'ALL' || period === '1Y' ? 7 : 1; // Weekly for long periods, daily for short
  
  while (currentDate <= now) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + sampleInterval);
  }

  // Get all historical prices for symbols in date range (batch query for performance)
  const dateStrings = dateRange.map(d => d.toISOString().split('T')[0]);
  const historicalPrices = await DailyPrice.find({
    symbol: { $in: symbols },
    date: { $in: dateStrings }
  });

  // Build a map: { symbol: { date: price } }
  const priceMap = {};
  for (const price of historicalPrices) {
    if (!priceMap[price.symbol]) {
      priceMap[price.symbol] = {};
    }
    priceMap[price.symbol][price.date] = price.close;
  }

  // Build portfolio value for each date
  const growthData = [];
  const cashBalance = user?.balance || 0;
  
  for (const date of dateRange) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Calculate portfolio value at this date using current holdings and historical prices
    // Note: This assumes holdings haven't changed (simplified approach)
    // For more accuracy, you'd need to track holdings changes over time
    let portfolioValue = cashBalance; // Start with cash
    
    for (const holding of portfolio.holdings) {
      const symbol = holding.stock.symbol;
      let price = null;
      
      // Try to get historical price
      if (priceMap[symbol] && priceMap[symbol][dateStr]) {
        price = priceMap[symbol][dateStr];
      } else {
        // Fallback to current price if historical data not available
        price = holding.stock.currentPrice || 0;
      }
      
      portfolioValue += holding.quantity * price;
    }
    
    growthData.push({
      date: dateStr,
      value: parseFloat(portfolioValue.toFixed(2)),
    });
  }

  return growthData;
};

/**
 * @desc Get portfolio summary (Total Value, Total Invested, Profit/Loss, Daily P/L, Best/Worst stock)
 * @param {string} userId - The ID of the user.
 * @returns {Object} Portfolio summary object
 */
exports.getPortfolioSummary = async (userId) => {
  const portfolio = await Portfolio.findOne({ user: userId }).populate('holdings.stock');
  
  if (!portfolio || portfolio.holdings.length === 0) {
    return {
      totalPortfolioValue: 0,
      totalInvested: 0,
      totalProfitLoss: 0,
      totalProfitLossPercent: 0,
      dailyProfitLoss: 0,
      bestPerformingStock: null,
      worstPerformingStock: null,
    };
  }

  let totalPortfolioValue = 0;
  let totalInvested = 0;
  const stockPerformances = [];

  // Calculate current portfolio value and invested amount
  for (const holding of portfolio.holdings) {
    const currentPrice = holding.stock.currentPrice || 0;
    const currentValue = holding.quantity * currentPrice;
    const invested = holding.quantity * holding.avgBuyPrice;
    
    totalPortfolioValue += currentValue;
    totalInvested += invested;
    
    const profit = currentValue - invested;
    const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;
    
    stockPerformances.push({
      symbol: holding.stock.symbol,
      name: holding.stock.name,
      profit,
      profitPercent,
      currentValue,
      invested,
    });
  }

  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  // Calculate Daily P/L (compare with yesterday's close)
  let dailyProfitLoss = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  for (const holding of portfolio.holdings) {
    const symbol = holding.stock.symbol;
    const yesterdayPrice = await DailyPrice.findOne({ 
      symbol, 
      date: yesterdayStr 
    });
    
    if (yesterdayPrice) {
      const currentPrice = holding.stock.currentPrice || 0;
      const priceChange = currentPrice - yesterdayPrice.close;
      dailyProfitLoss += priceChange * holding.quantity;
    }
  }

  // Find best and worst performing stocks
  const sortedByProfit = [...stockPerformances].sort((a, b) => b.profitPercent - a.profitPercent);
  const bestPerformingStock = sortedByProfit.length > 0 ? sortedByProfit[0] : null;
  const worstPerformingStock = sortedByProfit.length > 0 ? sortedByProfit[sortedByProfit.length - 1] : null;

  return {
    totalPortfolioValue: parseFloat(totalPortfolioValue.toFixed(2)),
    totalInvested: parseFloat(totalInvested.toFixed(2)),
    totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
    totalProfitLossPercent: parseFloat(totalProfitLossPercent.toFixed(2)),
    dailyProfitLoss: parseFloat(dailyProfitLoss.toFixed(2)),
    bestPerformingStock: bestPerformingStock ? {
      symbol: bestPerformingStock.symbol,
      name: bestPerformingStock.name,
      profit: parseFloat(bestPerformingStock.profit.toFixed(2)),
      profitPercent: parseFloat(bestPerformingStock.profitPercent.toFixed(2)),
    } : null,
    worstPerformingStock: worstPerformingStock ? {
      symbol: worstPerformingStock.symbol,
      name: worstPerformingStock.name,
      profit: parseFloat(worstPerformingStock.profit.toFixed(2)),
      profitPercent: parseFloat(worstPerformingStock.profitPercent.toFixed(2)),
    } : null,
  };
};
