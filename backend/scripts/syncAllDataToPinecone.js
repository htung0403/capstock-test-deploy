/*
  File: scripts/syncAllDataToPinecone.js
  Purpose: Master script to sync all data types to Pinecone
  Usage: node scripts/syncAllDataToPinecone.js [--types articles,external_news,stock_info]
  
  CHANGES (2025-12-07):
  - Initial creation to sync all data types to Pinecone
  - Orchestrates syncing of articles, external news, and stock info
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { generateArticleEmbedding } = require('./generateArticleEmbeddings');
const { syncExternalNewsForSymbol } = require('./syncExternalNewsToPinecone');
const { syncStockInfo } = require('./syncStockInfoToPinecone');
const mongoose = require('mongoose');
const Article = require('../models/Article');
const Stock = require('../models/Stock');
const pineconeService = require('../services/pineconeService');

/**
 * Sync articles to Pinecone
 * @param {number} limit - Max articles to sync
 * @returns {Promise<{success: number, failed: number}>}
 */
async function syncArticles(limit = 100) {
  console.log(`\n📰 Syncing Articles to Pinecone...`);
  console.log(`Limit: ${limit} articles\n`);

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  
  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 5000
    });

    const articles = await Article.find({ status: 'published' })
      .limit(limit)
      .select('title summary content symbol publishedAt createdAt embedding');

    console.log(`Found ${articles.length} articles to process`);

    if (articles.length === 0) {
      console.log('⚠️  No articles found');
      await mongoose.disconnect();
      return { success: 0, failed: 0 };
    }

    const articlesForPinecone = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i + 1}/${articles.length}] Processing: ${article.title?.substring(0, 50) || article._id}...`);

      // Check if embedding exists, if not generate it
      let embedding = article.embedding;
      if (!embedding || !Array.isArray(embedding) || embedding.length !== 384) {
        const textToEmbed = `${article.title || ''} ${article.summary || ''} ${article.content || ''}`.trim();
        if (textToEmbed) {
          embedding = await require('./generateArticleEmbeddings').generateEmbedding(textToEmbed);
          if (embedding) {
            // Save embedding to MongoDB
            await Article.findByIdAndUpdate(article._id, {
              embedding: embedding,
              embeddingGenerated: true,
              embeddingGeneratedAt: new Date()
            });
          }
        }
      }

      if (embedding && Array.isArray(embedding)) {
        articlesForPinecone.push({
          id: article._id.toString(),
          embedding: embedding,
          metadata: {
            title: article.title || '',
            symbol: article.symbol || '',
            summary: article.summary || '',
            publishedAt: article.publishedAt || article.createdAt,
            source: 'Internal'
          }
        });
        successCount++;
      } else {
        failCount++;
      }
    }

    // Batch upsert to Pinecone
    if (articlesForPinecone.length > 0) {
      console.log(`\n📦 Batch upserting ${articlesForPinecone.length} articles to Pinecone...`);
      const batchResult = await pineconeService.batchUpsertArticles(articlesForPinecone);
      console.log(`✅ Articles: ${batchResult.success} success, ${batchResult.failed} failed`);
    }

    await mongoose.disconnect();
    return { success: successCount, failed: failCount };
  } catch (error) {
    console.error('❌ Error syncing articles:', error);
    await mongoose.disconnect();
    return { success: 0, failed: 0 };
  }
}

/**
 * Sync external news for all stocks
 * @param {number} limitPerSymbol - Max news per symbol
 * @returns {Promise<{success: number, failed: number}>}
 */
async function syncAllExternalNews(limitPerSymbol = 20) {
  console.log(`\n📰 Syncing External News to Pinecone...`);
  console.log(`Limit: ${limitPerSymbol} articles per symbol\n`);

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  
  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 5000
    });

    // Get all stocks
    const stocks = await Stock.find({}).select('symbol').limit(10); // Limit to 10 stocks for demo
    console.log(`Found ${stocks.length} stocks to process\n`);

    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      console.log(`[${i + 1}/${stocks.length}] Processing ${stock.symbol}...`);
      
      const result = await syncExternalNewsForSymbol(stock.symbol, limitPerSymbol);
      totalSuccess += result.success;
      totalFailed += result.failed;

      // Delay between symbols
      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay to avoid rate limits
      }
    }

    await mongoose.disconnect();
    return { success: totalSuccess, failed: totalFailed };
  } catch (error) {
    console.error('❌ Error syncing external news:', error);
    await mongoose.disconnect();
    return { success: 0, failed: 0 };
  }
}

/**
 * Sync stock info for all stocks
 * @returns {Promise<{success: number, failed: number}>}
 */
async function syncAllStockInfo() {
  console.log(`\n📊 Syncing Stock Info to Pinecone...\n`);

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  
  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 5000
    });

    const stocks = await Stock.find({});
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

      if (i < stocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await mongoose.disconnect();
    return { success: successCount, failed: failCount };
  } catch (error) {
    console.error('❌ Error syncing stock info:', error);
    await mongoose.disconnect();
    return { success: 0, failed: 0 };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const typesIndex = args.indexOf('--types');
  const typesStr = typesIndex >= 0 ? args[typesIndex + 1] : 'articles,external_news,stock_info';
  const types = typesStr.split(',').map(t => t.trim());

  if (!pineconeService.isAvailable()) {
    console.error('❌ Pinecone not configured. Set PINECONE_API_KEY in .env');
    process.exit(1);
  }

  console.log(`\n🚀 Syncing all data to Pinecone`);
  console.log(`Types: ${types.join(', ')}\n`);

  const results = {
    articles: { success: 0, failed: 0 },
    external_news: { success: 0, failed: 0 },
    stock_info: { success: 0, failed: 0 }
  };

  // Sync articles
  if (types.includes('articles')) {
    results.articles = await syncArticles(100);
  }

  // Sync external news
  if (types.includes('external_news')) {
    results.external_news = await syncAllExternalNews(20);
  }

  // Sync stock info
  if (types.includes('stock_info')) {
    results.stock_info = await syncAllStockInfo();
  }

  // Summary
  console.log(`\n\n📊 SYNC SUMMARY`);
  console.log(`═══════════════════════════════════════`);
  if (types.includes('articles')) {
    console.log(`Articles:      ${results.articles.success} ✅ | ${results.articles.failed} ❌`);
  }
  if (types.includes('external_news')) {
    console.log(`External News: ${results.external_news.success} ✅ | ${results.external_news.failed} ❌`);
  }
  if (types.includes('stock_info')) {
    console.log(`Stock Info:    ${results.stock_info.success} ✅ | ${results.stock_info.failed} ❌`);
  }
  console.log(`═══════════════════════════════════════\n`);

  const totalSuccess = results.articles.success + results.external_news.success + results.stock_info.success;
  const totalFailed = results.articles.failed + results.external_news.failed + results.stock_info.failed;
  console.log(`Total: ${totalSuccess} ✅ | ${totalFailed} ❌\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncArticles, syncAllExternalNews, syncAllStockInfo };

