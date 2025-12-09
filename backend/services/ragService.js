/*
  File: services/ragService.js
  Purpose: RAG (Retrieval-Augmented Generation) service
  Handles article embeddings and similarity search
  
  CHANGES (2025-12-06):
  - Initial creation for AI Chatbot enhancement
  - Article embedding and vector similarity search
  - Uses Python script for embedding generation
  
  CHANGES (2025-12-07):
  - Refactored to use Pinecone instead of MongoDB Atlas Vector Search
  - Falls back to brute-force if Pinecone unavailable
*/

const { spawn } = require('child_process');
const path = require('path');
const Article = require('../models/Article');
const pineconeService = require('./pineconeService');

// RAG storage directory
const RAG_STORAGE_DIR = path.join(__dirname, '..', 'rag_storage');
const EMBEDDINGS_DIR = path.join(RAG_STORAGE_DIR, 'embeddings');

/**
 * Search similar articles using Pinecone Vector Search
 * Falls back to brute-force if Pinecone unavailable
 * @param {string} query - Search query
 * @param {Object} options - {symbol, limit, threshold, dataTypes}
 * @param {Array<string>} options.dataTypes - Data types to search: ['article', 'external_news', 'stock_info', 'chat_message']
 * @returns {Promise<Array>} Relevant articles with relevance scores
 */
async function searchSimilarArticles(query, options = {}) {
  const {
    symbol = null,
    limit = 5,
    threshold = 0.5,  // Minimum similarity score
    dataTypes = ['article'] // Default: only search articles
  } = options;
  
  try {
    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      console.error('[RAGService] Failed to generate query embedding');
      return await getRecentArticles(symbol, limit);
    }
    
    // 2. Try Pinecone Vector Search first (if available)
    if (pineconeService.isAvailable()) {
      try {
        const pineconeResults = await searchWithPinecone(queryEmbedding, symbol, limit, threshold, dataTypes);
        if (pineconeResults && pineconeResults.length > 0) {
          console.log(`[RAGService] Pinecone search found ${pineconeResults.length} results (types: ${dataTypes.join(', ')})`);
          return pineconeResults;
        }
      } catch (pineconeError) {
        console.log('[RAGService] Pinecone search failed, falling back to brute-force:', pineconeError.message);
      }
    } else {
      console.log('[RAGService] Pinecone not configured, using brute-force search');
    }
    
    // 3. Fallback: Brute-force similarity search (for local MongoDB or if Pinecone unavailable)
    return await searchWithBruteForce(queryEmbedding, symbol, limit, threshold);
    
  } catch (error) {
    console.error('[RAGService] Error in searchSimilarArticles:', error);
    // Final fallback: return recent articles without similarity scoring
    return await getRecentArticles(symbol, limit);
  }
}

/**
 * Search using Pinecone Vector Database (supports multiple data types)
 * @param {Array<number>} queryEmbedding - Query embedding vector
 * @param {string|null} symbol - Stock symbol filter
 * @param {number} limit - Max results
 * @param {number} threshold - Minimum similarity
 * @param {Array<string>} dataTypes - Data types to search
 * @returns {Promise<Array>} Relevant results with full content from MongoDB
 */
async function searchWithPinecone(queryEmbedding, symbol, limit, threshold, dataTypes = ['article']) {
  try {
    // 1. Query Pinecone for similar vectors (across multiple data types if specified)
    const pineconeMatches = await pineconeService.querySimilarArticles(queryEmbedding, {
      symbol: symbol,
      limit: limit,
      threshold: threshold,
      dataTypes: dataTypes
    });

    if (pineconeMatches.length === 0) {
      return [];
    }

    // 2. Group matches by type
    const articleMatches = pineconeMatches.filter(m => m.type === 'article');
    const externalNewsMatches = pineconeMatches.filter(m => m.type === 'external_news');
    const stockInfoMatches = pineconeMatches.filter(m => m.type === 'stock_info');
    const chatMessageMatches = pineconeMatches.filter(m => m.type === 'chat_message');

    const results = [];

    // 3. Fetch articles from MongoDB (if searching articles)
    if (articleMatches.length > 0) {
      const articleIds = articleMatches.map(match => match.id);
      const articles = await Article.find({
        _id: { $in: articleIds },
        status: 'published'
      })
        .select('title summary content symbol publishedAt source _id')
        .lean();

      const articleMap = new Map(articles.map(a => [a._id.toString(), a]));
      
      for (const match of articleMatches) {
        const article = articleMap.get(match.id);
        if (article) {
          results.push({
            _id: article._id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            symbol: article.symbol,
            publishedAt: article.publishedAt,
            source: article.source || 'Internal',
            relevance_score: match.score,
            type: 'article'
          });
        }
      }
    }

    // 4. Add external news (metadata already in Pinecone, no need to fetch from DB)
    for (const match of externalNewsMatches) {
      results.push({
        _id: match.id,
        title: match.metadata.title || '',
        summary: match.metadata.description || '',
        content: match.metadata.description || '',
        symbol: match.metadata.symbol || '',
        publishedAt: match.metadata.publishedAt ? new Date(match.metadata.publishedAt) : null,
        source: match.metadata.source || 'External',
        url: match.metadata.url || '',
        relevance_score: match.score,
        type: 'external_news'
      });
    }

    // 5. Add stock info (metadata already in Pinecone)
    for (const match of stockInfoMatches) {
      results.push({
        _id: match.id,
        title: match.metadata.name || match.id,
        summary: match.metadata.description || '',
        content: match.metadata.description || '',
        symbol: match.metadata.symbol || match.id,
        sector: match.metadata.sector || '',
        relevance_score: match.score,
        type: 'stock_info'
      });
    }

    // 6. Add chat messages (if needed in future)
    for (const match of chatMessageMatches) {
      results.push({
        _id: match.id,
        title: 'Chat Message',
        summary: match.metadata.content || '',
        content: match.metadata.content || '',
        userId: match.metadata.userId || '',
        timestamp: match.metadata.timestamp ? new Date(match.metadata.timestamp) : null,
        relevance_score: match.score,
        type: 'chat_message'
      });
    }

    // 7. Sort by relevance score (maintain order from Pinecone)
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[RAGService] Error in searchWithPinecone:', error);
    throw error; // Let caller handle fallback
  }
}

