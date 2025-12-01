/*
  File: frontend/src/components/HeroCard.jsx
  Purpose: Hero card component for featured articles
  Date: 2025-11-17
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, Sparkles } from 'lucide-react';
import { getRelativeTime, estimateReadTime, getCategoryColor } from '../utils/newsUtils';

const HeroCard = ({ article, isDark }) => {
  const readTime = estimateReadTime(article.summary || article.content || '');
  const relativeTime = getRelativeTime(article.publishedAt || article.createdAt);
  const categoryColor = getCategoryColor(article.category?.category_name);

  return (
    <Link 
      to={`/news/${article._id}`}
      className="group block h-full rounded-xl overflow-hidden border transition-all duration-300"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 1) 100%)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Image Section - Reduced height */}
        <div className="relative h-100 overflow-hidden flex-shrink-0">
          {article.thumbnail ? (
            <img 
              src={article.thumbnail} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              loading="eager"
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {article.category && (
            <div className="absolute top-2 left-2 z-10">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColor} text-white`}>
                {article.category.category_name}
              </span>
            </div>
          )}
          
          {article.isPremium && (
            <div className="absolute top-2 right-2 z-10">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-amber-500 text-white flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Premium
              </span>
            </div>
          )}
        </div>

        {/* Content Section - Reduced height */}
        <div className={`p-3 flex flex-col gap-1.5 ${
          isDark ? 'bg-gray-800/50' : 'bg-white'
        }`}>
          <h1 className={`text-lg md:text-xl font-bold line-clamp-2 group-hover:text-blue-500 transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {article.title}
          </h1>
          {article.summary && (
            <p className={`text-xs line-clamp-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {article.summary}
            </p>
          )}
          <div className={`flex items-center gap-2 text-xs flex-wrap ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {article.author?.pen_name || article.author?.username || 'Unknown'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime}
            </span>
            {readTime > 0 && (
              <>
                <span>•</span>
                <span>{readTime} phút</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HeroCard;

