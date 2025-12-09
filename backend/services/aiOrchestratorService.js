/*
  File: services/aiOrchestratorService.js
  Purpose: Main orchestrator service for AI chatbot
  Coordinates intent detection, ML models, RAG, and LLM
  
  CHANGES (2025-12-06):
  - Initial creation for AI Chatbot enhancement
  - Orchestrates intent detection, routing, context building, and LLM generation
*/

const intentService = require('./intentService');
const contextBuilderService = require('./contextBuilderService');
const aiService = require('./aiService');
const ragService = require('./ragService');
const portfolioService = require('./portfolioService');
const cacheService = require('./cacheService');
const { askAI } = require('./aiService');
const StockHistory = require('../models/StockHistory');
const { fetchStockNews } = require('./marketDataService');

/**
 * Main entry point for processing user messages
 * @param {string} message - User message
 * @param {Object} context - Context {userId, stockSymbol, sessionId}
 * @returns {Promise<Object>} Structured response
 */
async function processMessage(message, context = {}) {
  const startTime = Date.now();
  const smartRouter = require('./smartRouter');
  
  try {
    // OPTIMIZATION: Early exit for simple greetings (no LLM, no data fetching)
    if (smartRouter.isSimpleGreeting(message)) {
      console.log('[AIOrchestrator] Simple greeting detected - skipping data fetching and LLM');
      return {
        type: 'general',
        text: getGreetingResponse(message),
        data: null,
        metadata: {
          intent: 'general',
          entities: {},
          processing_time_ms: Date.now() - startTime,
          optimized: true,
          skipped_steps: ['intent_llm', 'data_fetching', 'llm_generation']
        }
      };
    }
    
    // 1. Detect intent (use rule-based for simple messages to save API calls)
    const intentResult = await detectIntentWithTimeout(message, 5000);
    
    // 2. Check if data fetching is actually needed
    const requirements = smartRouter.getHandlerRequirements(message, intentResult, context);
    
    if (!requirements.needsData) {
      console.log('[AIOrchestrator] No data required - using simple response');
      return {
        type: intentResult.intent,
        text: generateSimpleResponse(intentResult, message),
        data: null,
        metadata: {
          intent: intentResult.intent,
          entities: intentResult.entities,
          processing_time_ms: Date.now() - startTime,
          optimized: true,
          skipped_steps: ['data_fetching']
        }
      };
    }
    
    // 3. Route to appropriate handlers (ONLY if needed)
    const handlerResults = await routeToHandlersOptimized(intentResult, context, requirements);
    
    // 4. Build context for LLM (only if we have data)
    let llmContext = '';
    if (Object.keys(handlerResults).length > 0) {
      llmContext = await contextBuilderService.buildLLMContext(handlerResults, intentResult);
    }
    
    // 5. Generate LLM response (with fallback to template-based if LLM fails)
    let llmResponse;
    try {
      // Only call LLM if we have context or it's a complex query
      if (llmContext || message.length > 50) {
        llmResponse = await generateLLMResponseWithTimeout(message, llmContext, 15000);
        
        // If LLM returned null (circuit breaker open), use template-based response
        if (!llmResponse) {
          console.log('[AIOrchestrator] LLM unavailable (circuit breaker), using template-based response');
          llmResponse = generateTemplateResponse(intentResult, handlerResults);
        }
        // Check if LLM returned error message
        else if (llmResponse.includes('⚠️') || llmResponse.includes('unavailable') || llmResponse.includes('quota')) {
          console.log('[AIOrchestrator] LLM unavailable, using template-based response');
          llmResponse = generateTemplateResponse(intentResult, handlerResults);
        }
      } else {
        // Simple query without data - use template response
        llmResponse = generateTemplateResponse(intentResult, handlerResults);
      }
    } catch (error) {
      console.error('[AIOrchestrator] LLM generation failed, using template-based response:', error.message);
      llmResponse = generateTemplateResponse(intentResult, handlerResults);
    }
    
    // 6. Build structured response
    const structuredResponse = buildStructuredResponse(intentResult, handlerResults, llmResponse, startTime);
    
    return structuredResponse;
    
  } catch (error) {
    console.error('[AIOrchestrator] Error processing message:', error);
    
    // Fallback: return general response
    return {
      type: 'general',
      text: "I'm sorry, I'm having trouble processing your request. Please try again or rephrase your question.",
      data: null,
      metadata: {
        intent: 'general',
        entities: {},
        processing_time_ms: Date.now() - startTime,
        error: error.message
      }
    };
  }
}

