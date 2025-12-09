/*
  File: services/pineconeService.js
  Purpose: Pinecone vector database service for RAG
  Handles upserting and querying article embeddings in Pinecone
  
  CHANGES (2025-12-07):
  - Initial creation to replace MongoDB Atlas Vector Search
  - Uses Pinecone Free Tier for vector search
  
  CHANGES (2025-12-07 - Best Practices):
  - Added namespace support (following AGENTS.md best practices)
  - Added batch upsert (max 1000 vectors per batch)
  - Added exponential backoff retry for 429/5xx errors
  - Improved error handling
  - Support for multiple data types (articles, external_news, stock_info, chat_history)
*/

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

// Pinecone configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'articles-index';

// Namespaces for different data types (best practice: use namespaces for data isolation)
const NAMESPACES = {
  ARTICLES: process.env.PINECONE_NAMESPACE_ARTICLES || 'articles',
  EXTERNAL_NEWS: process.env.PINECONE_NAMESPACE_EXTERNAL_NEWS || 'external_news',
  STOCK_INFO: process.env.PINECONE_NAMESPACE_STOCK_INFO || 'stock_info',
  CHAT_HISTORY: process.env.PINECONE_NAMESPACE_CHAT_HISTORY || 'chat_history',
  TRAINING_DATA: process.env.PINECONE_NAMESPACE_TRAINING_DATA || 'training_data'
};

// Default namespace (for backward compatibility)
const PINECONE_NAMESPACE = NAMESPACES.ARTICLES;

// Batch limits (from AGENTS.md)
const MAX_VECTOR_BATCH_SIZE = 1000; // Max vectors per batch
const MAX_BATCH_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per batch

// Initialize Pinecone client
let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone client and index
 * @returns {Promise<Object>} Pinecone index instance
 */
async function initializePinecone() {
  if (!PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is required in .env file');
  }

  if (pineconeIndex) {
    return pineconeIndex; // Already initialized
  }

  try {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY
    });

    // Get or create index
    pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
    
    console.log(`[PineconeService] Initialized index: ${PINECONE_INDEX_NAME}`);
    return pineconeIndex;
  } catch (error) {
    console.error('[PineconeService] Failed to initialize Pinecone:', error);
    throw error;
  }
}

/**
 * Exponential backoff retry for Pinecone operations
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>} Operation result
 */
