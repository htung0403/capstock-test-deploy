/*
  File: components/ChatMessage.jsx
  Purpose: Router component for rendering different message types
  Routes to appropriate message component based on response type
  
  CHANGES (2025-12-06):
  - Initial creation for AI Chatbot enhancement
  - Supports: price_forecast, sentiment, news_summary, portfolio_insight, general
*/

import React from 'react';
import PriceForecastMessage from './PriceForecastMessage';
import SentimentMessage from './SentimentMessage';
import NewsSummaryMessage from './NewsSummaryMessage';
import PortfolioInsightMessage from './PortfolioInsightMessage';
import TextMessage from './TextMessage';

function ChatMessage({ message }) {
  const { type, text, data } = message;
  
  // If message is old format (just text), render as text
  if (!type && text) {
    return <TextMessage text={text} />;
  }
  
  switch (type) {
    case 'price_forecast':
      return <PriceForecastMessage text={text} data={data} />;
      
    case 'sentiment':
      return <SentimentMessage text={text} data={data} />;
      
    case 'news_summary':
      return <NewsSummaryMessage text={text} data={data} />;
      
    case 'portfolio_insight':
      return <PortfolioInsightMessage text={text} data={data} />;
      
    case 'general':
    default:
      return <TextMessage text={text} />;
  }
}

export default ChatMessage;