/**
 * Detect intent with timeout
 * @param {string} message - User message
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Intent result
 */
async function detectIntentWithTimeout(message, timeoutMs) {
  return Promise.race([
    intentService.detectIntent(message),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Intent detection timeout')), timeoutMs)
    )
  ]).catch(() => {
    // Fallback to rule-based
    return intentService.detectIntentWithRules(message);
  });
}

/**
 * Route to appropriate handlers based on intent (OPTIMIZED: only fetch what's needed)
 * @param {Object} intentResult - Intent detection result
 * @param {Object} context - Context object
 * @param {Object} requirements - Smart router requirements
 * @returns {Promise<Object>} Handler results
 */
async function routeToHandlersOptimized(intentResult, context, requirements) {
  const { intent, entities } = intentResult;
  const handlerResults = {};
  
  try {
    switch (intent) {
      case intentService.INTENT_TYPES.PRICE_FORECAST:
        // ONLY fetch if ML analysis is needed
        if (entities.symbol && requirements.needsML) {
          console.log('[AIOrchestrator] Fetching price forecast data...');
          handlerResults.pricePrediction = await handlePriceForecast(entities.symbol);
        }
        break;
        
      case intentService.INTENT_TYPES.SENTIMENT:
        // ONLY fetch if RAG search is needed
        if (entities.symbol && requirements.needsRAG) {
          console.log('[AIOrchestrator] Fetching sentiment data...');
          handlerResults.sentiment = await handleSentiment(entities.symbol);
        }
        break;
        
      case intentService.INTENT_TYPES.NEWS_SUMMARY:
        // ONLY fetch if RAG search is needed
        if (entities.symbol && requirements.needsRAG) {
          console.log('[AIOrchestrator] Fetching news articles...');
          handlerResults.ragArticles = await handleNewsSummary(entities.symbol);
        }
        break;
        
      case intentService.INTENT_TYPES.PORTFOLIO_INSIGHT:
        // ONLY fetch if portfolio data is needed
        if (context.userId && requirements.needsPortfolio) {
          console.log('[AIOrchestrator] Fetching portfolio data...');
          handlerResults.portfolio = await handlePortfolioInsight(context.userId);
        }
        break;
        
      default:
        // For general intent, ONLY fetch if symbol exists AND message requires data
        if (entities.symbol && requirements.needsData) {
          console.log('[AIOrchestrator] Fetching basic stock info...');
          handlerResults.stockHistory = await handleStockHistory(entities.symbol);
        }
    }
  } catch (error) {
    console.error('[AIOrchestrator] Error in routeToHandlersOptimized:', error);
    // Continue with partial results
  }
  
  return handlerResults;
}

/**
 * Route to appropriate handlers based on intent (legacy - for backward compatibility)
 * @param {Object} intentResult - Intent detection result
 * @param {Object} context - Context object
 * @returns {Promise<Object>} Handler results
 */
async function routeToHandlers(intentResult, context) {
  const smartRouter = require('./smartRouter');
  const requirements = smartRouter.getHandlerRequirements('', intentResult, context);
  return routeToHandlersOptimized(intentResult, context, requirements);
}

/**
 * Handle price forecast intent
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Price prediction result
 */