/**
 * Fallback: Brute-force similarity search (for local MongoDB or if index not available)
 * @param {Array<number>} queryEmbedding - Query embedding vector
 * @param {string|null} symbol - Stock symbol filter
 * @param {number} limit - Max results
 * @param {number} threshold - Minimum similarity
 * @returns {Promise<Array>} Relevant articles
 */
async function searchWithBruteForce(queryEmbedding, symbol, limit, threshold) {
  // Find articles from database (filter by symbol if provided)
  const articleQuery = { status: 'published', embedding: { $exists: true } };
  if (symbol) {
    articleQuery.symbol = symbol.toUpperCase();
  }
  
  const articles = await Article.find(articleQuery)
    .sort({ publishedAt: -1 })
    .limit(50)  // Limit initial fetch for performance
    .select('title summary content symbol publishedAt source embedding')
    .lean();
  
  if (articles.length === 0) {
    console.log('[RAGService] No articles with embeddings found');
    return [];
  }
  
  // Calculate similarity for each article
  const articlesWithScores = [];
  
  for (const article of articles) {
    if (article.embedding && Array.isArray(article.embedding)) {
      const similarity = cosineSimilarity(queryEmbedding, article.embedding);
      
      if (similarity >= threshold) {
        articlesWithScores.push({
          title: article.title,
          summary: article.summary,
          content: article.content,
          symbol: article.symbol,
          publishedAt: article.publishedAt,
          source: article.source || 'Internal',
          relevance_score: similarity
        });
      }
    }
  }
  
  // Sort by relevance and limit
  articlesWithScores.sort((a, b) => b.relevance_score - a.relevance_score);
  
  return articlesWithScores.slice(0, limit);
}

/**
 * Generate embedding for text using Python script
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>|null>} Embedding vector or null
 */
function generateEmbedding(text) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '..', 'ai_scripts', 'embed_text.py');
    const pythonProcess = spawn('python', [pythonScriptPath, text]);
    
    let embeddingResult = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      embeddingResult += data.toString().trim();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[RAGService] Embedding script exited with code ${code}. Error: ${errorOutput}`);
        return resolve(null);
      }
      
      try {
        const embedding = JSON.parse(embeddingResult);
        if (Array.isArray(embedding)) {
          resolve(embedding);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error('[RAGService] Failed to parse embedding:', embeddingResult);
        resolve(null);
      }
    });
    
    pythonProcess.on('error', (err) => {
      console.error('[RAGService] Failed to start embedding Python subprocess:', err);
      resolve(null);
    });
  });
}

/**
 * Get article embedding (from MongoDB or generate new)
 * @param {Object} article - Article object
 * @returns {Promise<Array<number>|null>} Embedding vector or null
 */
async function getArticleEmbedding(article) {
  // If article has embedding in DB, use it
  if (article.embedding && Array.isArray(article.embedding) && article.embedding.length === 384) {
    return article.embedding;
  }
  
  // Otherwise, generate on-the-fly (should be rare if embeddings are pre-generated)
  const textToEmbed = `${article.title || ''} ${article.summary || ''} ${article.content || ''}`.trim();
  
  if (!textToEmbed) {
    return null;
  }
  
  return await generateEmbedding(textToEmbed);
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }
  
  return dotProduct / denominator;
}

/**
 * Get recent articles (fallback when RAG fails)
 * @param {string|null} symbol - Stock symbol filter
 * @param {number} limit - Number of articles
 * @returns {Promise<Array>} Recent articles
 */
async function getRecentArticles(symbol = null, limit = 5) {
  try {
    const query = { status: 'published' };
    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }
    
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('title summary content symbol publishedAt source')
      .lean();
    
    return articles.map(article => ({
      ...article,
      relevance_score: 0.5  // Default relevance for fallback
    }));
  } catch (error) {
    console.error('[RAGService] Error in getRecentArticles:', error);
    return [];
  }
}

/**
 * Embed a single article (for batch processing)
 * @param {string} articleId - Article ID
 * @returns {Promise<boolean>} Success status
 */
async function embedArticle(articleId) {
  try {
    const article = await Article.findById(articleId);
    if (!article || article.status !== 'published') {
      return false;
    }
    
    const textToEmbed = `${article.title || ''} ${article.summary || ''} ${article.content || ''}`.trim();
    if (!textToEmbed) {
      return false;
    }
    
    const embedding = await generateEmbedding(textToEmbed);
    if (!embedding) {
      return false;
    }
    
    // TODO: Store embedding in MongoDB or file system
    // For MVP: Embeddings are generated on-the-fly
    
    return true;
  } catch (error) {
    console.error('[RAGService] Error embedding article:', error);
    return false;
  }
}

module.exports = {
  searchSimilarArticles,
  generateEmbedding,
  embedArticle,
  getRecentArticles
};

