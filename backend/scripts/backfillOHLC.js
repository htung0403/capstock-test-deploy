/*
  File: scripts/backfillOHLC.js
  Purpose: Backfill OHLC data for existing StockHistory records using Alpha Vantage
*/

require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const { fetchDailySeries } = require('../services/marketDataService');

async function backfillOHLC() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/capstock';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all unique stock symbols
    const symbols = await StockHistory.distinct('stockSymbol');
    console.log(`📊 Found ${symbols.length} symbols: ${symbols.join(', ')}`);

    for (const symbol of symbols) {
      try {
        console.log(`\n🔄 Fetching OHLC data for ${symbol}...`);
        
        // Fetch daily series from Alpha Vantage
        const dailySeries = await fetchDailySeries(symbol);
        console.log(`   Retrieved ${dailySeries.length} data points`);

        let updated = 0;
        let created = 0;

        for (const day of dailySeries) {
          const timestamp = new Date(day.date);
          const startOfDay = new Date(timestamp);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(timestamp);
          endOfDay.setHours(23, 59, 59, 999);

          // Check if record exists for this date
          const existing = await StockHistory.findOne({
            stockSymbol: symbol,
            timestamp: { $gte: startOfDay, $lt: endOfDay }
          });

          if (existing) {
            // Update with OHLC data
            existing.price = day.close || existing.price;
            existing.open = day.open;
            existing.high = day.high;
            existing.low = day.low;
            existing.close = day.close;
            existing.volume = day.volume || existing.volume;
            await existing.save();
            updated++;
          } else {
            // Create new record
            await StockHistory.create({
              stockSymbol: symbol,
              price: day.close,
              open: day.open,
              high: day.high,
              low: day.low,
              close: day.close,
              volume: day.volume,
              timestamp: new Date(day.date)
            });
            created++;
          }
        }

        console.log(`   ✅ ${symbol}: Updated ${updated}, Created ${created}`);
        
        // Rate limiting: Alpha Vantage free tier = 5 calls/minute
        console.log('   ⏳ Waiting 12 seconds to avoid rate limit...');
        await new Promise(resolve => setTimeout(resolve, 12000));
        
      } catch (err) {
        console.error(`   ❌ Error processing ${symbol}:`, err.message);
      }
    }

    console.log('\n🎉 Backfill completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

backfillOHLC();