async function handlePriceForecast(symbol) {
  try {
    // OPTIMIZED: Only fetch last 50 records (not 100) for price forecast
    // Fetch historical data (most recent 50 records, then sort chronologically)
    const recentData = await StockHistory.find({ stockSymbol: symbol.toUpperCase() })
      .sort({ timestamp: -1 }) // Get most recent first
      .select('price timestamp -_id')
      .limit(50); // Reduced from 100 to 50
    
    // Reverse to chronological order (oldest to newest) for analysis
    const historyData = recentData.reverse();
    
    if (historyData.length === 0) {
      return null;
    }
    
    const plainHistoryData = historyData.map(doc => ({
      price: doc.price,
      timestamp: doc.timestamp
    }));
    
    // Use enhanced analysis (ML or traditional)
    const priceAnalysis = await aiService.analyzePriceHistoryEnhanced(symbol, plainHistoryData);
    
    return priceAnalysis;
  } catch (error) {
    console.error('[AIOrchestrator] Error in handlePriceForecast:', error);
    return null;
  }
}

/**
 * Handle sentiment analysis intent
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Sentiment result
 */
async function handleSentiment(symbol) {
  try {
    // OPTIMIZED: Only fetch 5 articles (not 10) to reduce data fetching
    // 1. Use RAG to find relevant articles and news (including external news from Pinecone)
    const query = `${symbol} stock news sentiment analysis`;
    const ragResults = await ragService.searchSimilarArticles(query, {
      symbol: symbol,
      limit: 5, // Reduced from 10 to 5
      threshold: 0.3,
      dataTypes: ['article', 'external_news'] // Search articles and external news for sentiment
    });
    
    // 2. Fallback: fetch articles directly if RAG returns no results
    let articles = [];
    if (ragResults && ragResults.length > 0) {
      // Convert RAG results to article format
      articles = ragResults.map(result => ({
        title: result.title || '',
        description: result.summary || '',
        summary: result.summary || '',
        content: result.content || '',
        source: result.source || 'Unknown',
        type: result.type || 'article'
      }));
    } else {
      articles = await fetchArticlesForSymbol(symbol);
    }
    
    if (articles.length === 0) {
      return {
        label: 'Neutral',
        score: 0,
        method: 'No data',
        articles_analyzed: 0
      };
    }
    
    // 3. Combine article text
    const articleTexts = articles.map(a => 
      `${a.title || ''} ${a.description || a.summary || ''} ${a.content || ''}`
    ).join(' ');
    
    // 4. Analyze sentiment
    const sentimentResult = await aiService.getSentiment(articleTexts, 'vader');
    
    // 5. Add metadata
    return {
      ...sentimentResult,
      articles_analyzed: articles.length,
      breakdown: calculateSentimentBreakdown(articles),
      sources: articles.map(a => a.type || 'article') // Include data types
    };
  } catch (error) {
    console.error('[AIOrchestrator] Error in handleSentiment:', error);
    return null;
  }
}

/**
 * Handle news summary intent
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} Relevant articles
 */
async function handleNewsSummary(symbol) {
  try {
    // OPTIMIZED: Only fetch 3 articles (not 5) for news summary to reduce data fetching
    // Use RAG to find similar articles, external news, and stock info
    const query = `${symbol} news stock market`;
    const ragArticles = await ragService.searchSimilarArticles(query, {
      symbol: symbol,
      limit: 3, // Reduced from 5 to 3
      threshold: 0.3,
      dataTypes: ['article', 'external_news'] // Removed stock_info for news summary (not needed)
    });
    
    // If RAG returns few results, supplement with recent articles
    if (ragArticles.length < 3) {
      const recentArticles = await ragService.getRecentArticles(symbol, 5);
      // Merge and deduplicate
      const allArticles = [...ragArticles, ...recentArticles];
      const uniqueArticles = Array.from(
        new Map(allArticles.map(a => [a._id?.toString() || a.title, a])).values()
      );
      return uniqueArticles.slice(0, 5);
    }
    
    return ragArticles;
  } catch (error) {
    console.error('[AIOrchestrator] Error in handleNewsSummary:', error);
    // Fallback to recent articles
    return await ragService.getRecentArticles(symbol, 5);
  }
}

