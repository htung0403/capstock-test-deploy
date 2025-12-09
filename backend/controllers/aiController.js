/*
  File: controllers/aiController.js
  Purpose: Handle AI-related API requests, including sentiment analysis, price analysis, and comprehensive stock analysis.
  
  CHANGES (2025-10-20):
  - Added `analyzeSentiment` function to trigger sentiment analysis via `aiService`.
  - Added `analyzeStockPrice` function to retrieve historical data and trigger price analysis via `aiService`.
  - Added `getComprehensiveAnalysis` function to combine news fetching, sentiment analysis, price analysis, and provide simple stock recommendations/ratings.
  
  CHANGES (2025-01-15):
  - Added `getHybridAnalysis` function to perform hybrid analysis combining technical indicators (EMA, RSI) with sentiment analysis.
*/
const aiService = require('../services/aiService');
const StockHistory = require('../models/StockHistory'); // Import StockHistory model
const Article = require('../models/Article'); // Import Article model (replaces News model)
const { fetchStockNews } = require('../services/marketDataService'); // Import fetchStockNews
const fs = require('fs');
const path = require('path');

exports.analyzeSentiment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required for sentiment analysis.' });
    }
    const sentiment = await aiService.getSentiment(text);
    res.json({ sentiment });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ message: 'Failed to analyze sentiment.', error: error.message });
  }
};

exports.analyzeStockPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ message: 'Stock symbol is required.' });
    }

    const historyData = await StockHistory.find({ stockSymbol: symbol })
      .sort({ timestamp: 1 })
      .select('price timestamp -_id'); // Only fetch price and timestamp

    if (historyData.length === 0) {
      return res.status(404).json({ message: 'No historical data found for this symbol.' });
    }

    // Convert Mongoose documents to plain objects for Python script
    const plainHistoryData = historyData.map(doc => doc.toObject());
    
    // Use enhanced analysis (tries ML model first, falls back to traditional)
    const priceAnalysis = await aiService.analyzePriceHistoryEnhanced(symbol, plainHistoryData);
    res.json({ priceAnalysis });
  } catch (error) {
    console.error('Error analyzing stock price:', error);
    res.status(500).json({ message: 'Failed to analyze stock price.', error: error.message });
  }
};

