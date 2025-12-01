/*
  File: frontend/src/components/HighlightCard.jsx
  Purpose: Highlight card component for featured section sidebar
  Date: 2025-11-17
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { getRelativeTime, getCategoryColor } from '../utils/newsUtils';

const HighlightCard = ({ article, isDark }) => {
  const relativeTime = getRelativeTime(article.publishedAt || article.createdAt);
  const categoryColor = getCategoryColor(article.category?.category_name);

  return (
    <Link 
      to={`/news/${article._id}`}
      className="group block rounded-lg overflow-hidden border transition-all duration-300"
      style={{
        background: isDark 
          ? 'rgba(30, 41, 59, 0.5)'
          : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="relative h-40 overflow-hidden">
        {article.thumbnail ? (
          <img 
            src={article.thumbnail} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            isDark ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <div className="text-2xl font-light">—</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {article.category && (
          <div className="absolute top-2 left-2 z-10">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${categoryColor} text-white`}>
              {article.category.category_name}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className={`text-base font-bold mb-2 line-clamp-2 group-hover:text-blue-500 transition-colors ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {article.title}
        </h3>
        <div className={`flex items-center gap-2 text-xs ${
          isDark ? 'text-gray-500' : 'text-gray-600'
        }`}>
          <Clock className="w-3 h-3" />
          {relativeTime}
        </div>
      </div>
    </Link>
  );
};

export default HighlightCard;

