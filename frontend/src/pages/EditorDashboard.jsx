/*
  File: frontend/src/pages/EditorDashboard.jsx
  Purpose: Dashboard page for Editors to view and manage pending articles for review.
  Date: 2025-10-20
*/
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Your existing API service
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify'; // Assuming you have react-toastify for notifications

function EditorDashboard() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/editor/pending'); // Removed /api
      setArticles(response.data);
    } catch (err) {
      console.error("Error fetching pending articles:", err);
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || `Failed to fetch articles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
        // Tạm thời bỏ qua kiểm tra vai trò để phát triển và kiểm thử
        // if (user.role !== 'EDITOR' && user.role !== 'ADMIN') {
        //     navigate('/dashboard'); // Redirect if not authorized
        //     toast.error("Access Denied: Only editors or administrators can view this page.");
        //     return;
        // }
        fetchArticles();
    } else {
        setLoading(false);
        setError("Please log in to view pending articles.");
        toast.info("Please log in to view pending articles.");
    }
  }, [user, navigate, fetchArticles]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700 dark:text-gray-300">Loading articles for review...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <h2 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Editor Dashboard - Pending Articles</h2>
        {articles.length === 0 ? (
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No pending articles for review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <thead>
                <tr className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                  <th className="py-3 px-4 text-left font-semibold">Title</th>
                  <th className="py-3 px-4 text-left font-semibold">Author</th>
                  <th className="py-3 px-4 text-left font-semibold">Category</th>
                  <th className="py-3 px-4 text-left font-semibold">Published At</th>
                  <th className="py-3 px-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article._id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4">{article.title}</td>
                    <td className="py-3 px-4">{article.author ? article.author.pen_name || article.author.username : 'N/A'}</td>
                    <td className="py-3 px-4">{article.category ? article.category.category_name : 'N/A'}</td>
                    <td className="py-3 px-4">{new Date(article.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Link 
                        to={`/editor/review-article/${article._id}`} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorDashboard;
