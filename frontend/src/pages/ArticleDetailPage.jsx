/*
  File: frontend/src/pages/ArticleDetailPage.jsx
  Purpose: Displays the full content of a single news article.
  Date: 2025-11-17
*/

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const ArticleDetailPage = () => {
  const { id } = useParams(); // Get article ID from URL
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/news/${id}`); // API endpoint to fetch single article
        setArticle(response.data);
      } catch (err) {
        console.error('Error fetching article details:', err);
        setError('Failed to load article details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <p>Loading article...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="text-gray-500">Article not found.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {article.thumbnail && (
          <img src={article.thumbnail} alt={article.title} className="w-full h-80 object-cover rounded-lg mb-6 shadow-md" />
        )}
        <h1 className={`text-4xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{article.title}</h1>
        <p className={`text-gray-600 text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          By <span className="font-medium">{article.author?.pen_name || article.author?.username || 'Unknown'}</span>
          on {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
          {article.category && <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full dark:bg-blue-900 dark:text-blue-300">{article.category.category_name}</span>}
          {article.symbol && <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full dark:bg-green-900 dark:text-green-300">{article.symbol}</span>}
        </p>
        
        <div 
          className={`prose max-w-none ${isDark ? 'prose-invert prose-p:text-gray-300 prose-li:text-gray-300 prose-a:text-blue-400' : 'prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-blue-600'}`}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {article.tags && article.tags.length > 0 && (
          <div className="mt-8">
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span key={tag._id} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full dark:bg-gray-700 dark:text-gray-200">
                  {tag.tag_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link to="/news" className={`text-blue-500 hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>&larr; Back to News</Link>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
