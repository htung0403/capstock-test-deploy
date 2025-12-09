/*
  File: scripts/syncExternalNewsToPinecone.js
  Purpose: Sync external news from NewsAPI to Pinecone for vector search
  Usage: node scripts/syncExternalNewsToPinecone.js [--symbol AAPL] [--limit 50]
  
  CHANGES (2025-12-07):
  - Initial creation to sync external news to Pinecone
  - Fetches news from NewsAPI, generates embeddings, and upserts to Pinecone
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { fetchStockNews } = require('../services/marketDataService');
const { generateEmbedding } = require('./generateArticleEmbeddings');
const pineconeService = require('../services/pineconeService');

const NEWS_API_KEY = process.env.NEWS_API_KEY;

/**
 * Generate unique ID for external news (hash of URL)
 * @param {string} url - News URL
 * @returns {string} Hash ID
 */
function generateNewsId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

/**
 * Sync external news for a symbol to Pinecone
 * @param {string} symbol - Stock symbol
 * @param {number} limit - Max number of news articles
 * @returns {Promise<{success: number, failed: number}>}
 */
async function syncExternalNewsForSymbol(symbol, limit = 50) {
  if (!NEWS_API_KEY) {
    console.error('❌ NEWS_API_KEY not found in .env file');
    return { success: 0, failed: 0 };
  }

  if (!pineconeService.isAvailable()) {
    console.error('❌ Pinecone not configured. Set PINECONE_API_KEY in .env');
    return { success: 0, failed: 0 };
  }

  try {
    console.log(`\n📰 Fetching external news for ${symbol}...`);
    const newsArticles = await fetchStockNews(symbol, NEWS_API_KEY);
    
    if (!newsArticles || newsArticles.length === 0) {
      console.log(`⚠️  No news found for ${symbol}`);
      return { success: 0, failed: 0 };
    }

    console.log(`✅ Fetched ${newsArticles.length} news articles`);
    console.log(`\n🔄 Generating embeddings and syncing to Pinecone...`);

    const articlesForPinecone = [];
    let processed = 0;

    for (const news of newsArticles.slice(0, limit)) {
      try {
        // Generate text to embed
        const textToEmbed = `${news.title || ''} ${news.description || ''} ${news.content || ''}`.trim();
        
        if (!textToEmbed || textToEmbed.length < 10) {
          console.log(`⚠️  Skipping news: insufficient text`);
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(textToEmbed);
        if (!embedding) {
          console.log(`⚠️  Failed to generate embedding for: ${news.title?.substring(0, 50)}`);
          continue;
        }

        // Generate unique ID
        const newsId = generateNewsId(news.url || news.title);

        articlesForPinecone.push({
          id: newsId,
          embedding: embedding,
          metadata: {
            title: news.title || '',
            symbol: symbol.toUpperCase(),
            description: news.description || '',
            url: news.url || '',
            source: news.source || 'External',
            publishedAt: news.publishedAt || new Date()
          }
        });

        processed++;
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${Math.min(newsArticles.length, limit)}...`);
        }
      } catch (error) {
        console.error(`❌ Error processing news: ${error.message}`);
      }
    }

    // Batch upsert to Pinecone
    if (articlesForPinecone.length > 0) {
      console.log(`\n📦 Batch upserting ${articlesForPinecone.length} news articles to Pinecone...`);
      
      // Use batch upsert (but need to adapt for external news namespace)
      const index = await pineconeService.initializePinecone();
      const namespace = pineconeService.NAMESPACES.EXTERNAL_NEWS;
      const namespaceIndex = index.namespace(namespace);

      let successCount = 0;
      let failedCount = 0;

      // Process in batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < articlesForPinecone.length; i += BATCH_SIZE) {
        const batch = articlesForPinecone.slice(i, i + BATCH_SIZE);
        
        try {
          const vectors = batch.map(item => ({
            id: item.id,
            values: item.embedding,
            metadata: {
              title: (item.metadata.title || '').substring(0, 1000),
              symbol: item.metadata.symbol || '',
              description: (item.metadata.description || '').substring(0, 1000),
              url: item.metadata.url || '',
              source: item.metadata.source || 'External',
              publishedAt: item.metadata.publishedAt ? new Date(item.metadata.publishedAt).toISOString() : '',
              type: 'external_news'
            }
          }));

          await namespaceIndex.upsert(vectors);
          successCount += batch.length;
          console.log(`  ✅ Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} articles)`);
        } catch (error) {
          console.error(`  ❌ Failed to upsert batch: ${error.message}`);
          failedCount += batch.length;
        }
      }

      console.log(`\n✅ Completed: ${successCount} success, ${failedCount} failed`);
      return { success: successCount, failed: failedCount };
    }

    return { success: 0, failed: 0 };
  } catch (error) {
    console.error(`❌ Error syncing external news for ${symbol}:`, error.message);
    return { success: 0, failed: 0 };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const symbolIndex = args.indexOf('--symbol');
  const symbol = symbolIndex >= 0 ? args[symbolIndex + 1] : null;
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 50;

  if (!symbol) {
    console.error('❌ Please provide a stock symbol: --symbol AAPL');
    console.log('\nUsage: node scripts/syncExternalNewsToPinecone.js --symbol AAPL [--limit 50]');
    process.exit(1);
  }

  console.log(`\n🚀 Syncing external news to Pinecone`);
  console.log(`Symbol: ${symbol.toUpperCase()}`);
  console.log(`Limit: ${limit} articles\n`);

  const result = await syncExternalNewsForSymbol(symbol.toUpperCase(), limit);

  console.log(`\n📊 Summary:`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`\n✅ External news synced to Pinecone namespace: ${pineconeService.NAMESPACES.EXTERNAL_NEWS}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncExternalNewsForSymbol };

