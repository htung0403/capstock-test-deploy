/*
  File: frontend/src/pages/WriterDashboard.jsx
  Purpose: Dashboard page for Writers to view and manage their articles by status.
*/
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

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
      setError('Author ID is not available. Please login.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/writer/${user.id}`);
      setArticles(response.data);
    } catch (err) {
      console.error("Error fetching writer's articles:", err);
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || `Failed to fetch articles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      if (!user.id) {
        setError('Author ID is not available. Please login.');
        setLoading(false);
        return;
      }
      fetchArticles();
    } else {
      setLoading(false);
      setError("Please log in to view articles.");
      toast.info("Please log in to view articles.");
    }
  }, [user, fetchArticles]);

  const handleDeleteArticle = async (articleId, articleTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${articleTitle}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await api.delete(`/writer/article/${articleId}`);
      toast.success('Article deleted successfully');
      fetchArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      toast.error(err?.response?.data?.message || `Failed to delete article: ${err.message}`);
    }
  };

  const handleRequestDelete = async (articleId, articleTitle) => {
    const reason = window.prompt('Lý do xóa bài viết (tùy chọn):');
    
    try {
      await api.post(`/writer/article/${articleId}/request-delete`, { reason: reason || '' });
      toast.success('Delete request sent to editor');
      fetchArticles();
    } catch (err) {
      console.error('Error requesting deletion:', err);
      toast.error(err?.response?.data?.message || `Failed to request deletion: ${err.message}`);
    }
  };

  const handleSubmitForReview = async (articleId) => {
    try {
      await api.post(`/writer/article/${articleId}/submit`);
      toast.success('Article submitted for review');
      fetchArticles();
    } catch (err) {
      console.error('Error submitting article:', err);
      toast.error(err?.response?.data?.message || `Failed to submit article: ${err.message}`);
    }
  };

  const renderStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-200 text-yellow-800',
      published: 'bg-green-200 text-green-800',
      draft: 'bg-gray-200 text-gray-800',
      denied: 'bg-red-200 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-200 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderArticleTable = (title, articles, actions) => {
    if (articles.length === 0) return null;

    return (
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <h3 className={`text-xl font-semibold p-4 border-b ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
          {title} ({articles.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}>
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
                  <td className="py-3 px-4">{article.tags?.map(tag => tag.tag_name).join(', ') || 'N/A'}</td>
                  <td className="py-3 px-4">{renderStatusBadge(article.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 items-center flex-wrap">
                      {actions(article)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700 dark:text-gray-300">Loading articles...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  const publishedArticles = articles.filter(a => a.status === 'published');
  const draftArticles = articles.filter(a => a.status === 'draft');
  const pendingArticles = articles.filter(a => a.status === 'pending');
  const deniedArticles = articles.filter(a => a.status === 'denied');

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Writer Dashboard</h2>
          <Link 
            to="/writer/new-article" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Create New Article
          </Link>
        </div>

        {/* Published Articles */}
        {renderArticleTable(
          'Published Articles',
          publishedArticles,
          (article) => (
            <>
              <Link 
                to={`/writer/edit-article/${article._id}`} 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600 transition duration-200 text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => handleRequestDelete(article._id, article.title)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 transition duration-200 cursor-pointer text-sm"
                title="Request deletion"
              >
                Request Delete
              </button>
              {article.deleteRequest?.requested && (
                <span className="text-xs text-orange-600 dark:text-orange-400">Delete requested</span>
              )}
            </>
          )
        )}

        {/* Drafts */}
        {renderArticleTable(
          'Drafts',
          draftArticles,
          (article) => (
            <>
              <Link 
                to={`/writer/edit-article/${article._id}`} 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600 transition duration-200 text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => handleSubmitForReview(article._id)}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600 transition duration-200 cursor-pointer text-sm"
              >
                Submit for Review
              </button>
              <button
                onClick={() => handleDeleteArticle(article._id, article.title)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 transition duration-200 cursor-pointer text-sm"
              >
                Delete
              </button>
            </>
          )
        )}

        {/* Pending Review */}
        {renderArticleTable(
          'Pending Review',
          pendingArticles,
          (article) => (
            <span className="text-gray-500 dark:text-gray-400 text-sm">Waiting for editor review</span>
          )
        )}

        {/* Denied Articles */}
        {renderArticleTable(
          'Denied Articles',
          deniedArticles,
          (article) => (
            <>
              <Link 
                to={`/writer/edit-article/${article._id}`} 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600 transition duration-200 text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => handleSubmitForReview(article._id)}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600 transition duration-200 cursor-pointer text-sm"
              >
                Submit for Review
              </button>
              <button
                onClick={() => handleDeleteArticle(article._id, article.title)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 transition duration-200 cursor-pointer text-sm"
              >
                Delete
              </button>
            </>
          )
        )}

        {articles.length === 0 && (
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>No articles found.</p>
        )}
      </div>
    </div>
  );
}

export default WriterDashboard;