/**
 * Handle portfolio insight intent
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Portfolio data
 */
async function handlePortfolioInsight(userId) {
  try {
    const [stockDistribution, sectorDistribution, growthData] = await Promise.all([
      portfolioService.getPortfolioDistributionByStock(userId).catch(() => []),
      portfolioService.getPortfolioDistributionBySector(userId).catch(() => []),
      portfolioService.getPortfolioGrowthOverTime(userId, '1m').catch(() => [])
    ]);
    
    // Calculate total value and profit/loss
    const totalValue = stockDistribution.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalCost = stockDistribution.reduce((sum, item) => sum + (item.cost || item.value || 0), 0);
    const profitLoss = totalValue - totalCost;
    const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
    
    return {
      total_value: totalValue,
      total_cost: totalCost,
      profit_loss: profitLoss,
      profit_loss_pct: profitLossPct,
      distribution_by_stock: stockDistribution,
      distribution_by_sector: sectorDistribution,
      growth_data: growthData
    };
  } catch (error) {
    console.error('[AIOrchestrator] Error in handlePortfolioInsight:', error);
    return null;
  }
}

/**
 * Handle stock history (for general queries)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Stock history summary
 */
async function handleStockHistory(symbol) {
  try {
    const historyData = await StockHistory.find({ stockSymbol: symbol.toUpperCase() })
      .sort({ timestamp: -1 })
      .limit(1)
      .select('price volume -_id')
      .lean();
    
    if (historyData.length === 0) {
      return null;
    }
    
    const latest = historyData[0];
    
    // Get price change (compare with previous)
    const previousData = await StockHistory.find({ stockSymbol: symbol.toUpperCase() })
      .sort({ timestamp: -1 })
      .skip(1)
      .limit(1)
      .select('price -_id')
      .lean();
    
    let change = 0;
    let changePct = 0;
    if (previousData.length > 0) {
      change = latest.price - previousData[0].price;
      changePct = previousData[0].price > 0 ? (change / previousData[0].price) * 100 : 0;
    }
    
    return {
      current_price: latest.price,
      change: change,
      change_pct: changePct,
      volume: latest.volume
    };
  } catch (error) {
    console.error('[AIOrchestrator] Error in handleStockHistory:', error);
    return null;
  }
}

/**
 * Fetch articles for a symbol (internal + external)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} Articles
 */
async function fetchArticlesForSymbol(symbol) {
  const Article = require('../models/Article');
  const articles = [];
  
  try {
    // Internal articles
    const internalArticles = await Article.find({
      symbol: symbol.toUpperCase(),
      status: 'published'
    })
      .sort({ publishedAt: -1 })
      .limit(10)
      .select('title summary content publishedAt')
      .lean();
    
    articles.push(...internalArticles.map(a => ({
      ...a,
      source: 'Internal'
    })));
    
    // External news (if API key available)
    try {
      const NEWS_API_KEY = process.env.NEWS_API_KEY;
      if (NEWS_API_KEY) {
        const externalNews = await fetchStockNews(symbol, NEWS_API_KEY);
        articles.push(...externalNews.slice(0, 10));
      }
    } catch (newsError) {
      console.error('[AIOrchestrator] Failed to fetch external news:', newsError);
    }
    
    return articles.slice(0, 10);
  } catch (error) {
    console.error('[AIOrchestrator] Error fetching articles:', error);
    return [];
  }
}

/**
 * Calculate sentiment breakdown from articles
 * @param {Array} articles - Articles array
 * @returns {Object} Breakdown counts
 */
