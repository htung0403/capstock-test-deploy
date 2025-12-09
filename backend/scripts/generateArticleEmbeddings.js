/*
  File: scripts/generateArticleEmbeddings.js
  Purpose: Generate and store embeddings for articles in MongoDB
  Used for MongoDB Atlas Vector Search
  
  Usage:
    node scripts/generateArticleEmbeddings.js [--all] [--symbol AAPL] [--limit 100]
  
  CHANGES (2025-12-07):
  - Initial creation for MongoDB Atlas Vector Search
*/

// Load .env from backend directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const Article = require('../models/Article');
const pineconeService = require('../services/pineconeService');

const EMBEDDING_SCRIPT = path.join(__dirname, '..', 'ai_scripts', 'embed_text.py');

/**
 * Generate embedding for text using Python script
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>|null>} Embedding vector
 */
function generateEmbedding(text) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [EMBEDDING_SCRIPT, text]);
    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Embedding script error: ${stderr}`);
        return resolve(null);
      }

      try {
        const embedding = JSON.parse(stdout.trim());
        if (Array.isArray(embedding) && embedding.length === 384) {
          resolve(embedding);
        } else {
          console.error('Invalid embedding format');
          resolve(null);
        }
      } catch (e) {
        console.error('Failed to parse embedding:', e.message);
        resolve(null);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      resolve(null);
    });
  });
}

/**
 * Generate embedding for an article
 * @param {Object} article - Article document
 * @returns {Promise<boolean>} Success status
 */
async function generateArticleEmbedding(article) {
  try {
    // Combine title, summary, and content for embedding
    const textToEmbed = `${article.title || ''} ${article.summary || ''} ${article.content || ''}`.trim();
    
    if (!textToEmbed || textToEmbed.length < 10) {
      console.log(`Skipping article ${article._id}: insufficient text`);
      return false;
    }

    // Generate embedding
    const embedding = await generateEmbedding(textToEmbed);
    
    if (!embedding) {
      console.error(`Failed to generate embedding for article ${article._id}`);
      return false;
    }

    // Update article with embedding in MongoDB
    await Article.findByIdAndUpdate(article._id, {
      embedding: embedding,
      embeddingGenerated: true,
      embeddingGeneratedAt: new Date()
    });

    // Note: Pinecone upsert is now done via batch upsert in main() function
    // This improves performance by batching up to 1000 vectors per request

    return true;
  } catch (error) {
    console.error(`Error processing article ${article._id}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const symbolIndex = args.indexOf('--symbol');
  const symbol = symbolIndex >= 0 ? args[symbolIndex + 1] : null;
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 100;

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI not found in .env file');
    console.warn('⚠️  Using default: mongodb://127.0.0.1:27017/stockcap');
    console.warn('⚠️  If you are using MongoDB Atlas, please set MONGO_URI in .env file');
    console.warn('⚠️  Example: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stockcap\n');
  }
  
  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || undefined,
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('\n❌ Failed to connect to MongoDB!');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check if MONGO_URI is set in .env file');
    console.error('2. For MongoDB Atlas: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stockcap');
    console.error('3. For local MongoDB: Make sure MongoDB is running (mongod)');
    console.error('4. Check your network connection and firewall settings\n');
    process.exit(1);
  }

  try {
    // Build query
    const query = { status: 'published' };
    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }
    if (!all) {
      query.$or = [
        { embeddingGenerated: { $exists: false } },
        { embeddingGenerated: false },
        { embedding: { $exists: false } }
      ];
    }

    // Find articles
    const articles = await Article.find(query)
      .limit(limit)
      .select('title summary content symbol status');

    console.log(`Found ${articles.length} articles to process`);

    if (articles.length === 0) {
      console.log('No articles to process');
      return;
    }

    // Process articles and collect for batch upsert (best practice)
    let successCount = 0;
    let failCount = 0;
    const articlesForPinecone = []; // Collect articles for batch upsert

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i + 1}/${articles.length}] Processing: ${article.title?.substring(0, 50) || article._id}...`);
      
      const success = await generateArticleEmbedding(article);
      if (success) {
        successCount++;
        
        // Collect article for batch upsert to Pinecone
        if (pineconeService.isAvailable()) {
          const articleDoc = await Article.findById(article._id).select('title summary content symbol publishedAt createdAt embedding');
          if (articleDoc && articleDoc.embedding) {
            articlesForPinecone.push({
              id: articleDoc._id.toString(),
              embedding: articleDoc.embedding,
              metadata: {
                title: articleDoc.title || '',
                symbol: articleDoc.symbol || '',
                summary: articleDoc.summary || '',
                publishedAt: articleDoc.publishedAt || articleDoc.createdAt,
                source: 'Internal'
              }
            });
          }
        }
      } else {
        failCount++;
      }

      // Small delay to avoid overwhelming the system
      if (i < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Batch upsert to Pinecone (best practice: batch up to 1000 vectors)
    if (pineconeService.isAvailable() && articlesForPinecone.length > 0) {
      console.log(`\n📦 Batch upserting ${articlesForPinecone.length} articles to Pinecone...`);
      const batchResult = await pineconeService.batchUpsertArticles(articlesForPinecone);
      console.log(`✅ Pinecone: ${batchResult.success} success, ${batchResult.failed} failed`);
    }

    console.log(`\n✅ Completed: ${successCount} success, ${failCount} failed`);
    
    if (pineconeService.isAvailable()) {
      console.log(`\n✅ Embeddings have been synced to Pinecone (using batch upsert)`);
    } else {
      console.log(`\n⚠️  Pinecone not configured. Set PINECONE_API_KEY in .env to enable vector search.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateArticleEmbedding, generateEmbedding };

