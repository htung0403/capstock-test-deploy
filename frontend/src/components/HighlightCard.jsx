/*
  File: frontend/src/components/HighlightCard.jsx
  Purpose: Highlight card component for featured section sidebar
  Date: 2025-11-17
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { getRelativeTime, getCategoryColor } from '../utils/newsUtils';

const HighlightCard = ({ article, isDark, badge }) => {
  const relativeTime = getRelativeTime(article.publishedAt || article.createdAt);
  const categoryColor = getCategoryColor(article.category?.category_name);

  return (
    <Link 
      to={`/news/${article._id}`}
      className={`group block rounded-lg overflow-hidden border transition-all duration-300 ${
        isDark 
          ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10'
          : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-xl'
      } hover:-translate-y-1`}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Category Badge */}
        {article.category && (
          <div className="absolute top-2 left-2 z-10">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColor} text-white shadow-lg`}>
              {article.category.category_name}
            </span>
          </div>
        )}
        
        {/* Badge (Breaking, Editor's Pick, Premium) */}
        {badge && (
          <div className={`absolute top-2 right-2 z-10 ${badge.color} px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg ${
            badge.type === 'breaking' ? 'animate-pulse' : ''
          }`}>
            {badge.label}
          </div>
        )}
      </div>
      <div className={`p-4 ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
        <h3 className={`text-base font-bold mb-2 line-clamp-2 group-hover:text-blue-500 transition-colors leading-snug ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {article.title}
        </h3>
        <div className={`flex items-center gap-2 text-xs ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <Clock className="w-3 h-3" />
          {relativeTime}
        </div>
      </div>
    </Link>
  );
};

export default HighlightCard;

