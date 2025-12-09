/*
  File: services/contextBuilderService.js
  Purpose: Build structured context for LLM from ML results, RAG snippets, and portfolio data
  
  CHANGES (2025-12-06):
  - Initial creation for AI Chatbot enhancement
  - Formats ML predictions, sentiment, RAG articles, and portfolio data into LLM context
*/

/**
 * Build context for LLM from handler results
 * @param {Object} handlerResults - Results from ML/RAG/Portfolio services
 * @param {Object} intentResult - Intent detection result
 * @returns {Promise<string>} Formatted context string
 */
async function buildLLMContext(handlerResults, intentResult) {
  const contextParts = [];
  
  // Add ML price prediction
  if (handlerResults.pricePrediction) {
    contextParts.push(formatPricePrediction(handlerResults.pricePrediction));
  }
  
  // Add sentiment analysis
  if (handlerResults.sentiment) {
    contextParts.push(formatSentiment(handlerResults.sentiment));
  }
  
  // Add RAG articles
  if (handlerResults.ragArticles && handlerResults.ragArticles.length > 0) {
    contextParts.push(formatRAGArticles(handlerResults.ragArticles));
  }
  
  // Add portfolio data
  if (handlerResults.portfolio) {
    contextParts.push(formatPortfolio(handlerResults.portfolio));
  }
  
  // Add stock history summary (if available)
  if (handlerResults.stockHistory) {
    contextParts.push(formatStockHistory(handlerResults.stockHistory));
  }
  
  return contextParts.join('\n\n');
}

/**
 * Format price prediction for LLM context
 * @param {Object} prediction - Price prediction result
 * @returns {string} Formatted context
 */
function formatPricePrediction(prediction) {
  const parts = [];
  
  parts.push('=== PRICE PREDICTION ===');
  
  if (prediction.predicted_price !== undefined) {
    parts.push(`Predicted Price: $${prediction.predicted_price.toFixed(2)}`);
  }
  
  if (prediction.current_price !== undefined) {
    parts.push(`Current Price: $${prediction.current_price.toFixed(2)}`);
  }
  
  if (prediction.predicted_change_pct !== undefined) {
    const changeSign = prediction.predicted_change_pct >= 0 ? '+' : '';
    parts.push(`Predicted Change: ${changeSign}${prediction.predicted_change_pct.toFixed(2)}%`);
  }
  
  if (prediction.trend) {
    parts.push(`Trend: ${prediction.trend}`);
  }
  
  if (prediction.confidence !== undefined) {
    parts.push(`Confidence: ${(prediction.confidence * 100).toFixed(0)}%`);
  }
  
  if (prediction.model_type) {
    parts.push(`Model Type: ${prediction.model_type}`);
    if (prediction.model_version) {
      parts.push(`Model Version: ${prediction.model_version}`);
    }
  }
  
  if (prediction.model_metrics) {
    parts.push(`Model Metrics: MAE=${prediction.model_metrics.MAE?.toFixed(2) || 'N/A'}, RMSE=${prediction.model_metrics.RMSE?.toFixed(2) || 'N/A'}`);
  }
  
  if (prediction.method) {
    parts.push(`Analysis Method: ${prediction.method}`);
  }
  
  return parts.join('\n');
}

/**
 * Format sentiment analysis for LLM context
 * @param {Object} sentiment - Sentiment analysis result
 * @returns {string} Formatted context
 */
function formatSentiment(sentiment) {
  const parts = [];
  
  parts.push('=== SENTIMENT ANALYSIS ===');
  
  if (sentiment.label) {
    parts.push(`Overall Sentiment: ${sentiment.label}`);
  }
  
  if (sentiment.score !== undefined) {
    parts.push(`Sentiment Score: ${sentiment.score.toFixed(2)} (range: -1.0 to 1.0)`);
  }
  
  if (sentiment.method) {
    parts.push(`Analysis Method: ${sentiment.method}`);
  }
  
  if (sentiment.articles_analyzed) {
    parts.push(`Articles Analyzed: ${sentiment.articles_analyzed}`);
  }
  
  if (sentiment.breakdown) {
    parts.push(`Breakdown: Positive=${sentiment.breakdown.positive_count || 0}, Negative=${sentiment.breakdown.negative_count || 0}, Neutral=${sentiment.breakdown.neutral_count || 0}`);
  }
  
  return parts.join('\n');
}

/**
 * Format RAG articles for LLM context
 * @param {Array} articles - Array of relevant articles
 * @returns {string} Formatted context
 */
