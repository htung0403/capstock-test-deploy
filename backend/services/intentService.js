/*
  File: services/intentService.js
  Purpose: Intent detection service for AI chatbot
  Detects user intent from messages using LLM and rule-based fallback
  
  CHANGES (2025-12-06):
  - Initial creation for AI Chatbot enhancement
  - LLM-based intent detection with rule-based fallback
  - Entity extraction (symbol, timeframe, etc.)
*/

const { askAI } = require('./aiService');
const cacheService = require('./cacheService');

// Intent types
const INTENT_TYPES = {
  PRICE_FORECAST: 'price_forecast',
  SENTIMENT: 'sentiment',
  NEWS_SUMMARY: 'news_summary',
  PORTFOLIO_INSIGHT: 'portfolio_insight',
  GENERAL: 'general'
};

// Common stock symbols (for entity extraction)
const COMMON_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'DIS', 'V'];

/**
 * Detect intent from user message
 * @param {string} message - User message
 * @returns {Promise<Object>} {intent, confidence, entities}
 */
async function detectIntent(message) {
  // Check cache first
  const cached = cacheService.getCachedIntent(message);
  if (cached) {
    return cached;
  }
  
  // Note: Circuit breaker removed - Ollama local doesn't have quota limits
  
  try {
    // Try LLM-based detection first (with timeout)
    const llmResult = await Promise.race([
      detectIntentWithLLM(message),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM detection timeout')), 5000)
      )
    ]);
    
    // If confidence is low, try rule-based fallback
    if (llmResult.confidence < 0.7) {
      console.log(`[IntentService] Low LLM confidence (${llmResult.confidence}), trying rule-based fallback`);
      const ruleResult = detectIntentWithRules(message);
      
      // Use rule-based if it has higher confidence
      if (ruleResult.confidence > llmResult.confidence) {
        // Cache rule-based result
        cacheService.setCachedIntent(message, ruleResult);
        return ruleResult;
      }
    }
    
    // Cache LLM result
    cacheService.setCachedIntent(message, llmResult);
    return llmResult;
  } catch (error) {
    // LLM failed or timeout - use rule-based immediately
    console.log(`[IntentService] LLM detection failed (${error.message}), using rule-based fallback`);
    const ruleResult = detectIntentWithRules(message);
    // Cache rule-based result
    cacheService.setCachedIntent(message, ruleResult);
    return ruleResult;
  }
}

/**
 * Detect intent using LLM (Ollama)
 * @param {string} message - User message
 * @returns {Promise<Object>} {intent, confidence, entities}
 */
