/*
  File: components/SentimentMessage.jsx
  Purpose: Render sentiment analysis message with gauge and score
*/

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import TextMessage from './TextMessage';

function SentimentMessage({ text, data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (!data) {
    return <TextMessage text={text} />;
  }
  
  const score = data.score || 0; // -1 to 1
  const label = data.label || 'Neutral';
  const method = data.method || 'Unknown';
  
  // Normalize score to 0-1 for gauge (0 = -1, 0.5 = 0, 1 = +1)
  const normalizedScore = (score + 1) / 2;
  
  // Determine color based on sentiment
  const getSentimentColor = () => {
    if (label === 'Positive') return '#10b981'; // green
    if (label === 'Negative') return '#ef4444'; // red
    return '#6b7280'; // gray
  };
  
  const sentimentColor = getSentimentColor();
  
  return (
    <div className={`max-w-[90%] space-y-3 p-3 rounded-lg shadow-sm ${
      isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
    }`}>
      {/* Text description */}
      <p className="text-sm whitespace-pre-line break-words">{text}</p>
      
      {/* Sentiment gauge */}
      <div className="flex items-center space-x-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={isDark ? '#4b5563' : '#e5e7eb'}
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={sentimentColor}
              strokeWidth="8"
              strokeDasharray={`${normalizedScore * 251.2} 251.2`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: sentimentColor }}>
              {(score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className={`text-lg font-semibold mb-1`} style={{ color: sentimentColor }}>
            {label}
          </div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Method: {method}
          </div>
          {data.articles_analyzed && (
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Articles analyzed: {data.articles_analyzed}
            </div>
          )}
        </div>
      </div>
      
      {/* Breakdown (if available) */}
      {data.breakdown && (
        <div className="text-xs space-y-1">
          <div className="font-semibold mb-2">Breakdown:</div>
          <div className="flex space-x-4">
            {data.breakdown.positive_count !== undefined && (
              <div>
                <span className="text-green-500">Positive:</span> {data.breakdown.positive_count}
              </div>
            )}
            {data.breakdown.negative_count !== undefined && (
              <div>
                <span className="text-red-500">Negative:</span> {data.breakdown.negative_count}
              </div>
            )}
            {data.breakdown.neutral_count !== undefined && (
              <div>
                <span className="text-gray-500">Neutral:</span> {data.breakdown.neutral_count}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SentimentMessage;

