const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const { fetchQuote } = require('./marketDataService'); // Re-use fetchQuote from marketDataService

/**
 * @desc Refreshes live prices for all known stock symbols in the DB (best-effort).
 * This function is designed to be called by both the API controller and the scheduler.
 * @returns {Array} An array of results for each stock refresh attempt.
 */
// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if stock data needs refresh (only refresh if data is older than MIN_REFRESH_INTERVAL_MS)
 */
const MIN_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour - only refresh if data is older than 1 hour

const shouldRefreshStock = async (stock) => {
  if (!stock.updatedAt) {
    return true; // Never refreshed, need to refresh
  }
  const timeSinceUpdate = Date.now() - new Date(stock.updatedAt).getTime();
  return timeSinceUpdate > MIN_REFRESH_INTERVAL_MS;
};

exports.refreshAllStocksData = async () => {
  console.log('Service: Starting refresh of all stocks data...');
  const stocks = await Stock.find({});
  
  // Filter stocks that need refresh
  const stocksToRefresh = [];
  for (const stock of stocks) {
    const needsRefresh = await shouldRefreshStock(stock);
    if (needsRefresh) {
      stocksToRefresh.push(stock);
    } else {
      console.log(`Service: Skipping ${stock.symbol} - data is still fresh (updated ${Math.round((Date.now() - new Date(stock.updatedAt).getTime()) / 1000 / 60)} minutes ago)`);
    }
  }

  if (stocksToRefresh.length === 0) {
    console.log('Service: No stocks need refresh. All data is still fresh.');
    return [];
  }

  console.log(`Service: Refreshing ${stocksToRefresh.length} out of ${stocks.length} stocks...`);
  const results = [];

  // Alpha Vantage free tier allows 25 calls/day
  // Adding delay to avoid hitting rate limit too quickly
  const DELAY_BETWEEN_CALLS_MS = 3000; // 3 seconds between calls (20 calls/minute max, but we're conservative)

  let rateLimitHit = false;

  for (let i = 0; i < stocksToRefresh.length && !rateLimitHit; i++) {
    const s = stocksToRefresh[i];
    try {
      // Add delay between API calls to avoid rate limiting (except for the first call)
      if (i > 0) {
        await delay(DELAY_BETWEEN_CALLS_MS);
      }

      console.log(`Service: Fetching quote for ${s.symbol} (${i + 1}/${stocksToRefresh.length})...`);
      const quote = await fetchQuote(s.symbol);
      
      const update = {
        currentPrice: quote.currentPrice,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume,
        updatedAt: new Date(),
      };
      await Stock.updateOne({ _id: s._id }, update);

      // Record history if currentPrice is available
      if (update.currentPrice != null) {
        await StockHistory.create({
          stockSymbol: s.symbol,
          price: update.currentPrice,
          open: update.open,
          high: update.high,
          low: update.low,
          close: update.close,
          volume: update.volume ?? 0,
          timestamp: new Date(),
        });
      }
      results.push({ symbol: s.symbol, ok: true, provider: quote.provider });
      console.log(`Service: Successfully refreshed ${s.symbol}`);
    } catch (e) {
      console.error(`Error refreshing stock ${s.symbol}:`, e.message);
      results.push({ symbol: s.symbol, ok: false, error: e.message });
      
      // Check if this is a rate limit error
      if (e.message && (e.message.includes('rate limit') || e.message.includes('25 requests per day'))) {
        console.error('Service: Rate limit detected! Stopping refresh to avoid wasting API quota.');
        rateLimitHit = true;
        // Mark remaining stocks as skipped
        for (let j = i + 1; j < stocksToRefresh.length; j++) {
          results.push({ 
            symbol: stocksToRefresh[j].symbol, 
            ok: false, 
            error: 'Skipped due to rate limit' 
          });
        }
      }
    }
  }
  
  const successCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;
  console.log(`Service: Finished refreshing stocks. Success: ${successCount}, Failed: ${failCount}, Total: ${results.length}`);
  
  return results;
};