async function detectIntentWithLLM(message) {
  const prompt = `Analyze this user question and classify the intent. Return ONLY a JSON object with this exact format:
{
  "intent": "price_forecast" | "sentiment" | "news_summary" | "portfolio_insight" | "general",
  "confidence": 0.0-1.0,
  "entities": {
    "symbol": "STOCK_SYMBOL" or null,
    "timeframe": "next_week" | "next_month" | "next_year" | null,
    "action": "forecast" | "analyze" | "summarize" | null
  }
}

User question: "${message}"

JSON response:`;

  try {
    const messages = [
      {
        role: "system",
        content: "You are an intent classification assistant. Analyze user questions and return ONLY valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ];
    const response = await askAI(messages);
    
    // Check if response is an error message (LLM unavailable)
    if (response.includes('⚠️') || response.includes('unavailable') || response.includes('error')) {
      console.log('[IntentService] LLM returned error message, skipping LLM detection');
      throw new Error('LLM unavailable - will use rule-based fallback');
    }
    
    // Try to parse JSON from response
    let intentResult;
    try {
      // Extract JSON from response (might have extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intentResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[IntentService] Failed to parse LLM response:', response);
      throw new Error('LLM response parsing failed - will use rule-based fallback');
    }
    
    // Validate intent type
    if (!Object.values(INTENT_TYPES).includes(intentResult.intent)) {
      intentResult.intent = INTENT_TYPES.GENERAL;
      intentResult.confidence = 0.5;
    }
    
    // Extract symbol from entities or message
    if (!intentResult.entities?.symbol) {
      intentResult.entities = intentResult.entities || {};
      intentResult.entities.symbol = extractSymbol(message);
    }
    
    return {
      intent: intentResult.intent,
      confidence: Math.min(1.0, Math.max(0.0, intentResult.confidence || 0.5)),
      entities: intentResult.entities || {}
    };
  } catch (error) {
    console.error('[IntentService] LLM detection failed:', error);
    throw error;
  }
}

/**
 * Detect intent using rule-based patterns
 * @param {string} message - User message
 * @returns {Object} {intent, confidence, entities}
 */
function detectIntentWithRules(message) {
  const lowerMessage = message.toLowerCase();
  
  // Price forecast patterns
  const priceForecastPatterns = [
    /price forecast|predict.*price|price prediction|future price|price will|price target|expected price/i,
    /what.*price|how much.*price|price.*next|price.*tomorrow|price.*week|price.*month/i
  ];
  
  // Sentiment patterns
  const sentimentPatterns = [
    /sentiment|feeling|mood|opinion.*stock|how.*feel|what.*think.*stock/i,
    /positive|negative|bullish|bearish/i
  ];
  
  // News summary patterns
  const newsPatterns = [
    /news|article|latest.*about|recent.*news|what.*happening|update.*stock/i,
    /summarize.*news|news.*summary|recent.*article/i
  ];
  
  // Portfolio patterns
  const portfolioPatterns = [
    /portfolio|my.*stocks|my.*holdings|my.*investments|how.*portfolio/i,
    /portfolio.*performance|portfolio.*doing|portfolio.*value/i
  ];
  
  // Check patterns
  if (priceForecastPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: INTENT_TYPES.PRICE_FORECAST,
      confidence: 0.8,
      entities: {
        symbol: extractSymbol(message),
        timeframe: extractTimeframe(message),
        action: 'forecast'
      }
    };
  }
  
  if (sentimentPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: INTENT_TYPES.SENTIMENT,
      confidence: 0.8,
      entities: {
        symbol: extractSymbol(message),
        action: 'analyze'
      }
    };
  }
  
  if (newsPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: INTENT_TYPES.NEWS_SUMMARY,
      confidence: 0.8,
      entities: {
        symbol: extractSymbol(message),
        action: 'summarize'
      }
    };
  }
  
  if (portfolioPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: INTENT_TYPES.PORTFOLIO_INSIGHT,
      confidence: 0.8,
      entities: {}
    };
  }
  
  // Default to general
  return {
    intent: INTENT_TYPES.GENERAL,
    confidence: 0.5,
    entities: {
      symbol: extractSymbol(message)
    }
  };
}

/**
 * Extract stock symbol from message
 * @param {string} message - User message
 * @returns {string|null} Stock symbol or null
 */
function extractSymbol(message) {
  // Look for common symbols
  const upperMessage = message.toUpperCase();
  for (const symbol of COMMON_SYMBOLS) {
    if (upperMessage.includes(symbol)) {
      return symbol;
    }
  }
  
  // Look for pattern like "AAPL" or "$AAPL"
  const symbolMatch = message.match(/\$?([A-Z]{2,5})\b/);
  if (symbolMatch && symbolMatch[1].length >= 2 && symbolMatch[1].length <= 5) {
    return symbolMatch[1].toUpperCase();
  }
  
  return null;
}

/**
 * Extract timeframe from message
 * @param {string} message - User message
 * @returns {string|null} Timeframe or null
 */
function extractTimeframe(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('next week') || lowerMessage.includes('this week')) {
    return 'next_week';
  }
  if (lowerMessage.includes('next month') || lowerMessage.includes('this month')) {
    return 'next_month';
  }
  if (lowerMessage.includes('next year') || lowerMessage.includes('this year')) {
    return 'next_year';
  }
  if (lowerMessage.includes('tomorrow') || lowerMessage.includes('next day')) {
    return 'next_day';
  }
  
  return null;
}

// Export rule-based detection for fallback
module.exports = {
  detectIntent,
  detectIntentWithRules,
  INTENT_TYPES
};

