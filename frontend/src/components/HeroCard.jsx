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
      className={`group block h-full rounded-xl overflow-hidden border transition-all duration-300 ${
        isDark
          ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10'
          : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-xl'
      } hover:-translate-y-1`}
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          
          {article.category && (
            <div className="absolute top-4 left-4 z-10">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColor} text-white shadow-lg`}>
                {article.category.category_name}
              </span>
            </div>
          )}
          
          {article.badge && (
            <div className={`absolute top-4 right-4 z-10 ${article.badge.color} px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1`}>
              {article.badge.label}
            </div>
          )}
          
          {!article.badge && article.isPremium && (
            <div className="absolute top-4 right-4 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-amber-500 text-white flex items-center gap-1 shadow-lg">
                <Sparkles className="w-2.5 h-2.5" />
                Premium
              </span>
            </div>
          )}
        </div>

        {/* Content Section - Reduced height */}
        <div className={`p-4 flex flex-col gap-2 ${
          isDark ? 'bg-slate-800/50' : 'bg-white'
        }`}>
          <h1 className={`text-xl md:text-2xl font-bold line-clamp-2 group-hover:text-blue-500 transition-colors leading-tight ${
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