function formatRAGArticles(articles) {
  const parts = [];
  
  // OPTIMIZED: Limit to 3 articles (instead of 5) to reduce token usage
  const maxArticles = 3;
  const limitedArticles = articles.slice(0, maxArticles);
  
  parts.push('=== RELEVANT NEWS ARTICLES ===');
  parts.push(`Found ${limitedArticles.length} relevant articles:`);
  
  limitedArticles.forEach((article, index) => {
    parts.push(`\nArticle ${index + 1}:`);
    if (article.title) {
      parts.push(`Title: ${article.title}`);
    }
    // OPTIMIZED: Truncate summary to 150 chars to reduce token usage
    if (article.summary || article.description) {
      const summary = article.summary || article.description;
      const truncated = summary.length > 150 ? summary.substring(0, 150) + '...' : summary;
      parts.push(`Summary: ${truncated}`);
    }
    if (article.source) {
      parts.push(`Source: ${article.source}`);
    }
    if (article.publishedAt) {
      const date = new Date(article.publishedAt).toLocaleDateString();
      parts.push(`Published: ${date}`);
    }
    if (article.relevance_score !== undefined) {
      parts.push(`Relevance: ${(article.relevance_score * 100).toFixed(0)}%`);
    }
  });
  
  return parts.join('\n');
}

/**
 * Format portfolio data for LLM context
 * @param {Object} portfolio - Portfolio data
 * @returns {string} Formatted context
 */
function formatPortfolio(portfolio) {
  const parts = [];
  
  parts.push('=== PORTFOLIO ANALYSIS ===');
  
  if (portfolio.total_value !== undefined) {
    parts.push(`Total Portfolio Value: $${portfolio.total_value.toLocaleString()}`);
  }
  
  if (portfolio.total_cost !== undefined) {
    parts.push(`Total Cost: $${portfolio.total_cost.toLocaleString()}`);
  }
  
  if (portfolio.profit_loss !== undefined) {
    const sign = portfolio.profit_loss >= 0 ? '+' : '';
    parts.push(`Profit/Loss: ${sign}$${portfolio.profit_loss.toLocaleString()}`);
  }
  
  if (portfolio.profit_loss_pct !== undefined) {
    const sign = portfolio.profit_loss_pct >= 0 ? '+' : '';
    parts.push(`Profit/Loss Percentage: ${sign}${portfolio.profit_loss_pct.toFixed(2)}%`);
  }
  
  // OPTIMIZED: Limit to top 5 stocks/sectors to reduce token usage
  if (portfolio.distribution_by_stock && portfolio.distribution_by_stock.length > 0) {
    parts.push('\nDistribution by Stock (Top 5):');
    portfolio.distribution_by_stock.slice(0, 5).forEach(item => {
      parts.push(`  - ${item.name || item.symbol}: $${item.value?.toLocaleString() || 0} (${item.percentage?.toFixed(1) || 0}%)`);
    });
  }
  
  if (portfolio.distribution_by_sector && portfolio.distribution_by_sector.length > 0) {
    parts.push('\nDistribution by Sector (Top 5):');
    portfolio.distribution_by_sector.slice(0, 5).forEach(item => {
      parts.push(`  - ${item.name || item.sector}: $${item.value?.toLocaleString() || 0} (${item.percentage?.toFixed(1) || 0}%)`);
    });
  }
  
  if (portfolio.growth_data && portfolio.growth_data.length > 0) {
    parts.push('\nGrowth Trend:');
    const first = portfolio.growth_data[0];
    const last = portfolio.growth_data[portfolio.growth_data.length - 1];
    if (first && last) {
      const growth = last.value - first.value;
      const growthPct = first.value > 0 ? ((growth / first.value) * 100) : 0;
      parts.push(`  - Started: $${first.value?.toLocaleString() || 0} (${first.date || 'N/A'})`);
      parts.push(`  - Current: $${last.value?.toLocaleString() || 0} (${last.date || 'N/A'})`);
      parts.push(`  - Growth: ${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(2)}%`);
    }
  }
  
  return parts.join('\n');
}

/**
 * Format stock history summary for LLM context
 * @param {Object} history - Stock history data
 * @returns {string} Formatted context
 */
function formatStockHistory(history) {
  const parts = [];
  
  parts.push('=== STOCK HISTORY SUMMARY ===');
  
  if (history.current_price !== undefined) {
    parts.push(`Current Price: $${history.current_price.toFixed(2)}`);
  }
  
  if (history.change !== undefined && history.change_pct !== undefined) {
    const sign = history.change >= 0 ? '+' : '';
    parts.push(`Price Change: ${sign}$${history.change.toFixed(2)} (${sign}${history.change_pct.toFixed(2)}%)`);
  }
  
  if (history.volume) {
    parts.push(`Volume: ${history.volume.toLocaleString()}`);
  }
  
  if (history.high && history.low) {
    parts.push(`52-Week Range: $${history.low.toFixed(2)} - $${history.high.toFixed(2)}`);
  }
  
  return parts.join('\n');
}

module.exports = {
  buildLLMContext
};