async function exponentialBackoffRetry(operation, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const statusCode = error.status || error.response?.status || error.code;
      
      // Only retry on 429 (rate limit) or 5xx (server errors)
      if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
        if (attempt < maxRetries - 1) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 60000); // Cap at 60s
          console.warn(`[PineconeService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Don't retry client errors (4xx except 429)
      throw error;
    }
  }
}

/**
 * Upsert a single article embedding into Pinecone
 * @param {string} articleId - Article MongoDB _id as string
 * @param {Array<number>} embedding - Embedding vector (384 dimensions)
 * @param {Object} metadata - Article metadata {title, symbol, summary, publishedAt}
 * @param {string} namespace - Namespace (default: PINECONE_NAMESPACE)
 * @returns {Promise<boolean>} Success status
 */
async function upsertArticle(articleId, embedding, metadata = {}, namespace = PINECONE_NAMESPACE) {
  try {
    const index = await initializePinecone();

    // Prepare metadata (Pinecone metadata must be string, number, boolean, or array - flat structure only)
    const pineconeMetadata = {
      title: (metadata.title || '').substring(0, 1000), // Limit length
      symbol: metadata.symbol || '',
      summary: (metadata.summary || '').substring(0, 1000), // Limit length
      publishedAt: metadata.publishedAt ? new Date(metadata.publishedAt).toISOString() : '',
      source: metadata.source || 'Internal',
      type: 'article' // Data type identifier
    };

    // Upsert vector with namespace (best practice: always use namespaces)
    // Node.js SDK: namespace is passed as second parameter or via namespace() method
    await exponentialBackoffRetry(async () => {
      const namespaceIndex = namespace ? index.namespace(namespace) : index;
      await namespaceIndex.upsert([
        {
          id: articleId.toString(),
          values: embedding,
          metadata: pineconeMetadata
        }
      ]);
    });

    return true;
  } catch (error) {
    console.error(`[PineconeService] Failed to upsert article ${articleId}:`, error.message);
    return false;
  }
}

/**
 * Upsert external news (from NewsAPI) into Pinecone
 * @param {string} newsId - Unique news ID (e.g., URL hash or external ID)
 * @param {Array<number>} embedding - Embedding vector
 * @param {Object} metadata - News metadata {title, symbol, description, url, source, publishedAt}
 * @returns {Promise<boolean>} Success status
 */
async function upsertExternalNews(newsId, embedding, metadata = {}) {
  try {
    const index = await initializePinecone();
    const namespace = NAMESPACES.EXTERNAL_NEWS;

    const pineconeMetadata = {
      title: (metadata.title || '').substring(0, 1000),
      symbol: metadata.symbol || '',
      description: (metadata.description || '').substring(0, 1000),
      url: metadata.url || '',
      source: metadata.source || 'External',
      publishedAt: metadata.publishedAt ? new Date(metadata.publishedAt).toISOString() : '',
      type: 'external_news'
    };

    await exponentialBackoffRetry(async () => {
      const namespaceIndex = index.namespace(namespace);
      await namespaceIndex.upsert([
        {
          id: newsId,
          values: embedding,
          metadata: pineconeMetadata
        }
      ]);
    });

    return true;
  } catch (error) {
    console.error(`[PineconeService] Failed to upsert external news ${newsId}:`, error.message);
    return false;
  }
}

/**
 * Upsert stock information/description into Pinecone
 * @param {string} symbol - Stock symbol
 * @param {Array<number>} embedding - Embedding vector
 * @param {Object} metadata - Stock metadata {name, sector, description}
 * @returns {Promise<boolean>} Success status
 */
async function upsertStockInfo(symbol, embedding, metadata = {}) {
  try {
    const index = await initializePinecone();
    const namespace = NAMESPACES.STOCK_INFO;

    const pineconeMetadata = {
      symbol: symbol.toUpperCase(),
      name: (metadata.name || '').substring(0, 500),
      sector: metadata.sector || '',
      description: (metadata.description || '').substring(0, 1000),
      type: 'stock_info'
    };

    await exponentialBackoffRetry(async () => {
      const namespaceIndex = index.namespace(namespace);
      await namespaceIndex.upsert([
        {
          id: symbol.toUpperCase(),
          values: embedding,
          metadata: pineconeMetadata
        }
      ]);
    });

    return true;
  } catch (error) {
    console.error(`[PineconeService] Failed to upsert stock info ${symbol}:`, error.message);
    return false;
  }
}

/**
 * Upsert chat history message into Pinecone (for searching past conversations)
 * @param {string} messageId - Message ID (e.g., chat session ID + message index)
 * @param {Array<number>} embedding - Embedding vector
 * @param {Object} metadata - Message metadata {userId, sessionId, role, content, timestamp}
 * @returns {Promise<boolean>} Success status
 */
async function upsertChatMessage(messageId, embedding, metadata = {}) {
  try {
    const index = await initializePinecone();
    const namespace = NAMESPACES.CHAT_HISTORY;

    const pineconeMetadata = {
      userId: metadata.userId?.toString() || '',
      sessionId: metadata.sessionId?.toString() || '',
      role: metadata.role || 'user', // 'user' or 'assistant'
      content: (metadata.content || '').substring(0, 1000),
      timestamp: metadata.timestamp ? new Date(metadata.timestamp).toISOString() : new Date().toISOString(),
      type: 'chat_message'
    };

    await exponentialBackoffRetry(async () => {
      const namespaceIndex = index.namespace(namespace);
      await namespaceIndex.upsert([
        {
          id: messageId,
          values: embedding,
          metadata: pineconeMetadata
        }
      ]);
    });

    return true;
  } catch (error) {
    console.error(`[PineconeService] Failed to upsert chat message ${messageId}:`, error.message);
    return false;
  }
}

/**
 * Batch upsert multiple article embeddings (best practice: batch up to 1000 vectors)
 * @param {Array<Object>} articles - Array of {id, embedding, metadata}
 * @param {string} namespace - Namespace (default: PINECONE_NAMESPACE)
 * @returns {Promise<{success: number, failed: number}>} Upsert results
 */
async function batchUpsertArticles(articles, namespace = PINECONE_NAMESPACE) {
  if (!articles || articles.length === 0) {
    return { success: 0, failed: 0 };
  }

  const index = await initializePinecone();
  let successCount = 0;
  let failedCount = 0;

  // Process in batches (max 1000 vectors per batch - AGENTS.md best practice)
  for (let i = 0; i < articles.length; i += MAX_VECTOR_BATCH_SIZE) {
    const batch = articles.slice(i, i + MAX_VECTOR_BATCH_SIZE);
    
    try {
      // Prepare vectors for batch upsert
      const vectors = batch.map(article => ({
        id: article.id.toString(),
        values: article.embedding,
        metadata: {
          title: (article.metadata?.title || '').substring(0, 1000),
          symbol: article.metadata?.symbol || '',
          summary: (article.metadata?.summary || '').substring(0, 1000),
          publishedAt: article.metadata?.publishedAt ? new Date(article.metadata.publishedAt).toISOString() : '',
          source: article.metadata?.source || 'Internal',
          type: 'article'
        }
      }));

      // Batch upsert with exponential backoff retry (best practice: batch up to 1000)
      await exponentialBackoffRetry(async () => {
        const namespaceIndex = namespace ? index.namespace(namespace) : index;
        await namespaceIndex.upsert(vectors);
      });

      successCount += batch.length;
      console.log(`[PineconeService] Batch upserted ${batch.length} articles (${i + 1}-${i + batch.length}/${articles.length})`);
      
      // Small delay between batches to avoid rate limiting
      if (i + MAX_VECTOR_BATCH_SIZE < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[PineconeService] Batch upsert failed for batch ${i}-${i + batch.length}:`, error.message);
      failedCount += batch.length;
    }
  }

  return { success: successCount, failed: failedCount };
}

