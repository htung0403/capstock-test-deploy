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
const News = require('../models/News'); // Import News model

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

// Alpha Vantage: GLOBAL_QUOTE endpoint
async function fetchQuoteAlphaVantage(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query`;
  const params = {
    function: 'GLOBAL_QUOTE',
    symbol,
    apikey: apiKey,
  };
  const { data } = await axios.get(url, { params, timeout: 15000 });
  const q = data && data['Global Quote'];
  if (!q) {
    throw new Error(`AlphaVantage: No quote for symbol ${symbol}`);
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

    // Save news to DB, avoiding duplicates
    const savedNews = await Promise.all(
      newsEntries.map(async (newsItem) => {
        // Check if news already exists by URL and title
        const existingNews = await News.findOne({ url: newsItem.url, title: newsItem.title });
        if (!existingNews) {
          return News.create(newsItem);
        }
        return existingNews; // Return existing if duplicate
      })
    );
    console.log(`NewsAPI: Fetched and saved ${savedNews.length} news articles for ${symbol}`);
    return savedNews;
  } catch (err) {
    console.error(`Error fetching news for ${symbol} from NewsAPI:`, err.message);
    throw new Error(`NewsAPI: Failed to fetch news for symbol ${symbol}`);
  }
}

// Main entry: choose provider via env
async function fetchQuote(symbol) {
  const provider = (process.env.MARKET_PROVIDER || 'ALPHA_VANTAGE').toUpperCase();
  if (provider === 'ALPHA_VANTAGE') {
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) throw new Error('Missing ALPHA_VANTAGE_KEY in environment');
    return fetchQuoteAlphaVantage(symbol, apiKey);
  }
  throw new Error(`Unsupported MARKET_PROVIDER: ${provider}`);
}

async function fetchDailySeries(symbol) {
  const provider = (process.env.MARKET_PROVIDER || 'ALPHA_VANTAGE').toUpperCase();
  if (provider === 'ALPHA_VANTAGE') {
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) throw new Error('Missing ALPHA_VANTAGE_KEY in environment');
    return fetchDailySeriesAlphaVantage(symbol, apiKey);
  }
  throw new Error(`Unsupported MARKET_PROVIDER: ${provider}`);
}

module.exports = {
  fetchQuote,
  fetchDailySeries,
  fetchStockNews, // Export the new news fetching function
};


