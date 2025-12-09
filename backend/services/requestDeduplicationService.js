/*
  File: services/requestDeduplicationService.js
  Purpose: Prevent duplicate requests within a short time window
  Reduces API calls by detecting and caching identical requests
  
  CHANGES (2025-12-07):
  - Initial creation for quota optimization
  - Detects duplicate requests within 5 seconds
  - Returns cached response for duplicates
*/

const crypto = require('crypto');

// Store recent requests with their responses
const recentRequests = new Map();

// Deduplication window (5 seconds)
const DEDUP_WINDOW_MS = 5000;

/**
 * Generate request hash from message and context
 * @param {string} message - User message
 * @param {string} context - Optional context
 * @returns {string} Request hash
 */
function generateRequestHash(message, context = '') {
  const combined = `${message.trim().toLowerCase()}:${context}`;
  return crypto.createHash('md5').update(combined).digest('hex');
}

/**
 * Check if request is a duplicate and return cached response if available
 * @param {string} message - User message
 * @param {string} context - Optional context
 * @returns {Object|null} {isDuplicate: boolean, cachedResponse: any} or null if not duplicate
 */
function checkDuplicate(message, context = '') {
  const hash = generateRequestHash(message, context);
  const cached = recentRequests.get(hash);
  
  if (!cached) {
    return null; // Not a duplicate
  }
  
  // Check if within deduplication window
  const age = Date.now() - cached.timestamp;
  if (age > DEDUP_WINDOW_MS) {
    // Expired, remove from cache
    recentRequests.delete(hash);
    return null;
  }
  
  console.log(`[RequestDeduplication] Duplicate request detected (${age}ms ago), returning cached response`);
  return {
    isDuplicate: true,
    cachedResponse: cached.response
  };
}

/**
 * Store request and response for deduplication
 * @param {string} message - User message
 * @param {string} context - Optional context
 * @param {any} response - Response to cache
 */
function storeRequest(message, context = '', response) {
  const hash = generateRequestHash(message, context);
  recentRequests.set(hash, {
    response: response,
    timestamp: Date.now()
  });
  
  // Auto-cleanup: Remove expired entries periodically
  setTimeout(() => {
    const cached = recentRequests.get(hash);
    if (cached && Date.now() - cached.timestamp > DEDUP_WINDOW_MS) {
      recentRequests.delete(hash);
    }
  }, DEDUP_WINDOW_MS + 1000); // Cleanup 1 second after expiration
}

/**
 * Clear all stored requests (for testing or manual reset)
 */
function clearAll() {
  recentRequests.clear();
  console.log('[RequestDeduplication] All stored requests cleared');
}

/**
 * Get statistics
 * @returns {Object} Stats
 */
function getStats() {
  return {
    storedRequests: recentRequests.size,
    dedupWindowMs: DEDUP_WINDOW_MS
  };
}

module.exports = {
  checkDuplicate,
  storeRequest,
  clearAll,
  getStats
};

