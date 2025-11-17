/*
  File: backend/services/marketSummaryService.js
  Purpose: Service to calculate and retrieve market summary data like Top Gainers, Top Losers, and Most Active stocks.
  Date: 2025-11-17
*/

const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const { calculateDailyChange, getLatestPrice, getPreviousClose } = require('./marketSummaryHelper');

/**
 * Fetches historical data for a given symbol and time range.
 * @param {string} symbol - The stock symbol.
 * @param {Date} startDate - The start date for history.
 * @returns {Array<Object>}
 */
const getStockHistoryForSummary = async (symbol, startDate) => {
  const history = await StockHistory.find({
    stockSymbol: symbol,
    timestamp: { $gte: startDate },
  }).sort({ timestamp: 1 }); // Ensure ascending order for processing
  return history;
};

/**
 * Calculates the summary data for a given stock symbol.
 * @param {string} symbol - The stock symbol.
 * @returns {Object | null} Summarized stock data or null if not enough data.
 */
const getStockSummary = async (symbol) => {
  console.log(`Service: Getting summary for symbol: ${symbol}`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get history for the last 2 days to ensure we have previous close
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  const history = await getStockHistoryForSummary(symbol, twoDaysAgo);
  console.log(`Service: History for ${symbol} (last 2 days):`, history.map(h => ({ timestamp: h.timestamp, price: h.price, close: h.close })));

  let latestPrice = null;
  let previousClose = null;
  let change = 0;
  let change_pct = 0;
  let volume = 0;

  if (history && history.length > 0) {
    latestPrice = getLatestPrice(history);
    volume = history[history.length - 1].volume || 0;

    if (history.length >= 2) {
      previousClose = getPreviousClose(history);

      if (latestPrice !== null && previousClose !== null) {
        const calculatedChange = calculateDailyChange(latestPrice, previousClose);
        change = calculatedChange.change;
        change_pct = calculatedChange.change_pct;
      } else {
        console.log(`Service: Could not determine latest or previous close for ${symbol} to calculate change/change_pct. Setting to 0.`);
      }
    } else {
      console.log(`Service: Not enough history (less than 2 data points) for ${symbol} to calculate daily change. Setting change to 0.`);
    }
  } else {
    console.log(`Service: No history found for ${symbol}.`);
  }

  const stock = await Stock.findOne({ symbol });
  if (!stock) {
    console.log(`Service: Stock not found in DB for symbol: ${symbol}`);
    return null;
  }

  return {
    symbol: stock.symbol,
    name: stock.name,
    currentPrice: latestPrice, // Use latest price from history
    change,
    change_pct,
    volume, // Latest volume
  };
};

/**
 * Retrieves a list of Top Gainers.
 * @param {number} limit - The maximum number of gainers to return.
 * @returns {Array<Object>}
 */
const getTopGainers = async (limit = 5) => {
  console.log(`Service: Fetching Top Gainers (limit: ${limit})`);
  const allStocks = await Stock.find({});
  const summaries = [];

  for (const stock of allStocks) {
    const summary = await getStockSummary(stock.symbol);
    if (summary && summary.change_pct > 0) {
      summaries.push(summary);
    }
  }
  console.log(`Service: Found ${summaries.length} Top Gainers before slicing.`);
  // Sort by percentage change in descending order
  return summaries.sort((a, b) => b.change_pct - a.change_pct).slice(0, limit);
};

/**
 * Retrieves a list of Top Losers.
 * @param {number} limit - The maximum number of losers to return.
 * @returns {Array<Object>}
 */
const getTopLosers = async (limit = 5) => {
  console.log(`Service: Fetching Top Losers (limit: ${limit})`);
  const allStocks = await Stock.find({});
  const summaries = [];

  for (const stock of allStocks) {
    const summary = await getStockSummary(stock.symbol);
    if (summary && summary.change_pct < 0) {
      summaries.push(summary);
    }
  }
  console.log(`Service: Found ${summaries.length} Top Losers before slicing.`);
  // Sort by percentage change in ascending order
  return summaries.sort((a, b) => a.change_pct - b.change_pct).slice(0, limit);
};

/**
 * Retrieves a list of Most Active stocks by volume.
 * @param {number} limit - The maximum number of active stocks to return.
 * @returns {Array<Object>}
 */
const getMostActive = async (limit = 5) => {
  console.log(`Service: Fetching Most Active (limit: ${limit})`);
  const allStocks = await Stock.find({});
  const summaries = [];

  for (const stock of allStocks) {
    const summary = await getStockSummary(stock.symbol);
    if (summary && summary.volume !== undefined) {
      summaries.push(summary);
    }
  }
  console.log(`Service: Found ${summaries.length} Most Active stocks before slicing.`);
  // Sort by volume in descending order
  return summaries.sort((a, b) => b.volume - a.volume).slice(0, limit);
};

/**
 * Gets a summary for specific symbols.
 * @param {Array<string>} symbols - An array of stock symbols.
 * @returns {Array<Object>}
 */
const getSummaryForSymbols = async (symbols) => {
  console.log(`Service: Getting summary for specific symbols: ${symbols.join(', ')}`);
  const summaries = [];
  for (const symbol of symbols) {
    const summary = await getStockSummary(symbol);
    if (summary) {
      summaries.push(summary);
    }
  }
  return summaries;
};

/**
 * Retrieves a list of top N stocks with their summary data.
 * This function prioritizes getting a comprehensive list rather than just gainers/losers/active.
 * @param {number} limit - The maximum number of stocks to return.
 * @returns {Array<Object>}
 */
const getTopNStocksSummary = async (limit = 10) => {
  console.log(`Service: Fetching top ${limit} stocks summary.`);
  const allStocks = await Stock.find({}).limit(limit); // Optionally limit initial stock fetch for performance
  const summaries = [];

  for (const stock of allStocks) {
    const summary = await getStockSummary(stock.symbol);
    if (summary) {
      summaries.push(summary);
    }
  }

  // You can add more sophisticated sorting here if needed, e.g., by highest volume, or biggest change
  // For now, let's just return them as is, up to the limit.
  return summaries.slice(0, limit);
};

module.exports = {
  getTopNStocksSummary,
};
