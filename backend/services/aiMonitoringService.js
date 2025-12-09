/*
  File: services/aiMonitoringService.js
  Purpose: Monitor and log Gemini API usage for quota tracking
  Tracks API calls, tokens, errors, and quota status
  
  CHANGES (2025-12-07):
  - Initial creation for quota monitoring
  - Logs all Gemini API calls
  - Tracks daily usage
  - Alerts on quota exhaustion
*/

// In-memory tracking (in production, use Redis or database)
const dailyStats = {
  date: new Date().toISOString().split('T')[0],
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  quotaErrors: 0,
  totalTokens: 0,
  modelsUsed: {},
  lastReset: Date.now()
};

// Reset daily stats at midnight
function resetDailyStats() {
  const today = new Date().toISOString().split('T')[0];
  if (dailyStats.date !== today) {
    console.log(`[AIMonitoring] Resetting daily stats. Previous day: ${dailyStats.totalCalls} calls`);
    dailyStats.date = today;
    dailyStats.totalCalls = 0;
    dailyStats.successfulCalls = 0;
    dailyStats.failedCalls = 0;
    dailyStats.quotaErrors = 0;
    dailyStats.totalTokens = 0;
    dailyStats.modelsUsed = {};
    dailyStats.lastReset = Date.now();
  }
}

/**
 * Log an API call
 * @param {string} model - Model name used
 * @param {boolean} success - Whether call was successful
 * @param {number} tokens - Estimated token count (optional)
 * @param {string} error - Error message if failed (optional)
 */
function logAPICall(model, success, tokens = 0, error = null) {
  resetDailyStats();
  
  dailyStats.totalCalls++;
  
  if (success) {
    dailyStats.successfulCalls++;
    dailyStats.modelsUsed[model] = (dailyStats.modelsUsed[model] || 0) + 1;
    dailyStats.totalTokens += tokens;
  } else {
    dailyStats.failedCalls++;
    
    // Check if quota error
    if (error && (error.includes('429') || error.includes('quota') || error.includes('RESOURCE_EXHAUSTED'))) {
      dailyStats.quotaErrors++;
      console.warn(`[AIMonitoring] ⚠️ QUOTA ERROR detected! Total quota errors today: ${dailyStats.quotaErrors}`);
    }
  }
  
  // Log every 10 calls for visibility
  if (dailyStats.totalCalls % 10 === 0) {
    console.log(`[AIMonitoring] Daily stats: ${dailyStats.totalCalls} calls (${dailyStats.successfulCalls} success, ${dailyStats.failedCalls} failed, ${dailyStats.quotaErrors} quota errors)`);
  }
}

/**
 * Get current daily statistics
 * @returns {Object} Daily stats
 */
function getDailyStats() {
  resetDailyStats();
  return {
    ...dailyStats,
    quotaWarning: dailyStats.quotaErrors > 0,
    estimatedQuotaRemaining: dailyStats.quotaErrors > 0 ? 'LOW' : 'UNKNOWN'
  };
}

/**
 * Check if quota is likely exhausted
 * @returns {boolean} True if quota errors detected
 */
function isQuotaExhausted() {
  resetDailyStats();
  return dailyStats.quotaErrors > 0;
}

/**
 * Get quota health status
 * @returns {string} Health status
 */
function getQuotaHealth() {
  resetDailyStats();
  
  if (dailyStats.quotaErrors > 0) {
    return 'EXHAUSTED';
  }
  
  if (dailyStats.totalCalls > 100) {
    return 'HIGH_USAGE';
  }
  
  if (dailyStats.totalCalls > 50) {
    return 'MODERATE_USAGE';
  }
  
  return 'HEALTHY';
}

// Reset stats at midnight
setInterval(resetDailyStats, 60 * 60 * 1000); // Check every hour

module.exports = {
  logAPICall,
  getDailyStats,
  isQuotaExhausted,
  getQuotaHealth
};

