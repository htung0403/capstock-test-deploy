/*
  File: scripts/backfillDailyPrices.js
  Purpose: One-time backfill script to fetch daily OHLCV data from Alpha Vantage
  for multiple symbols from 2025-01-01 until now, using 3 API keys to distribute load.
  
  Usage:
    node scripts/backfillDailyPrices.js
*/
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const DailyPrice = require('../models/DailyPrice');
const Stock = require('../models/Stock');

// Symbol groups assigned to each API key
const SYMBOL_GROUPS = {
  key1: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "NFLX"],
  key2: ["AMD", "ADBE", "CRM", "ORCL", "INTC", "PYPL", "SHOP", "UBER"],
  key3: ["JPM", "BAC", "WFC", "C", "GS", "MS", "V", "MA"],
};

// API key mapping
const API_KEYS = {
  key1: process.env.ALPHA_VANTAGE_KEY_1,
  key2: process.env.ALPHA_VANTAGE_KEY_2,
  key3: process.env.ALPHA_VANTAGE_KEY_3,
};

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch daily OHLCV data from Alpha Vantage for a symbol
 * Note: Using TIME_SERIES_DAILY (not _ADJUSTED) because _ADJUSTED is premium-only
 * Note: Using outputsize=compact (not full) because full is premium-only
 * Free tier: ~100 data points (approximately 3-4 months of daily data)
 */
