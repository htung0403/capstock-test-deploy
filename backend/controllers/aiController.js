/*
  File: controllers/aiController.js
  Purpose: Handle AI-related API requests, including sentiment analysis, price analysis, and comprehensive stock analysis.
  
  CHANGES (2025-10-20):
  - Added `analyzeSentiment` function to trigger sentiment analysis via `aiService`.
  - Added `analyzeStockPrice` function to retrieve historical data and trigger price analysis via `aiService`.
  - Added `getComprehensiveAnalysis` function to combine news fetching, sentiment analysis, price analysis, and provide simple stock recommendations/ratings.
*/
const aiService = require('../services/aiService');
const StockHistory = require('../models/StockHistory'); // Import StockHistory model
const News = require('../models/News'); // Import News model
const { fetchStockNews } = require('../services/marketDataService'); // Import fetchStockNews

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
    
    const priceAnalysis = await aiService.analyzePriceHistory(plainHistoryData);
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

    // 1. Fetch and analyze sentiment from news
    // First, try to fetch fresh news (if not already fetched recently by scheduler)
    let newsArticles = await News.find({ symbol: symbol.toUpperCase() }).sort({ publishedAt: -1 }).limit(10);
    if (newsArticles.length === 0) {
        console.log(`No recent news found for ${symbol} in DB, fetching from NewsAPI...`);
        try {
            const NEWS_API_KEY = process.env.NEWS_API_KEY;
            if (!NEWS_API_KEY) throw new Error('Missing NEWS_API_KEY in environment');
            newsArticles = await fetchStockNews(symbol, NEWS_API_KEY);
        } catch (newsError) {
            console.error(`Failed to fetch fresh news for ${symbol}:`, newsError.message);
            // Continue with existing news or no news if fetching fails
        }
    }
    
    let sentimentAnalysis = [];
    if (newsArticles.length > 0) {
      const newsTexts = newsArticles.map(n => n.title + ". " + n.description).join(" ");
      const overallSentiment = await aiService.getSentiment(newsTexts);
      sentimentAnalysis.push({ type: 'overall', sentiment: overallSentiment });
    } else {
        sentimentAnalysis.push({ type: 'overall', sentiment: 'No news for analysis' });
    }

    // 2. Fetch and analyze historical price data
    const historyData = await StockHistory.find({ stockSymbol: symbol })
      .sort({ timestamp: 1 })
      .select('price timestamp -_id');

    let priceAnalysis = {};
    if (historyData.length > 0) {
      const plainHistoryData = historyData.map(doc => doc.toObject());
      priceAnalysis = await aiService.analyzePriceHistory(plainHistoryData);
    } else {
      priceAnalysis = { short_term_trend: 'No data', long_term_trend: 'No data', ma_short: null, ma_long: null };
    }

    // 3. Combine and provide recommendations/ratings
    let recommendation = {
      long_term: 'Neutral',
      short_term: 'Neutral',
      profit_potential: 'Moderate',
      risk_level: 'Moderate',
      sentiment: sentimentAnalysis[0].sentiment, // Overall sentiment
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

    res.json({ symbol, analysis: recommendation, raw_news: newsArticles });
  } catch (error) {
    console.error('Error getting comprehensive analysis:', error);
    res.status(500).json({ message: 'Failed to get comprehensive analysis.', error: error.message });
  }
};
