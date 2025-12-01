/*
  File: frontend/src/components/NewsCardSkeleton.jsx
  Purpose: Skeleton loader component for news cards
  Date: 2025-11-17
*/

import React from 'react';

const NewsCardSkeleton = ({ isDark }) => (
  <div className={`rounded-xl overflow-hidden border ${
    isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
  }`}>
    <div className={`h-48 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
    <div className="p-6">
      <div className={`h-4 w-20 rounded mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
      <div className={`h-6 rounded mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
      <div className={`h-4 rounded mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
      <div className={`h-4 w-3/4 rounded mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
      <div className={`h-3 w-24 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`} />
    </div>
  </div>
);

export default NewsCardSkeleton;

