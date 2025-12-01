/*
  File: frontend/src/utils/newsUtils.js
  Purpose: Utility functions for news components
  Date: 2025-11-17
*/

export const getRelativeTime = (date) => {
  const now = new Date();
  const pubDate = new Date(date);
  const diffMs = now - pubDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return pubDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
};

export const estimateReadTime = (text) => {
  if (!text) return 0;
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 200;
  return Math.ceil(words / wordsPerMinute);
};

export const getCategoryColor = (categoryName) => {
  if (!categoryName) return 'bg-gray-600';
  const name = categoryName.toLowerCase();
  if (name.includes('vn') || name.includes('việt nam') || name.includes('thị trường')) return 'bg-blue-600';
  if (name.includes('thế giới') || name.includes('quốc tế')) return 'bg-purple-600';
  if (name.includes('doanh nghiệp') || name.includes('công ty')) return 'bg-indigo-600';
  if (name.includes('lãi suất') || name.includes('tỷ giá') || name.includes('tài chính')) return 'bg-yellow-600';
  if (name.includes('crypto') || name.includes('tiền điện tử')) return 'bg-cyan-600';
  if (name.includes('phân tích')) return 'bg-pink-600';
  if (name.includes('kinh tế')) return 'bg-green-600';
  if (name.includes('công nghệ')) return 'bg-orange-600';
  return 'bg-gray-600';
};