exports.getComprehensiveAnalysis = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ message: 'Stock symbol is required.' });
    }

    // 1. Fetch and analyze sentiment from news/articles
    let allArticles = [];

    // First, try to fetch published articles from your internal system
    const internalArticles = await Article.find({ symbol: symbol.toUpperCase(), status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(10);

    if (internalArticles.length > 0) {
      console.log(`Found ${internalArticles.length} published internal articles for ${symbol}.`);
      // Map internal articles to a common structure for sentiment analysis
      const mappedInternalArticles = internalArticles.map(article => ({
        title: article.title,
        description: article.summary,
        url: `internal-article/${article._id}`,
        source: 'Internal',
        publishedAt: article.publishedAt,
        symbol: article.symbol,
        content: article.content,
      }));
      allArticles = [...mappedInternalArticles];
    }

    // If not enough internal articles or to supplement, fetch from NewsAPI
    if (allArticles.length < 10) { // Try to get up to 10 articles in total
        console.log(`Fetching additional news for ${symbol} from NewsAPI...`);
        try {
            const NEWS_API_KEY = process.env.NEWS_API_KEY;
            if (!NEWS_API_KEY) throw new Error('Missing NEWS_API_KEY in environment');
            const externalNews = await fetchStockNews(symbol, NEWS_API_KEY);
            // Filter out duplicates if any, based on title/url if a simple string comparison is feasible
            // For now, just add them, sophisticated deduplication can be added later
            allArticles = [...allArticles, ...externalNews].slice(0, 10); // Cap at 10 total
        } catch (newsError) {
            console.error(`Failed to fetch fresh news for ${symbol} from NewsAPI:`, newsError.message);
        }
    }
    
    let sentimentAnalysis = [];
    if (allArticles.length > 0) {
      const newsTexts = allArticles.map(n => n.title + ". " + (n.description || n.content)).join(" ");
      const overallSentimentResult = await aiService.getSentiment(newsTexts, "vader"); // Use VADER for better financial text analysis
      // Handle both old format (string) and new format (object)
      const sentimentLabel = typeof overallSentimentResult === 'string' 
        ? overallSentimentResult 
        : overallSentimentResult.label || overallSentimentResult;
      sentimentAnalysis.push({ 
        type: 'overall', 
        sentiment: sentimentLabel,
        sentiment_details: typeof overallSentimentResult === 'object' ? overallSentimentResult : null
      });
    } else {
        sentimentAnalysis.push({ type: 'overall', sentiment: 'No news or articles for analysis' });
    }

    // 2. Fetch and analyze historical price data
    const historyData = await StockHistory.find({ stockSymbol: symbol })
      .sort({ timestamp: 1 })
      .select('price timestamp -_id');

    let priceAnalysis = {};
    if (historyData.length > 0) {
      const plainHistoryData = historyData.map(doc => doc.toObject());
      // Use enhanced analysis (tries ML model first, falls back to traditional)
      priceAnalysis = await aiService.analyzePriceHistoryEnhanced(symbol, plainHistoryData);
    } else {
      priceAnalysis = { short_term_trend: 'No data', long_term_trend: 'No data', ma_short: null, ma_long: null };
    }

    // 3. Combine and provide recommendations/ratings
    let recommendation = {
      long_term: 'Neutral',
      short_term: 'Neutral',
      profit_potential: 'Moderate',
      risk_level: 'Moderate',
      sentiment: sentimentAnalysis[0].sentiment, // Overall sentiment label
      sentiment_score: sentimentAnalysis[0].sentiment_details?.score || null, // Sentiment score if available
      sentiment_method: sentimentAnalysis[0].sentiment_details?.method || null, // Method used (VADER/TextBlob)
      price_trends: priceAnalysis,
    };

    // Simple recommendation logic
    if (priceAnalysis.long_term_trend === 'Bullish' && sentimentAnalysis[0].sentiment === 'Positive') {
      recommendation.long_term = 'Buy';
      recommendation.profit_potential = 'High';
      recommendation.risk_level = 'Low to Moderate';
    } else if (priceAnalysis.long_term_trend === 'Bearish' && sentimentAnalysis[0].sentiment === 'Negative') {
      recommendation.long_term = 'Sell';
      recommendation.profit_potential = 'Low';
      recommendation.risk_level = 'High';
    } else if (priceAnalysis.long_term_trend === 'Bullish' && sentimentAnalysis[0].sentiment === 'Negative') {
        recommendation.long_term = 'Hold';
        recommendation.risk_level = 'Moderate to High';
    }

    if (priceAnalysis.short_term_trend === 'Bullish') {
      recommendation.short_term = 'Buy';
    } else if (priceAnalysis.short_term_trend === 'Bearish') {
      recommendation.short_term = 'Sell';
    } else {
      recommendation.short_term = 'Hold';
    }

    res.json({ symbol, analysis: recommendation, raw_news: allArticles });
  } catch (error) {
    console.error('Error getting comprehensive analysis:', error);
    res.status(500).json({ message: 'Failed to get comprehensive analysis.', error: error.message });
  }
};

/**
 * Get hybrid analysis combining technical indicators (EMA, RSI) with sentiment analysis
 * @route GET /api/ai/hybrid-analysis/:symbol
 */
