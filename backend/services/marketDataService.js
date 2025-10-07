/*
  File: services/marketDataService.js
  Purpose: Fetch real-time/near real-time stock market data from external APIs
           and normalize it to the app's Stock schema fields.
*/
const axios = require('axios');

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
};


