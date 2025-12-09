/*
  File: services/quotaCircuitBreaker.js
  Purpose: Circuit breaker pattern to prevent API calls when quota is exhausted
  Prevents wasted API calls and improves user experience during quota errors
  
  CHANGES (2025-12-07):
  - Initial creation for quota management
  - Implements circuit breaker pattern to temporarily disable LLM calls
*/

const aiMonitoringService = require('./aiMonitoringService');

// Circuit breaker state
let circuitState = {
  isOpen: false, // Circuit is closed (normal operation)
  openedAt: null,
  consecutiveFailures: 0,
  lastFailureTime: null
};

// Configuration
const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 2, // Open circuit after 2 consecutive quota errors
  RESET_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes before trying again
  CHECK_INTERVAL_MS: 5 * 60 * 1000 // Check every 5 minutes
};

/**
 * Check if circuit breaker should be opened (quota exhausted)
 * @returns {boolean} True if circuit should be open
 */
function shouldOpenCircuit() {
  const stats = aiMonitoringService.getDailyStats();
  
  // Open circuit if quota errors detected
  if (stats.quotaErrors > 0 && !circuitState.isOpen) {
    console.warn(`[CircuitBreaker] Opening circuit - quota errors detected: ${stats.quotaErrors}`);
    circuitState.isOpen = true;
    circuitState.openedAt = Date.now();
    circuitState.consecutiveFailures = stats.quotaErrors;
    return true;
  }
  
  return false;
}

/**
 * Check if circuit breaker should be closed (quota restored or timeout passed)
 * @returns {boolean} True if circuit should be closed
 */
function shouldCloseCircuit() {
  if (!circuitState.isOpen) {
    return false; // Already closed
  }
  
  // Check if reset timeout has passed
  const timeSinceOpened = Date.now() - circuitState.openedAt;
  if (timeSinceOpened >= CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS) {
    console.log(`[CircuitBreaker] Attempting to close circuit - timeout passed (${Math.round(timeSinceOpened / 1000 / 60)} minutes)`);
    
    // Check if quota errors are still present
    const stats = aiMonitoringService.getDailyStats();
    if (stats.quotaErrors === 0) {
      console.log(`[CircuitBreaker] Closing circuit - no quota errors detected`);
      circuitState.isOpen = false;
      circuitState.openedAt = null;
      circuitState.consecutiveFailures = 0;
      return true;
    }
  }
  
  return false;
}

/**
 * Record a quota error and potentially open circuit
 */
function recordQuotaError() {
  circuitState.consecutiveFailures++;
  circuitState.lastFailureTime = Date.now();
  
  if (circuitState.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
    shouldOpenCircuit();
  }
}

/**
 * Check if circuit is open (should block API calls)
 * @returns {boolean} True if circuit is open
 */
function isCircuitOpen() {
  // Auto-check and update circuit state
  shouldOpenCircuit();
  shouldCloseCircuit();
  
  return circuitState.isOpen;
}

/**
 * Get circuit breaker status
 * @returns {Object} Circuit state
 */
function getCircuitStatus() {
  const stats = aiMonitoringService.getDailyStats();
  const isOpen = isCircuitOpen();
  
  return {
    isOpen: isOpen,
    openedAt: circuitState.openedAt,
    timeSinceOpened: circuitState.openedAt ? Date.now() - circuitState.openedAt : 0,
    consecutiveFailures: circuitState.consecutiveFailures,
    quotaErrors: stats.quotaErrors,
    resetTimeoutMs: CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS,
    estimatedResetTime: circuitState.openedAt 
      ? new Date(circuitState.openedAt + CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS).toISOString()
      : null
  };
}

/**
 * Reset circuit breaker (manual reset, e.g., after quota is restored)
 */
function resetCircuit() {
  console.log('[CircuitBreaker] Manually resetting circuit breaker');
  circuitState.isOpen = false;
  circuitState.openedAt = null;
  circuitState.consecutiveFailures = 0;
  circuitState.lastFailureTime = null;
}

// Periodic check to auto-close circuit
setInterval(() => {
  if (circuitState.isOpen) {
    shouldCloseCircuit();
  }
}, CIRCUIT_BREAKER_CONFIG.CHECK_INTERVAL_MS);

module.exports = {
  isCircuitOpen,
  recordQuotaError,
  getCircuitStatus,
  resetCircuit,
  shouldOpenCircuit,
  shouldCloseCircuit
};

