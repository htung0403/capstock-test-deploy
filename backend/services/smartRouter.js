/*
  File: services/smartRouter.js
  Purpose: Smart routing to avoid unnecessary data fetching
  Only fetches data when actually needed based on intent and message complexity
  
  CHANGES (2025-12-07):
  - Initial creation to optimize data fetching
  - Early exit for simple greetings
  - Lazy loading for data handlers
  - Skip unnecessary RAG/ML calls
*/

/**
 * Check if message is a simple greeting (no data needed)
 * @param {string} message - User message
 * @returns {boolean} True if simple greeting
 */
function isSimpleGreeting(message) {
  const lowerMessage = message.toLowerCase().trim();
  const greetings = [
    'chào', 'hello', 'hi', 'hey', 'xin chào', 'chào bạn',
    'good morning', 'good afternoon', 'good evening',
    'bonjour', 'hola', 'ciao'
  ];
  
  // Check if message is just a greeting (no other content)
  const isOnlyGreeting = greetings.some(greeting => 
    lowerMessage === greeting || 
    lowerMessage.startsWith(greeting + ' ') ||
    lowerMessage === greeting + '!'
  );
  
  // Also check for very short messages (< 20 chars) that are likely greetings
  const isShortGreeting = lowerMessage.length < 20 && 
    greetings.some(greeting => lowerMessage.includes(greeting));
  
  return isOnlyGreeting || isShortGreeting;
}

/**
 * Check if message requires data fetching (has stock symbol or specific intent keywords)
 * @param {string} message - User message
 * @param {Object} intentResult - Intent detection result
 * @returns {boolean} True if data fetching is needed
 */
function requiresDataFetching(message, intentResult) {
  const { intent, entities } = intentResult;
  
  // If has symbol, definitely needs data
  if (entities && entities.symbol) {
    return true;
  }
  
  // Check intent types that require data
  const dataRequiredIntents = [
    'price_forecast',
    'sentiment',
    'news_summary',
    'portfolio_insight'
  ];
  
  if (dataRequiredIntents.includes(intent)) {
    return true;
  }
  
  // Check for data-related keywords in message
  const dataKeywords = [
    'price', 'forecast', 'predict', 'sentiment', 'news', 'article',
    'portfolio', 'stock', 'symbol', 'ticker', 'chart', 'analysis'
  ];
  
  const lowerMessage = message.toLowerCase();
  return dataKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Determine if RAG search is needed
 * @param {Object} intentResult - Intent detection result
 * @returns {boolean} True if RAG search is needed
 */
function needsRAGSearch(intentResult) {
  const { intent, entities } = intentResult;
  
  // Only these intents need RAG
  const ragIntents = ['sentiment', 'news_summary'];
  
  if (ragIntents.includes(intent) && entities && entities.symbol) {
    return true;
  }
  
  return false;
}

/**
 * Determine if ML analysis is needed
 * @param {Object} intentResult - Intent detection result
 * @returns {boolean} True if ML analysis is needed
 */
function needsMLAnalysis(intentResult) {
  const { intent, entities } = intentResult;
  
  // Only price_forecast needs ML
  if (intent === 'price_forecast' && entities && entities.symbol) {
    return true;
  }
  
  return false;
}

/**
 * Determine if portfolio data is needed
 * @param {Object} intentResult - Intent detection result
 * @param {Object} context - Context object
 * @returns {boolean} True if portfolio data is needed
 */
function needsPortfolioData(intentResult, context) {
  const { intent } = intentResult;
  
  if (intent === 'portfolio_insight' && context.userId) {
    return true;
  }
  
  return false;
}

/**
 * Get optimized handler requirements
 * @param {string} message - User message
 * @param {Object} intentResult - Intent detection result
 * @param {Object} context - Context object
 * @returns {Object} Requirements object
 */
function getHandlerRequirements(message, intentResult, context) {
  return {
    needsRAG: needsRAGSearch(intentResult),
    needsML: needsMLAnalysis(intentResult),
    needsPortfolio: needsPortfolioData(intentResult, context),
    needsData: requiresDataFetching(message, intentResult),
    isSimpleGreeting: isSimpleGreeting(message)
  };
}

module.exports = {
  isSimpleGreeting,
  requiresDataFetching,
  needsRAGSearch,
  needsMLAnalysis,
  needsPortfolioData,
  getHandlerRequirements
};

