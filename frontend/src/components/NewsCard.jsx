/*
  File: frontend/src/components/NewsCard.jsx
  Purpose: Standard news card component for grid display
  Date: 2025-11-17
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, ArrowRight, Bookmark, Sparkles } from 'lucide-react';
import { getRelativeTime, estimateReadTime, getCategoryColor } from '../utils/newsUtils';

const NewsCard = ({ article, isDark }) => {
  const readTime = estimateReadTime(article.summary || article.content || '');
  const relativeTime = getRelativeTime(article.publishedAt || article.createdAt);
  const categoryColor = getCategoryColor(article.category?.category_name);

  return (
    <Link 
      to={`/news/${article._id}`}
      className={`group block rounded-xl overflow-hidden border transition-all duration-300 ${
        isDark 
          ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10' 
          : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-xl'
      } hover:scale-[1.02]`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
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
            <div className="text-4xl font-light">—</div>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Category Badge */}
        {article.category && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColor} text-white`}>
              {article.category.category_name}
            </span>
          </div>
        )}
        
        {/* Premium Badge */}
        {article.isPremium && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-amber-500 text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Premium
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className={`text-lg font-semibold mb-3 line-clamp-2 group-hover:text-blue-500 transition-colors ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {article.title}
        </h3>

        {/* Summary */}
        {article.summary && (
          <p className={`text-sm mb-4 line-clamp-3 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {article.summary}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-3 flex-wrap ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`}>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {article.author?.pen_name || article.author?.username || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime}
            </span>
            {readTime > 0 && (
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3" />
                {readTime} phút
              </span>
            )}
          </div>
          <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`} />
        </div>
      </div>
    </Link>
  );
};

export default NewsCard;