exports.getHybridAnalysis = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ message: 'Stock symbol is required.' });
    }

    // 1. Fetch historical price data
    const historyData = await StockHistory.find({ stockSymbol: symbol.toUpperCase() })
      .sort({ timestamp: 1 })
      .select('price timestamp -_id');

    if (historyData.length === 0) {
      return res.status(404).json({ message: 'No historical data found for this symbol.' });
    }

    if (historyData.length < 20) {
      return res.status(400).json({ 
        message: `Insufficient data. Need at least 20 data points, found ${historyData.length}.` 
      });
    }

    // 2. Fetch news/articles for sentiment analysis
    let allArticles = [];
    
    // Try internal articles first
    const internalArticles = await Article.find({ 
      symbol: symbol.toUpperCase(), 
      status: 'published' 
    })
      .sort({ publishedAt: -1 })
      .limit(10);

    if (internalArticles.length > 0) {
      const mappedInternalArticles = internalArticles.map(article => ({
        title: article.title,
        description: article.summary,
        content: article.content,
      }));
      allArticles = [...mappedInternalArticles];
    }

    // Supplement with NewsAPI if available
    if (allArticles.length < 10) {
      try {
        const NEWS_API_KEY = process.env.NEWS_API_KEY;
        if (NEWS_API_KEY) {
          const externalNews = await fetchStockNews(symbol, NEWS_API_KEY);
          allArticles = [...allArticles, ...externalNews].slice(0, 10);
        }
      } catch (newsError) {
        console.error(`Failed to fetch news for ${symbol} from NewsAPI:`, newsError.message);
      }
    }

    // Combine news text for sentiment analysis
    const newsText = allArticles.length > 0
      ? allArticles.map(n => `${n.title}. ${n.description || n.content || ''}`).join(' ')
      : '';

    // 3. Convert history data to format expected by Python script
    const plainHistoryData = historyData.map(doc => ({
      price: doc.price,
      timestamp: doc.timestamp
    }));

    // 4. Call hybrid analyzer
    const hybridResult = await aiService.analyzeHybrid(plainHistoryData, newsText);

    // 5. Return formatted response
    res.json({
      symbol: symbol.toUpperCase(),
      hybrid_analysis: hybridResult,
      data_sources: {
        history_points: historyData.length,
        articles_count: allArticles.length,
        articles_sources: allArticles.length > 0 ? [...new Set(allArticles.map(a => a.source || 'Internal'))] : []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting hybrid analysis:', error);
    res.status(500).json({ 
      message: 'Failed to get hybrid analysis.', 
      error: error.message 
    });
  }
};

/**
 * List all available trained ML models
 * @route GET /api/ai/models
 */
exports.listAvailableModels = async (req, res) => {
  try {
    const modelsDir = path.join(__dirname, '..', 'ai_models');
    
    if (!fs.existsSync(modelsDir)) {
      return res.json({ 
        available: false, 
        models: [],
        message: 'AI models directory does not exist' 
      });
    }

    const files = fs.readdirSync(modelsDir);
    const models = [];

    // Find all metadata files
    const metadataFiles = files.filter(f => f.endsWith('_metadata.json'));

    for (const metadataFile of metadataFiles) {
      try {
        const symbol = metadataFile.replace('_metadata.json', '');
        const metadataPath = path.join(modelsDir, metadataFile);
        const modelPath = path.join(modelsDir, `${symbol}_model.pkl`);

        if (fs.existsSync(modelPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          const modelStats = fs.statSync(modelPath);

          models.push({
            symbol: symbol,
            model_type: metadata.model_type || 'Unknown',
            version: metadata.version || 'unknown',
            created_at: metadata.created_at || null,
            metrics: metadata.metrics || {},
            features: metadata.features || [],
            lags: metadata.lags || 0,
            model_size_mb: (modelStats.size / (1024 * 1024)).toFixed(2),
            available: true
          });
        }
      } catch (err) {
        console.error(`Error reading model metadata for ${metadataFile}:`, err);
      }
    }

    res.json({
      available: models.length > 0,
      count: models.length,
      models: models,
      message: models.length > 0 
        ? `Found ${models.length} trained model(s)` 
        : 'No trained models found'
    });
  } catch (error) {
    console.error('Error listing available models:', error);
    res.status(500).json({ 
      message: 'Failed to list available models.', 
      error: error.message 
    });
  }
};