async function fetchDailyData(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query`;
  const params = {
    function: 'TIME_SERIES_DAILY', // Free tier endpoint (not _ADJUSTED which is premium)
    symbol: symbol,
    outputsize: 'compact', // Free tier: ~100 data points (full is premium-only)
    apikey: apiKey,
  };
  
  try {
    const response = await axios.get(url, { params, timeout: 30000 });
    const data = response.data;
    
    // Check for API errors first
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage Error: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      throw new Error(`Alpha Vantage Rate Limit: ${data['Note']}`);
    }
    
    // Check for information/status messages
    if (data['Information']) {
      throw new Error(`Alpha Vantage Info: ${data['Information']}`);
    }
    
    if (data['Invalid API call']) {
      throw new Error(`Alpha Vantage Invalid API: ${data['Invalid API call']}`);
    }
    
    // Check for time series data (try both possible keys)
    const timeSeries = data['Time Series (Daily)'] || data['Time Series (Daily Adjusted)'];
    
    if (!timeSeries) {
      // Log response structure for debugging
      console.error(`   ⚠️  Response structure for ${symbol}:`, Object.keys(data));
      console.error(`   ⚠️  Response sample (first 1000 chars):`, JSON.stringify(data, null, 2).substring(0, 1000));
      
      // Check if it's an empty object or unexpected structure
      if (Object.keys(data).length === 0) {
        throw new Error('Empty response from Alpha Vantage');
      }
      
      throw new Error(`No time series data in response. Response keys: ${Object.keys(data).join(', ')}`);
    }
    
    return timeSeries;
  } catch (error) {
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }
    // Re-throw if it's already our formatted error
    if (error.message.includes('Alpha Vantage') || error.message.includes('No time series')) {
      throw error;
    }
    console.error(`   ❌ Error fetching ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Parse Alpha Vantage time series data and filter from 2025-01-01
 * Note: Free tier only returns ~100 data points, so we may not get all data from 2025-01-01
 * We'll take whatever is available and filter what we can
 */
function parseAndFilterData(timeSeries, symbol) {
  const startDate = '2025-01-01';
  const docs = [];
  let totalPoints = 0;
  let filteredPoints = 0;
  
  for (const [dateStr, values] of Object.entries(timeSeries)) {
    totalPoints++;
    
    // Only include dates >= 2025-01-01
    if (dateStr < startDate) {
      continue;
    }
    filteredPoints++;
    
    // Parse OHLCV values
    const open = parseFloat(values['1. open']);
    const high = parseFloat(values['2. high']);
    const low = parseFloat(values['3. low']);
    const close = parseFloat(values['4. close']);
    const volume = parseFloat(values['5. volume']);
    
    // Skip if any value is invalid
    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
      console.warn(`   ⚠️  Skipping ${dateStr} for ${symbol}: invalid data`);
      continue;
    }
    
    docs.push({
      symbol,
      date: dateStr,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  
  // Sort by date ascending
  docs.sort((a, b) => a.date.localeCompare(b.date));
  
  // Log info about data range
  if (docs.length > 0) {
    const firstDate = docs[0].date;
    const lastDate = docs[docs.length - 1].date;
    console.log(`   📅 Data range: ${firstDate} to ${lastDate} (${docs.length} points from ${totalPoints} total)`);
    if (firstDate > startDate) {
      console.warn(`   ⚠️  Note: Free tier only provides ~100 data points. Earliest date is ${firstDate}, not ${startDate}`);
    }
  }
  
  return docs;
}

/**
 * Upsert daily price data into MongoDB using bulkWrite
 */
async function upsertDailyPrices(docs) {
  if (docs.length === 0) {
    return { upserted: 0, modified: 0 };
  }
  
  const operations = docs.map(doc => ({
    updateOne: {
      filter: { symbol: doc.symbol, date: doc.date },
      update: { $set: doc },
      upsert: true,
    },
  }));
  
  const result = await DailyPrice.bulkWrite(operations, { ordered: false });
  
  return {
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

/**
 * Backfill a single symbol
 */
async function backfillSymbol(symbol, apiKey, keyName) {
  console.log(`\n📊 Fetching ${symbol} with ${keyName}...`);
  
  try {
    // Fetch data from Alpha Vantage
    const timeSeries = await fetchDailyData(symbol, apiKey);
    
    // Parse and filter from 2025-01-01
    const docs = parseAndFilterData(timeSeries, symbol);
    
    if (docs.length === 0) {
      console.log(`   ⚠️  No data found for ${symbol} from 2025-01-01 onwards`);
      return { symbol, success: false, reason: 'No data' };
    }
    
    // Upsert into MongoDB
    const result = await upsertDailyPrices(docs);
    
    // Update Stock.currentPrice with the latest close price
    if (docs.length > 0) {
      const latestDoc = docs[docs.length - 1]; // Last doc is the most recent (already sorted)
      await Stock.updateOne(
        { symbol },
        {
          $set: {
            currentPrice: latestDoc.close,
            close: latestDoc.close,
            open: latestDoc.open,
            high: latestDoc.high,
            low: latestDoc.low,
            volume: latestDoc.volume,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`   💰 Updated Stock.currentPrice for ${symbol}: $${latestDoc.close}`);
    }
    
    console.log(`   ✅ Upserted ${result.upserted + result.modified} rows for ${symbol} (${result.upserted} new, ${result.modified} updated)`);
    
    return {
      symbol,
      success: true,
      rows: docs.length,
      upserted: result.upserted,
      modified: result.modified,
    };
  } catch (error) {
    console.error(`   ❌ Failed to backfill ${symbol}:`, error.message);
    return {
      symbol,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Backfill a group of symbols using one API key
 */
async function backfillGroup(groupKey, symbols, apiKey) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔑 Processing group ${groupKey} with ${symbols.length} symbols`);
  console.log(`${'='.repeat(60)}`);
  
  const results = [];
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const result = await backfillSymbol(symbol, apiKey, groupKey);
    results.push(result);
    
    // Wait 15-20 seconds between requests (except for the last symbol)
    if (i < symbols.length - 1) {
      const delayMs = 15000 + Math.random() * 5000; // 15-20 seconds
      console.log(`   ⏳ Waiting ${Math.round(delayMs / 1000)}s before next request...`);
      await delay(delayMs);
    }
  }
  
  return results;
}

/**
 * Test a single symbol to debug API response
 */
async function testSymbol(symbol, apiKey) {
  console.log(`\n🧪 Testing ${symbol} with API key (first 10 chars): ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);
  
  try {
    const timeSeries = await fetchDailyData(symbol, apiKey);
    console.log(`✅ Success! Got ${Object.keys(timeSeries).length} data points`);
    console.log(`   Sample dates:`, Object.keys(timeSeries).slice(0, 5).join(', '));
    return true;
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function run() {
  // Check for test mode
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    const testSymbolArg = args[args.indexOf('--test') + 1] || 'AAPL';
    const testKey = API_KEYS.key1 || process.env.ALPHA_VANTAGE_KEY_1;
    
    if (!testKey) {
      console.error('❌ No API key found for testing');
      process.exit(1);
    }
    
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
    await mongoose.connect(mongoUri, { 
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');
    
    await testSymbol(testSymbolArg, testKey);
    await mongoose.disconnect();
    process.exit(0);
  }
  
  // Validate API keys
  const missingKeys = [];
  for (const [keyName, keyValue] of Object.entries(API_KEYS)) {
    if (!keyValue) {
      missingKeys.push(keyName);
    }
  }
  
  if (missingKeys.length > 0) {
    console.error('❌ Missing API keys in .env:');
    missingKeys.forEach(key => {
      const envVar = `ALPHA_VANTAGE_KEY_${key.slice(-1)}`;
      console.error(`   - ${envVar}`);
    });
    process.exit(1);
  }
  
  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { 
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
  
  const allResults = [];
  
  try {
    // Process each group sequentially
    for (const [groupKey, symbols] of Object.entries(SYMBOL_GROUPS)) {
      const apiKey = API_KEYS[groupKey];
      
      if (!apiKey) {
        console.error(`❌ No API key configured for ${groupKey}`);
        continue;
      }
      
      const groupResults = await backfillGroup(groupKey, symbols, apiKey);
      allResults.push(...groupResults);
      
      // Wait a bit between groups (except for the last group)
      if (groupKey !== 'key3') {
        console.log(`\n⏳ Waiting 5s before processing next group...`);
        await delay(5000);
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 BACKFILL SUMMARY');
    console.log(`${'='.repeat(60)}`);
    
    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      const totalRows = successful.reduce((sum, r) => sum + (r.rows || 0), 0);
      const totalUpserted = successful.reduce((sum, r) => sum + (r.upserted || 0), 0);
      const totalModified = successful.reduce((sum, r) => sum + (r.modified || 0), 0);
      console.log(`📈 Total rows processed: ${totalRows}`);
      console.log(`➕ New records: ${totalUpserted}`);
      console.log(`🔄 Updated records: ${totalModified}`);
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed symbols:`);
      failed.forEach(r => {
        console.log(`   - ${r.symbol}: ${r.error || r.reason || 'Unknown error'}`);
      });
    }
    
    console.log(`\n✅ Backfill completed!`);
    
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  run().catch(async (error) => {
    console.error('❌ Unhandled error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { run, backfillSymbol, backfillGroup };

