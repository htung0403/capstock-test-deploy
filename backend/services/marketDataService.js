/*
  File: services/marketDataService.js
  Purpose: Fetch real-time/near real-time stock market data from external APIs
           and normalize it to the app's Stock schema fields.
  
  CHANGES (2025-10-20):
  - Added `fetchStockNews` function to fetch news articles from NewsAPI for a given stock symbol.
  - Ensured `content` field is mapped correctly from NewsAPI response (using `content` or `description`).
  - Exported `fetchStockNews`.
*/
const axios = require('axios');
const Stock = require('../models/Stock'); // Import the Stock model
// const News = require('../models/News'); // News model removed, will be handled by Article model in aiController

const MARKET_INDICES = [
  { symbol: '^VNINDEX', name: 'VN-Index' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average' },
  { symbol: '^IXIC', name: 'NASDAQ Composite' },
  { symbol: '^GSPC', name: 'S&P 500' },
];

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Get Alpha Vantage API key with rotation support
 * Uses 3 API keys (ALPHA_VANTAGE_KEY_1, _2, _3) and rotates between them based on symbol
 * Falls back to ALPHA_VANTAGE_KEY for backward compatibility
 * 
 * @param {string} symbol - Optional symbol to determine which key to use (for load balancing)
 * @returns {string} API key
 */
function getAlphaVantageKey(symbol = null) {
  const key1 = process.env.ALPHA_VANTAGE_KEY_1;
  const key2 = process.env.ALPHA_VANTAGE_KEY_2;
  const key3 = process.env.ALPHA_VANTAGE_KEY_3;
  
  // Collect available keys
  const availableKeys = [];
  if (key1) availableKeys.push(key1);
  if (key2) availableKeys.push(key2);
  if (key3) availableKeys.push(key3);
  
  if (availableKeys.length > 0) {
    // If we have multiple keys and a symbol, use hash-based rotation for load balancing
    if (availableKeys.length > 1 && symbol) {
      // Simple hash to consistently assign symbol to a key
      let hash = 0;
      for (let i = 0; i < symbol.length; i++) {
        hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      const index = Math.abs(hash) % availableKeys.length;
      return availableKeys[index];
    }
    // Otherwise, use first available key
    return availableKeys[0];
  }
  
  // Fallback to old env var for backward compatibility
  const legacyKey = process.env.ALPHA_VANTAGE_KEY;
  if (legacyKey) return legacyKey;
  
  throw new Error('Missing ALPHA_VANTAGE_KEY in environment. Set ALPHA_VANTAGE_KEY_1, _2, _3, or ALPHA_VANTAGE_KEY');
}

// Alpha Vantage: GLOBAL_QUOTE endpoint
async function fetchQuoteAlphaVantage(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query`;
  const params = {
    function: 'GLOBAL_QUOTE',
    symbol,
    apikey: apiKey,
  };
  
  try {
    const { data } = await axios.get(url, { params, timeout: 15000 });
    
    // Check for API errors or rate limiting messages
    if (data['Note']) {
      console.error(`AlphaVantage API Note for ${symbol}:`, data['Note']);
      throw new Error(`AlphaVantage: ${data['Note']}`);
    }
    
    if (data['Error Message']) {
      console.error(`AlphaVantage API Error for ${symbol}:`, data['Error Message']);
      throw new Error(`AlphaVantage: ${data['Error Message']}`);
    }
    
    if (data['Information']) {
      console.error(`AlphaVantage API Information for ${symbol}:`, data['Information']);
      throw new Error(`AlphaVantage: ${data['Information']}`);
    }
    
    const q = data && data['Global Quote'];
    if (!q || Object.keys(q).length === 0) {
      console.error(`AlphaVantage: No quote data for ${symbol}. Response:`, JSON.stringify(data, null, 2));
      throw new Error(`AlphaVantage: No quote for symbol ${symbol}. Check API key and rate limits.`);
    }
    
    return {
      symbol,
      currentPrice: parseNumber(q['05. price']),
      open: parseNumber(q['02. open']),
      high: parseNumber(q['03. high']),
      low: parseNumber(q['04. low']),
      close: parseNumber(q['08. previous close']),
      volume: parseNumber(q['06. volume']),
      provider: 'ALPHA_VANTAGE',
    };
  } catch (error) {
    if (error.response) {
      console.error(`AlphaVantage HTTP Error for ${symbol}:`, error.response.status, error.response.data);
      throw new Error(`AlphaVantage: HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Alpha Vantage: TIME_SERIES_DAILY (adjusted=false) - returns daily candles
async function fetchDailySeriesAlphaVantage(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query`;
  const params = {
    function: 'TIME_SERIES_DAILY',
    symbol,
    apikey: apiKey,
    outputsize: 'compact', // last ~100 data points
  };
  const { data } = await axios.get(url, { params, timeout: 20000 });
  const series = data && data['Time Series (Daily)'];
  if (!series) {
    throw new Error(`AlphaVantage: No daily series for symbol ${symbol}`);
  }
  // Transform to array sorted ascending by date
  const rows = Object.entries(series)
    .map(([date, v]) => ({
      date,
      open: parseNumber(v['1. open']),
      high: parseNumber(v['2. high']),
      low: parseNumber(v['3. low']),
      close: parseNumber(v['4. close']),
      volume: parseNumber(v['5. volume']),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return rows;
}

// Fetch news from NewsAPI for a given stock symbol
async function fetchStockNews(symbol, apiKey) {
  const url = `https://newsapi.org/v2/everything`;
  const params = {
    q: symbol + ' stock', // Search query for the stock
    language: 'en',
    sortBy: 'publishedAt',
    apiKey: apiKey,
    pageSize: 10, // Limit to 10 articles
  };
  try {
    const { data } = await axios.get(url, { params, timeout: 15000 });
    const articles = data.articles;

    if (!articles || articles.length === 0) {
      console.log(`NewsAPI: No news for symbol ${symbol}`);
      return [];
    }

    const newsEntries = articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: new Date(article.publishedAt),
      symbol: symbol.toUpperCase(), // Associate news with the stock symbol
      content: article.content || article.description || '', // Use content, or description, or empty string
    }));

    console.log(`NewsAPI: Fetched ${newsEntries.length} news articles for ${symbol}`);
    return newsEntries; // Return raw news entries, aiController will decide how to use them
  } catch (err) {
    console.error(`Error fetching news for ${symbol} from NewsAPI:`, err.message);
    throw new Error(`NewsAPI: Failed to fetch news for symbol ${symbol}`);
  }
}

