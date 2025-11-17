/*
  File: frontend/src/pages/WriterDashboard.jsx
  Purpose: Dashboard page for Writers to view and manage their articles.
  Date: 2025-10-20
*/
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Your existing API service
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify'; // Assuming you have react-toastify for notifications

function WriterDashboard() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const fetchArticles = useCallback(async () => {
    if (!user?.id) {
      setError('Author ID is not available. Please login.'); // Changed message
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let response;
      if (user.role === 'ADMIN') {
        response = await api.get(`/writer/all-articles`); // Removed /api
      } else {
        response = await api.get(`/writer/${user.id}`); // Removed /api
      }
      setArticles(response.data);
    } catch (err) {
      console.error("Error fetching writer's articles:", err);
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || `Failed to fetch articles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user) {
      if (!user.id) {
        setError('Author ID is not available. Please login.');
        setLoading(false);
        return;
      }
        // Tạm thời bỏ qua kiểm tra vai trò để phát triển và kiểm thử
        // if (user.role !== 'writer' && user.role !== 'admin') {
        //     navigate('/dashboard'); // Redirect if not authorized
        //     toast.error("Access Denied: You are not authorized to view this page.");
        //     return;
        // }
        fetchArticles();
    } else {
        setLoading(false);
        setError("Please log in to view articles."); // Changed message
        toast.info("Please log in to view articles.");
    }
  }, [user, navigate, fetchArticles]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700 dark:text-gray-300">Loading articles...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <h2 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Writer Dashboard</h2>
        <div className="mb-4">
          <Link to="/writer/new-article" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200">
            Create New Article
          </Link>
        </div>
        <h3 className={`text-2xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>My Articles</h3>
        {articles.length === 0 ? (
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No articles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <thead>
                <tr className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                  <th className="py-3 px-4 text-left font-semibold">Title</th>
                  <th className="py-3 px-4 text-left font-semibold">Category</th>
                  <th className="py-3 px-4 text-left font-semibold">Tags</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th className="py-3 px-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article._id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4">{article.title}</td>
                    <td className="py-3 px-4">{article.category ? article.category.category_name : 'N/A'}</td>
                    <td className="py-3 px-4">{article.tags.map(tag => tag.tag_name).join(', ')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${article.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : article.status === 'published' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {(article.status === 'draft' || article.status === 'denied') && (
                        <Link 
                          to={`/writer/edit-article/${article._id}`} 
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600 transition duration-200"
                        >
                          Edit
                        </Link>
                      )}
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

export default WriterDashboard;
