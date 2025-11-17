/*
  File: frontend/src/pages/NewsPage.jsx
  Purpose: Displays a news dashboard with a list of articles.
  Date: 2025-11-17
*/

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';

const NewsPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await api.get('/news'); // Using the existing /api/news endpoint
        setArticles(response.data);
      } catch (err) {
        console.error('Error fetching news articles:', err);
        setError('Failed to load news articles.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <p>Loading news...</p>
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

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <h1 className={`text-4xl font-bold mb-8 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>Latest News</h1>
        
        {articles.length === 0 ? (
          <p className="text-center text-lg text-gray-500">No news articles available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map(article => (
              <div key={article._id} className={`rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                {article.thumbnail && (
                  <img src={article.thumbnail} alt={article.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Link to={`/news/${article._id}`} className="hover:underline">
                      {article.title}
                    </Link>
                  </h2>
                  <p className={`text-gray-600 text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    By {article.author?.pen_name || article.author?.username || 'Unknown'} on {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                  </p>
                  <p className={`text-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{article.summary?.substring(0, 150)}{article.summary?.length > 150 ? '...' : ''}</p>
                  <div className="mt-4">
                    <Link to={`/news/${article._id}`} className={`text-blue-500 hover:underline font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Read More</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