/**
 * @desc Get market indices from available stocks (25 stocks in database)
 * Instead of real market indices (S&P 500, Dow Jones), we use our available stocks
 * @returns {Array} An array of stock objects formatted as indices
 */
async function fetchMarketIndices() {
  try {
    // Get all stocks from database (25 stocks)
    const stocks = await Stock.find({}).sort({ symbol: 1 }).limit(25);
    
    // Format as market indices with change calculation
    const indices = stocks.map(stock => {
      // Calculate change from previous close if available
      let change = 0;
      let changePct = 0;
      
      if (stock.close && stock.currentPrice) {
        change = stock.currentPrice - stock.close;
        changePct = stock.close > 0 ? ((change / stock.close) * 100) : 0;
      }
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        value: stock.currentPrice || 0,
        change: parseFloat(changePct.toFixed(2)),
      };
    });
    
    return indices;
  } catch (error) {
    console.error('Error fetching market indices:', error);
    return [];
  }
}

/**
 * @desc Get top N gainers and losers from a list of stocks.
 * @param {Array} stocksData - An array of stock objects, expected to have a 'change' property.
 * @param {number} limit - The number of top gainers/losers to return.
 * @returns {Object} An object containing arrays of topGainers and topLosers.
 */
function getTopGainersLosers(stocksData, limit = 5) {
  if (!stocksData || stocksData.length === 0) {
    return { topGainers: [], topLosers: [] };
  }

  const sortedByChange = [...stocksData].sort((a, b) => b.change - a.change);

  const topGainers = sortedByChange.slice(0, limit);
  const topLosers = sortedByChange.slice(-limit).reverse(); // Get last N and reverse for descending loss

  return { topGainers, topLosers };
}

// Main entry: choose provider via env
async function fetchQuote(symbol) {
  const provider = (process.env.MARKET_PROVIDER || 'ALPHA_VANTAGE').toUpperCase();
  if (provider === 'ALPHA_VANTAGE') {
    const apiKey = getAlphaVantageKey(symbol); // Pass symbol for load balancing
    return fetchQuoteAlphaVantage(symbol, apiKey);
  }
  throw new Error(`Unsupported MARKET_PROVIDER: ${provider}`);
}

async function fetchDailySeries(symbol) {
  const provider = (process.env.MARKET_PROVIDER || 'ALPHA_VANTAGE').toUpperCase();
  if (provider === 'ALPHA_VANTAGE') {
    const apiKey = getAlphaVantageKey(symbol); // Pass symbol for load balancing
    return fetchDailySeriesAlphaVantage(symbol, apiKey);
  }
  throw new Error(`Unsupported MARKET_PROVIDER: ${provider}`);
}

/**
 * @desc Get market data formatted for heatmap display
 * @returns {Array} An array of stock objects with symbol, name, change, marketCap, sector, volume, OHLC
 */
async function getHeatmapData() {
  try {
    const stocks = await Stock.find({}).sort({ symbol: 1 });
    const heatmapData = stocks.map(stock => {
      const currentPrice = stock.currentPrice || 0;
      const previousClose = stock.close || 0;

      let change = 0;
      if (currentPrice && previousClose && previousClose !== 0) {
        change = ((currentPrice - previousClose) / previousClose) * 100;
      }

      // Calculate market cap (simple approximation: price * volume)
      const marketCap = stock.marketCap || (currentPrice * (stock.volume || 0));

      // Format volume for display (e.g., 12.5M)
      const formatVolume = (vol) => {
        if (!vol || vol === 0) return 'N/A';
        if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
        if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
        return vol.toString();
      };

      return {
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        currentPrice: currentPrice,
        open: stock.open || 0,
        high: stock.high || 0,
        low: stock.low || 0,
        close: previousClose,
        volume: stock.volume || 0,
        volumeFormatted: formatVolume(stock.volume),
        change: parseFloat(change.toFixed(2)),
        marketCap: marketCap,
        sector: stock.sector || 'N/A',
      };
    });
    
    // Sort by change descending (hottest stocks first)
    return heatmapData.sort((a, b) => b.change - a.change);
  } catch (error) {
    console.error('Error fetching heatmap data in service:', error);
    throw new Error('Failed to retrieve heatmap data.');
  }
}

module.exports = {
  fetchQuote,
  fetchDailySeries,
  fetchStockNews, // Export the news fetching function
  getHeatmapData,
  fetchMarketIndices,
  getTopGainersLosers,
};


