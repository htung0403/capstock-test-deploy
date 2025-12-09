/*
  File: services/cacheService.js
  Purpose: In-memory caching layer for AI responses and intent detection
  Reduces API calls by caching results with TTL
  
  CHANGES (2025-12-07):
  - Initial creation for quota optimization
  - Caches intent detection results (5 min TTL)
  - Caches LLM responses (10 min TTL)
  - Keyed by message hash for deduplication
*/

const crypto = require('crypto');

// In-memory cache stores
const intentCache = new Map();
const responseCache = new Map();

// Cache TTLs (in milliseconds)
const INTENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const RESPONSE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generate cache key from message and optional context
 * @param {string} message - User message
 * @param {string} context - Optional context
 * @returns {string} Cache key (hash)
 */
function generateCacheKey(message, context = '') {
  const combined = `${message.trim().toLowerCase()}:${context}`;
  return crypto.createHash('md5').update(combined).digest('hex');
}

/**
 * Get cached intent detection result
 * @param {string} message - User message
 * @returns {Object|null} Cached intent result or null
 */
function getCachedIntent(message) {
  const key = generateCacheKey(message);
  const cached = intentCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    intentCache.delete(key);
    return null;
  }
  
  console.log(`[CacheService] Intent cache HIT for: ${message.substring(0, 50)}...`);
  return cached.data;
}

/**
 * Cache intent detection result
 * @param {string} message - User message
 * @param {Object} intentResult - Intent detection result
 */
function setCachedIntent(message, intentResult) {
  const key = generateCacheKey(message);
  intentCache.set(key, {
    data: intentResult,
    expiresAt: Date.now() + INTENT_CACHE_TTL
  });
  console.log(`[CacheService] Intent cached for: ${message.substring(0, 50)}...`);
}

/**
 * Get cached LLM response
 * @param {string} message - User message
 * @param {string} context - Context string
 * @returns {string|null} Cached response or null
 */
function getCachedResponse(message, context = '') {
  const key = generateCacheKey(message, context);
  const cached = responseCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  
  console.log(`[CacheService] Response cache HIT for: ${message.substring(0, 50)}...`);
  return cached.data;
}

/**
 * Cache LLM response
 * @param {string} message - User message
 * @param {string} context - Context string
 * @param {string} response - LLM response
 */
function setCachedResponse(message, context = '', response) {
  const key = generateCacheKey(message, context);
  responseCache.set(key, {
    data: response,
    expiresAt: Date.now() + RESPONSE_CACHE_TTL
  });
  console.log(`[CacheService] Response cached for: ${message.substring(0, 50)}...`);
}

/**
 * Clear expired cache entries (should be called periodically)
 */
function clearExpiredCache() {
  const now = Date.now();
  let intentCleared = 0;
  let responseCleared = 0;
  
  // Clear expired intent cache
  for (const [key, value] of intentCache.entries()) {
    if (now > value.expiresAt) {
      intentCache.delete(key);
      intentCleared++;
    }
  }
  
  // Clear expired response cache
  for (const [key, value] of responseCache.entries()) {
    if (now > value.expiresAt) {
      responseCache.delete(key);
      responseCleared++;
    }
  }
  
  if (intentCleared > 0 || responseCleared > 0) {
    console.log(`[CacheService] Cleared ${intentCleared} intent cache entries, ${responseCleared} response cache entries`);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  return {
    intentCacheSize: intentCache.size,
    responseCacheSize: responseCache.size,
    intentCacheTTL: INTENT_CACHE_TTL,
    responseCacheTTL: RESPONSE_CACHE_TTL
  };
}

/**
 * Clear all caches (for testing or manual reset)
 */
function clearAllCache() {
  intentCache.clear();
  responseCache.clear();
  console.log('[CacheService] All caches cleared');
}

// Auto-cleanup expired cache every 5 minutes
setInterval(clearExpiredCache, 5 * 60 * 1000);

module.exports = {
  getCachedIntent,
  setCachedIntent,
  getCachedResponse,
  setCachedResponse,
  clearExpiredCache,
  getCacheStats,
  clearAllCache
};