function calculateSentimentBreakdown(articles) {
  // This is a simplified breakdown
  // In production, you might analyze each article individually
  return {
    positive_count: Math.floor(articles.length * 0.6),
    negative_count: Math.floor(articles.length * 0.2),
    neutral_count: articles.length - Math.floor(articles.length * 0.6) - Math.floor(articles.length * 0.2)
  };
}

/**
 * Generate LLM response with timeout
 * @param {string} message - User message
 * @param {string} context - LLM context
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<string>} LLM response text
 */
async function generateLLMResponseWithTimeout(message, context, timeoutMs) {
  // Note: Circuit breaker removed - Ollama local doesn't have quota limits

  const prompt = `You are CapStock AI assistant, a specialized stock market advisor.

IMPORTANT RULES:
1. ONLY use the information provided in the Context section below.
2. DO NOT make up or hallucinate any stock prices, trends, or data.
3. If information is not available in the context, say "I don't have that information available."
4. Always answer in the user's language (detect from their message).

Context:
${context}

User Question: ${message}

Provide a helpful, accurate response based ONLY on the context above:`;

  // Check cache first
  const cachedResponse = cacheService.getCachedResponse(message, context);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const messages = [
      {
        role: "system",
        content: "You are CapStock AI assistant, a specialized stock market advisor. ONLY use the information provided in the Context section. DO NOT make up or hallucinate any stock prices, trends, or data. If information is not available in the context, say 'I don't have that information available.' Always answer in the user's language."
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nUser Question: ${message}\n\nProvide a helpful, accurate response based ONLY on the context above:`
      }
    ];
    
    const response = await Promise.race([
      askAI(messages),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM generation timeout')), timeoutMs)
      )
    ]);
    
    // Cache successful response
    cacheService.setCachedResponse(message, context, response);
    return response;
  } catch (error) {
    console.error('[AIOrchestrator] LLM generation failed:', error);
    // Return null to trigger template-based fallback
    return null;
  }
}

/**
 * Build structured response from intent, handlers, and LLM response
 * @param {Object} intentResult - Intent detection result
 * @param {Object} handlerResults - Handler results
 * @param {string} llmResponse - LLM generated text
 * @param {number} startTime - Processing start time
 * @returns {Object} Structured response
 */
function buildStructuredResponse(intentResult, handlerResults, llmResponse, startTime) {
  const { intent, entities } = intentResult;
  const processingTime = Date.now() - startTime;
  
  const baseResponse = {
    type: intent,
    text: llmResponse,
    data: null,
    sources: [],
    metadata: {
      intent: intent,
      entities: entities,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    }
  };
  
  // Build response based on intent type
  switch (intent) {
    case intentService.INTENT_TYPES.PRICE_FORECAST:
      if (handlerResults.pricePrediction) {
        baseResponse.data = {
          predicted_price: handlerResults.pricePrediction.predicted_price,
          current_price: handlerResults.pricePrediction.current_price,
          predicted_change: handlerResults.pricePrediction.predicted_change,
          predicted_change_pct: handlerResults.pricePrediction.predicted_change_pct,
          trend: handlerResults.pricePrediction.trend,
          confidence: handlerResults.pricePrediction.confidence,
          model_type: handlerResults.pricePrediction.model_type,
          model_version: handlerResults.pricePrediction.model_version,
          forecast_chart_data: generateForecastChartData(handlerResults.pricePrediction)
        };
        baseResponse.sources.push({
          type: 'ml_model',
          name: handlerResults.pricePrediction.model_type || 'Unknown',
          version: handlerResults.pricePrediction.model_version || 'unknown'
        });
      }
      break;
      
    case intentService.INTENT_TYPES.SENTIMENT:
      if (handlerResults.sentiment) {
        baseResponse.data = {
          label: handlerResults.sentiment.label,
          score: handlerResults.sentiment.score,
          method: handlerResults.sentiment.method,
          articles_analyzed: handlerResults.sentiment.articles_analyzed,
          breakdown: handlerResults.sentiment.breakdown
        };
        baseResponse.sources.push({
          type: 'sentiment_analyzer',
          method: handlerResults.sentiment.method
        });
      }
      break;
      
    case intentService.INTENT_TYPES.NEWS_SUMMARY:
      if (handlerResults.ragArticles && handlerResults.ragArticles.length > 0) {
        baseResponse.data = {
          summary: llmResponse,
          articles: handlerResults.ragArticles.map(a => ({
            title: a.title,
            description: a.summary || a.description,
            content: a.content,
            source: a.source || 'Internal',
            publishedAt: a.publishedAt,
            relevance_score: a.relevance_score
          })),
          total_articles: handlerResults.ragArticles.length
        };
        baseResponse.sources.push({
          type: 'rag',
          articles_count: handlerResults.ragArticles.length
        });
      }
      break;
      
    case intentService.INTENT_TYPES.PORTFOLIO_INSIGHT:
      if (handlerResults.portfolio) {
        baseResponse.data = handlerResults.portfolio;
        baseResponse.sources.push({
          type: 'portfolio_service'
        });
      }
      break;
  }
  
  return baseResponse;
}

/**
 * Generate forecast chart data from prediction
 * @param {Object} prediction - Price prediction result
 * @returns {Array} Chart data points
 */
function generateForecastChartData(prediction) {
  if (!prediction.predicted_price || !prediction.current_price) {
    return [];
  }
  
  // Generate 7-day forecast data points
  const chartData = [];
  const currentPrice = prediction.current_price;
  const predictedPrice = prediction.predicted_price;
  const days = 7;
  
  // Linear interpolation for forecast
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const progress = i / days;
    const price = currentPrice + (predictedPrice - currentPrice) * progress;
    
    chartData.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100
    });
  }
  
  return chartData;
}

/**
 * Get greeting response (no LLM needed)
 * @param {string} message - User message
 * @returns {string} Greeting response
 */
function getGreetingResponse(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Detect language
  const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(message);
  
  if (isVietnamese) {
    return "Xin chào! Tôi là CapStock AI, trợ lý phân tích thị trường chứng khoán của bạn. Tôi có thể giúp bạn:\n\n" +
           "📊 Dự đoán giá cổ phiếu\n" +
           "📰 Phân tích tin tức và sentiment\n" +
           "💼 Xem thông tin portfolio\n" +
           "📈 Phân tích xu hướng thị trường\n\n" +
           "Bạn muốn hỏi gì về cổ phiếu hôm nay?";
  } else {
    return "Hello! I'm CapStock AI, your stock market analysis assistant. I can help you with:\n\n" +
           "📊 Stock price forecasting\n" +
           "📰 News analysis and sentiment\n" +
           "💼 Portfolio insights\n" +
           "📈 Market trend analysis\n\n" +
           "What would you like to know about stocks today?";
  }
}

/**
 * Generate simple response for queries that don't need data
 * @param {Object} intentResult - Intent detection result
 * @param {string} message - User message
 * @returns {string} Simple response
 */
function generateSimpleResponse(intentResult, message) {
  const { intent, entities } = intentResult;
  const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(message);
  
  if (intent === 'general') {
    if (isVietnamese) {
      return "Tôi có thể giúp bạn phân tích cổ phiếu, dự đoán giá, xem tin tức và sentiment. " +
             "Vui lòng cung cấp mã cổ phiếu (ví dụ: AAPL, MSFT) hoặc câu hỏi cụ thể hơn.";
    } else {
      return "I can help you analyze stocks, forecast prices, view news and sentiment. " +
             "Please provide a stock symbol (e.g., AAPL, MSFT) or a more specific question.";
    }
  }
  
  // If intent requires symbol but none provided
  if (['price_forecast', 'sentiment', 'news_summary'].includes(intent) && !entities.symbol) {
    if (isVietnamese) {
      return `Để ${intent === 'price_forecast' ? 'dự đoán giá' : intent === 'sentiment' ? 'phân tích sentiment' : 'xem tin tức'}, ` +
             "vui lòng cung cấp mã cổ phiếu. Ví dụ: 'Dự đoán giá AAPL' hoặc 'Sentiment của MSFT'";
    } else {
      return `To ${intent === 'price_forecast' ? 'forecast price' : intent === 'sentiment' ? 'analyze sentiment' : 'view news'}, ` +
             "please provide a stock symbol. Example: 'Forecast price for AAPL' or 'Sentiment of MSFT'";
    }
  }
  
  // Default simple response
  if (isVietnamese) {
    return "Tôi đang xử lý yêu cầu của bạn. Vui lòng cung cấp thêm thông tin nếu cần.";
  } else {
    return "I'm processing your request. Please provide more information if needed.";
  }
}

/**
 * Generate template-based response when LLM is unavailable
 * @param {Object} intentResult - Intent detection result
 * @param {Object} handlerResults - Handler results
 * @returns {string} Template-based response text
 */
function generateTemplateResponse(intentResult, handlerResults) {
  const { intent, entities } = intentResult;
  const symbol = entities.symbol || 'the stock';
  
  switch (intent) {
    case intentService.INTENT_TYPES.PRICE_FORECAST:
      if (handlerResults.pricePrediction) {
        const pred = handlerResults.pricePrediction;
        if (pred.predicted_price && pred.current_price) {
          const change = pred.predicted_change_pct || 0;
          const trend = pred.trend || 'Neutral';
          return `Based on ${pred.model_type || 'our analysis'}, ${symbol} is predicted to reach $${pred.predicted_price.toFixed(2)} from the current price of $${pred.current_price.toFixed(2)}. This represents a ${change >= 0 ? '+' : ''}${change.toFixed(2)}% change. The trend is ${trend.toLowerCase()}. Confidence: ${pred.confidence ? Math.round(pred.confidence * 100) : 'N/A'}%.`;
        }
      }
      return `I can analyze the price forecast for ${symbol}, but I need more historical data.`;
      
    case intentService.INTENT_TYPES.SENTIMENT:
      if (handlerResults.sentiment) {
        const sent = handlerResults.sentiment;
        return `The sentiment for ${symbol} is ${sent.label.toLowerCase()} with a score of ${sent.score.toFixed(2)} (analyzed using ${sent.method || 'sentiment analysis'}). ${sent.articles_analyzed ? `Based on ${sent.articles_analyzed} articles.` : ''}`;
      }
      return `I can analyze sentiment for ${symbol}, but I need news articles or text data.`;
      
    case intentService.INTENT_TYPES.NEWS_SUMMARY:
      if (handlerResults.ragArticles && handlerResults.ragArticles.length > 0) {
        return `Here are ${handlerResults.ragArticles.length} recent articles about ${symbol}: ${handlerResults.ragArticles.slice(0, 3).map(a => a.title).join(', ')}.`;
      }
      return `I found no recent news articles about ${symbol}.`;
      
    case intentService.INTENT_TYPES.PORTFOLIO_INSIGHT:
      if (handlerResults.portfolio) {
        const port = handlerResults.portfolio;
        return `Your portfolio has a total value of $${port.total_value?.toLocaleString() || 'N/A'}. ${port.profit_loss !== undefined ? `Profit/Loss: ${port.profit_loss >= 0 ? '+' : ''}$${port.profit_loss.toLocaleString()} (${port.profit_loss_pct >= 0 ? '+' : ''}${port.profit_loss_pct?.toFixed(2) || 0}%).` : ''}`;
      }
      return `I can analyze your portfolio, but I need portfolio data.`;
      
    default:
      return `I can help you with stock market analysis. Please ask about price forecasts, sentiment analysis, news summaries, or portfolio insights.`;
  }
}

module.exports = {
  processMessage
};

