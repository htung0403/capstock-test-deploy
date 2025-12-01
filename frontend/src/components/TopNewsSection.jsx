/*
  File: frontend/src/components/TopNewsSection.jsx
  Purpose: Fetches and displays a limited number of top news articles on the Dashboard.
  Date: 2025-11-17
*/

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';

const TopNewsSection = ({ limit = 3 }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchTopNews = async () => {
      try {
        setLoading(true);
        setError(null);
        // We are using the existing /api/news endpoint, which fetches published articles.
        // We will limit the display on the frontend.
        const response = await api.get('/news'); 
        setNews(response.data.slice(0, limit)); // Take only the top 'limit' articles
      } catch (err) {
        console.error('Error fetching top news:', err);
        setError('Failed to load top news.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopNews();
  }, [limit]);

  if (loading) {
    return <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading top news...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">Error: {error}</p>;
  }

  return (
    <div className={`p-4 rounded-lg shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Top News</h2>
      {news.length === 0 ? (
        <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No top news available.</p>
      ) : (
        <div className="space-y-4">
          {news.map(article => (
            <div key={article._id} className="flex items-start gap-4">
              {article.thumbnail && (
                <img src={article.thumbnail} alt={article.title} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
              )}
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Link to={`/news/${article._id}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopNewsSection;