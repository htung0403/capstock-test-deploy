/*
  File: backend/services/marketSummaryHelper.js
  Purpose: Helper functions for calculating market summary data (daily change, latest price, previous close).
  Date: 2025-11-17
*/

/**
 * Calculates the daily price change and percentage change for a stock.
 * @param {number} latestPrice - The latest trading price of the stock.
 * @param {number} previousClose - The closing price of the previous trading day.
 * @returns {{change: number, change_pct: number}}
 */
const calculateDailyChange = (latestPrice, previousClose) => {
  console.log('Helper: calculateDailyChange called with latestPrice:', latestPrice, 'previousClose:', previousClose);
  if (previousClose === 0 || previousClose === undefined || previousClose === null) {
    console.log('Helper: previousClose is invalid, returning 0 change.');
    return { change: 0, change_pct: 0 };
  }
  const change = latestPrice - previousClose;
  const change_pct = (change / previousClose) * 100;
  return { change, change_pct };
};

/**
 * Extracts the latest trading price from a stock's history.
 * Assumes history is sorted by timestamp in ascending order.
 * @param {Array<Object>} stockHistory - An array of stock history objects.
 * @returns {number | null} The latest price, or null if history is empty.
 */
const getLatestPrice = (stockHistory) => {
  if (!stockHistory || stockHistory.length === 0) {
    return null;
  }
  return stockHistory[stockHistory.length - 1].price;
};

/**
 * Extracts the previous day's closing price from a stock's history.
 * Assumes history is sorted by timestamp in ascending order.
 * This function attempts to find the last known 'close' price from a day prior to the latest entry.
 * @param {Array<Object>} stockHistory - An array of stock history objects.
 * @returns {number | null} The previous closing price, or null if not found.
 */
const getPreviousClose = (stockHistory) => {
  console.log('Helper: getPreviousClose called with history length:', stockHistory?.length);
  if (!stockHistory || stockHistory.length < 2) {
    console.log('Helper: Not enough history to get previous close.');
    return null; // Need at least two data points to determine a previous close
  }

  const latestTimestamp = new Date(stockHistory[stockHistory.length - 1].timestamp);
  const latestDate = new Date(latestTimestamp.getFullYear(), latestTimestamp.getMonth(), latestTimestamp.getDate());

  // Find the last entry from a different day than the latest entry
  let previousDayClose = null;
  let previousDayDate = null;

  for (let i = stockHistory.length - 2; i >= 0; i--) {
    const currentEntryTimestamp = new Date(stockHistory[i].timestamp);
    const currentDate = new Date(currentEntryTimestamp.getFullYear(), currentEntryTimestamp.getMonth(), currentEntryTimestamp.getDate());
    
    // Compare dates only, ignoring time
    if (currentDate.getTime() !== latestDate.getTime()) {
      // Found a different day
      if (!previousDayDate || currentDate.getTime() > previousDayDate.getTime()) {
        // This is the most recent different day, or the first different day we've found
        previousDayDate = currentDate;
        previousDayClose = stockHistory[i].close || stockHistory[i].price;
        console.log('Helper: Found previous day close:', previousDayClose, 'for date:', currentDate.toISOString().split('T')[0]);
      }
    }
  }

  if (previousDayClose === null) {
    console.log('Helper: No previous day close found. All entries are from the same day.');
    // Fallback: If all entries are from the same day, try to use the first entry's close/price as "previous close"
    // This handles the case where we only have intraday data
    if (stockHistory.length > 1) {
      const firstEntry = stockHistory[0];
      const fallbackClose = firstEntry.close || firstEntry.price;
      console.log('Helper: Using first entry as fallback previous close:', fallbackClose);
      return fallbackClose;
    }
  }

  return previousDayClose;
};

module.exports = {
  calculateDailyChange,
  getLatestPrice,
  getPreviousClose,
};
