/*
  File: scripts/syncStockInfoToPinecone.js
  Purpose: Sync stock information/descriptions to Pinecone for vector search
  Usage: node scripts/syncStockInfoToPinecone.js [--symbol AAPL] [--all]
  
  CHANGES (2025-12-07):
  - Initial creation to sync stock info to Pinecone
  - Generates embeddings for stock name + sector + description
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const { generateEmbedding } = require('./generateArticleEmbeddings');
const pineconeService = require('../services/pineconeService');

/**
 * Sync stock info to Pinecone
 * @param {Object} stock - Stock document
 * @returns {Promise<boolean>} Success status
 */
async function syncStockInfo(stock) {
  try {
    // Build text to embed: name + sector + description (if available)
    const textParts = [
      stock.name || '',
      stock.sector || '',
      `Stock symbol ${stock.symbol}`,
      'company information financial data'
    ].filter(Boolean);

    const textToEmbed = textParts.join(' ').trim();

    if (!textToEmbed || textToEmbed.length < 10) {
      console.log(`⚠️  Skipping ${stock.symbol}: insufficient information`);
      return false;
    }

    // Generate embedding
    const embedding = await generateEmbedding(textToEmbed);
    if (!embedding) {
      console.error(`❌ Failed to generate embedding for ${stock.symbol}`);
      return false;
    }

    // Upsert to Pinecone
    const success = await pineconeService.upsertStockInfo(
      stock.symbol,
      embedding,
      {
        name: stock.name || '',
        sector: stock.sector || '',
        description: `Stock information for ${stock.name || stock.symbol} in ${stock.sector || 'unknown'} sector`
      }
    );

    if (success) {
      console.log(`✅ Synced ${stock.symbol}: ${stock.name}`);
      return true;
    } else {
      console.error(`❌ Failed to sync ${stock.symbol}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error syncing stock ${stock.symbol}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const symbolIndex = args.indexOf('--symbol');
  const symbol = symbolIndex >= 0 ? args[symbolIndex + 1] : null;
  const all = args.includes('--all');

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  
  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('\n❌ Failed to connect to MongoDB!');
    console.error('Error:', error.message);
    process.exit(1);
  }

  if (!pineconeService.isAvailable()) {
    console.error('❌ Pinecone not configured. Set PINECONE_API_KEY in .env');
    await mongoose.disconnect();
    process.exit(1);
  }

  try {
    let stocks;
    
    if (symbol) {
      stocks = await Stock.find({ symbol: symbol.toUpperCase() });
      console.log(`\n📊 Syncing stock info for: ${symbol.toUpperCase()}`);
    } else if (all) {
      stocks = await Stock.find({});
      console.log(`\n📊 Syncing all stock info to Pinecone...`);
    } else {
      console.error('❌ Please provide --symbol AAPL or --all');
      console.log('\nUsage: node scripts/syncStockInfoToPinecone.js [--symbol AAPL] [--all]');
      await mongoose.disconnect();
      process.exit(1);
    }

    if (stocks.length === 0) {
      console.log('⚠️  No stocks found');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${stocks.length} stocks to process\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      console.log(`[${i + 1}/${stocks.length}] Processing: ${stock.symbol}...`);
      
      const success = await syncStockInfo(stock);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay to avoid overwhelming the system
      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Completed: ${successCount} success, ${failCount} failed`);
    console.log(`\n✅ Stock info synced to Pinecone namespace: ${pineconeService.NAMESPACES.STOCK_INFO}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncStockInfo };

