/*
  File: components/NewsSummaryMessage.jsx
  Purpose: Render news summary message with article cards
*/

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import TextMessage from './TextMessage';

function NewsSummaryMessage({ text, data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (!data || !data.articles || data.articles.length === 0) {
    return <TextMessage text={text} />;
  }
  
  return (
    <div className={`max-w-[90%] space-y-3 p-3 rounded-lg shadow-sm ${
      isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
    }`}>
      {/* Text description */}
      <p className="text-sm whitespace-pre-line break-words">{text}</p>
      
      {/* Articles list */}
      <div className="space-y-2">
        <div className="text-xs font-semibold mb-2">
          📰 Recent Articles ({data.total_articles || data.articles.length}):
        </div>
        {data.articles.slice(0, 5).map((article, index) => (
          <div
            key={index}
            className={`p-2 rounded border text-xs ${
              isDark 
                ? 'bg-gray-800 border-gray-600' 
                : 'bg-white border-gray-300'
            }`}
          >
            <div className="font-semibold mb-1">{article.title || 'Untitled'}</div>
            {(article.description || article.summary) && (
              <div className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {article.description || article.summary}
              </div>
            )}
            <div className="flex justify-between items-center text-xs opacity-70">
              <div className="flex items-center space-x-2">
                <span>Source: {article.source || 'Unknown'}</span>
                {article.relevance_score !== undefined && (
                  <span className="text-blue-500">
                    ({Math.round(article.relevance_score * 100)}% relevant)
                  </span>
                )}
              </div>
              {article.publishedAt && (
                <span>
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NewsSummaryMessage;