/**
 * Query Pinecone for similar articles (with namespace support)
 * @param {Array<number>} queryEmbedding - Query embedding vector (384 dimensions)
 * @param {Object} options - {symbol, limit, threshold, namespace, dataTypes}
 * @param {Array<string>} options.dataTypes - Array of data types to search: ['article', 'external_news', 'stock_info', 'chat_message']
 * @returns {Promise<Array>} Array of {id, score, metadata, namespace}
 */
async function querySimilarArticles(queryEmbedding, options = {}) {
  const {
    symbol = null,
    limit = 5,
    threshold = 0.5,
    namespace = PINECONE_NAMESPACE,
    dataTypes = ['article'] // Default: only search articles
  } = options;

  try {
    const index = await initializePinecone();

    // If multiple data types, search across multiple namespaces
    if (dataTypes.length > 1) {
      const allResults = [];
      
      for (const dataType of dataTypes) {
        let searchNamespace;
        switch (dataType) {
          case 'article':
            searchNamespace = NAMESPACES.ARTICLES;
            break;
          case 'external_news':
            searchNamespace = NAMESPACES.EXTERNAL_NEWS;
            break;
          case 'stock_info':
            searchNamespace = NAMESPACES.STOCK_INFO;
            break;
          case 'chat_message':
            searchNamespace = NAMESPACES.CHAT_HISTORY;
            break;
          default:
            continue;
        }

        // Build filter for symbol if provided
        const filter = symbol ? { symbol: { $eq: symbol.toUpperCase() } } : undefined;

        try {
          const queryResponse = await exponentialBackoffRetry(async () => {
            const namespaceIndex = index.namespace(searchNamespace);
            return await namespaceIndex.query({
              vector: queryEmbedding,
              topK: Math.ceil(limit / dataTypes.length) + 2, // Distribute limit across types
              includeMetadata: true,
              filter: filter
            });
          });

          // Add namespace info to results
          const typedResults = queryResponse.matches
            .filter(match => match.score >= threshold)
            .map(match => ({
              id: match.id,
              score: match.score,
              metadata: match.metadata || {},
              namespace: searchNamespace,
              type: dataType
            }));

          allResults.push(...typedResults);
        } catch (error) {
          console.warn(`[PineconeService] Failed to query namespace ${searchNamespace}:`, error.message);
        }
      }

      // Sort by score and limit
      allResults.sort((a, b) => b.score - a.score);
      return allResults.slice(0, limit);
    }

    // Single namespace search (original behavior)
    const filter = symbol ? { symbol: { $eq: symbol.toUpperCase() } } : undefined;

    // Query Pinecone with namespace and exponential backoff retry
    const queryResponse = await exponentialBackoffRetry(async () => {
      const namespaceIndex = namespace ? index.namespace(namespace) : index;
      return await namespaceIndex.query({
        vector: queryEmbedding,
        topK: limit * 2, // Query more to filter by threshold
        includeMetadata: true,
        filter: filter
      });
    });

    // Filter by threshold and map results
    const results = queryResponse.matches
      .filter(match => match.score >= threshold)
      .slice(0, limit)
      .map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata || {},
        namespace: namespace,
        type: match.metadata?.type || 'article'
      }));

    return results;
  } catch (error) {
    console.error('[PineconeService] Failed to query Pinecone:', error.message);
    return [];
  }
}

/**
 * Delete article from Pinecone (with namespace support)
 * @param {string} articleId - Article MongoDB _id
 * @param {string} namespace - Namespace (default: PINECONE_NAMESPACE)
 * @returns {Promise<boolean>} Success status
 */
async function deleteArticle(articleId, namespace = PINECONE_NAMESPACE) {
  try {
    const index = await initializePinecone();
    await exponentialBackoffRetry(async () => {
      const namespaceIndex = namespace ? index.namespace(namespace) : index;
      await namespaceIndex.deleteOne(articleId.toString());
    });
    return true;
  } catch (error) {
    console.error(`[PineconeService] Failed to delete article ${articleId}:`, error.message);
    return false;
  }
}

/**
 * Check if Pinecone is available
 * @returns {boolean} True if Pinecone is configured
 */
function isAvailable() {
  return !!PINECONE_API_KEY;
}

module.exports = {
  initializePinecone,
  upsertArticle,
  upsertExternalNews, // New: for external news
  upsertStockInfo, // New: for stock descriptions
  upsertChatMessage, // New: for chat history
  batchUpsertArticles,
  querySimilarArticles,
  deleteArticle,
  isAvailable,
  PINECONE_NAMESPACE, // Export namespace constant
  NAMESPACES // Export all namespaces
};
