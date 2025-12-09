/*
  File: frontend/src/pages/EditorDashboard.jsx
  Purpose: Dashboard page for Editors to review articles, handle delete requests, and view history.
*/
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function EditorDashboard() {
  const [pendingArticles, setPendingArticles] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [reviewedByMe, setReviewedByMe] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch pending articles
      const pendingRes = await api.get('/editor/pending');
      setPendingArticles(pendingRes.data);

      // Fetch delete requests
      const deleteRes = await api.get('/editor/delete-requests');
      setDeleteRequests(deleteRes.data);

      // Fetch reviewed by me
      const reviewedRes = await api.get('/editor/reviewed-by-me');
      setReviewedByMe(reviewedRes.data);

      // Fetch all articles (admin only)
      if (user?.role === 'ADMIN') {
        try {
          const allRes = await api.get('/writer/all-articles');
          setAllArticles(allRes.data);
        } catch (err) {
          console.error('Error fetching all articles:', err);
        }
      }
    } catch (err) {
      console.error("Error fetching editor data:", err);
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || `Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setLoading(false);
      setError("Please log in to view editor dashboard.");
      toast.info("Please log in to view editor dashboard.");
    }
  }, [user, fetchAllData]);

  const handleApproveDeleteRequest = async (articleId, articleTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${articleTitle}"?`)) {
      return;
    }

    try {
      await api.post(`/editor/delete-request/${articleId}/approve`);
      toast.success('Article deleted successfully');
      fetchAllData();
    } catch (err) {
      console.error('Error approving delete request:', err);
      toast.error(err?.response?.data?.message || `Failed to approve delete: ${err.message}`);
    }
  };

  const handleRejectDeleteRequest = async (articleId) => {
    try {
      await api.post(`/editor/delete-request/${articleId}/reject`);
      toast.success('Delete request rejected');
      fetchAllData();
    } catch (err) {
      console.error('Error rejecting delete request:', err);
      toast.error(err?.response?.data?.message || `Failed to reject delete request: ${err.message}`);
    }
  };

  const handleForceDelete = async (articleId, articleTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn bài viết "${articleTitle}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await api.delete(`/admin/article/${articleId}`);
      toast.success('Article permanently deleted');
      fetchAllData();
    } catch (err) {
      console.error('Error force deleting article:', err);
      toast.error(err?.response?.data?.message || `Failed to delete article: ${err.message}`);
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

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700 dark:text-gray-300">Loading editor dashboard...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <h2 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Editor Dashboard</h2>

        {/* Pending Articles (Need Review) */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <h3 className={`text-xl font-semibold p-4 border-b ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
            Pending Articles (Need Review) 
            <span className="ml-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-sm font-bold">
              {pendingArticles.length}
            </span>
          </h3>
          {pendingArticles.length === 0 ? (
            <p className={`p-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No pending articles for review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}>
                    <th className="py-3 px-4 text-left font-semibold">Title</th>
                    <th className="py-3 px-4 text-left font-semibold">Author</th>
                    <th className="py-3 px-4 text-left font-semibold">Category</th>
                    <th className="py-3 px-4 text-left font-semibold">Created At</th>
                    <th className="py-3 px-4 text-left font-semibold">Status</th>
                    <th className="py-3 px-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingArticles.map((article) => (
                    <tr key={article._id} className="border-b dark:border-gray-700 last:border-b-0">
                      <td className="py-3 px-4">{article.title}</td>
                      <td className="py-3 px-4">{article.author ? article.author.pen_name || article.author.username : 'N/A'}</td>
                      <td className="py-3 px-4">{article.category ? article.category.category_name : 'N/A'}</td>
                      <td className="py-3 px-4">{new Date(article.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{renderStatusBadge(article.status)}</td>
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

        {/* Delete Requests */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <h3 className={`text-xl font-semibold p-4 border-b ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
            Delete Requests ({deleteRequests.length})
          </h3>
          {deleteRequests.length === 0 ? (
            <p className={`p-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No delete requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}>
                    <th className="py-3 px-4 text-left font-semibold">Title</th>
                    <th className="py-3 px-4 text-left font-semibold">Author</th>
                    <th className="py-3 px-4 text-left font-semibold">Category</th>
                    <th className="py-3 px-4 text-left font-semibold">Published At</th>
                    <th className="py-3 px-4 text-left font-semibold">Requested By</th>
                    <th className="py-3 px-4 text-left font-semibold">Requested At</th>
                    <th className="py-3 px-4 text-left font-semibold">Reason</th>
                    <th className="py-3 px-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deleteRequests.map((article) => (
                    <tr key={article._id} className="border-b dark:border-gray-700 last:border-b-0">
                      <td className="py-3 px-4">{article.title}</td>
                      <td className="py-3 px-4">{article.author ? article.author.pen_name || article.author.username : 'N/A'}</td>
                      <td className="py-3 px-4">{article.category ? article.category.category_name : 'N/A'}</td>
                      <td className="py-3 px-4">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-3 px-4">{article.deleteRequest?.requestedBy ? (article.deleteRequest.requestedBy.pen_name || article.deleteRequest.requestedBy.username) : 'N/A'}</td>
                      <td className="py-3 px-4">{article.deleteRequest?.requestedAt ? new Date(article.deleteRequest.requestedAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-3 px-4">{article.deleteRequest?.reason || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveDeleteRequest(article._id, article.title)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectDeleteRequest(article._id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Articles Reviewed by Me */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <h3 className={`text-xl font-semibold p-4 border-b ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
            Articles Reviewed by Me ({reviewedByMe.length})
          </h3>
          {reviewedByMe.length === 0 ? (
            <p className={`p-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No articles reviewed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}>
                    <th className="py-3 px-4 text-left font-semibold">Title</th>
                    <th className="py-3 px-4 text-left font-semibold">Author</th>
                    <th className="py-3 px-4 text-left font-semibold">Category</th>
                    <th className="py-3 px-4 text-left font-semibold">Status</th>
                    <th className="py-3 px-4 text-left font-semibold">Reviewed At</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewedByMe.map((article) => (
                    <tr key={article._id} className="border-b dark:border-gray-700 last:border-b-0">
                      <td className="py-3 px-4">{article.title}</td>
                      <td className="py-3 px-4">{article.author ? article.author.pen_name || article.author.username : 'N/A'}</td>
                      <td className="py-3 px-4">{article.category ? article.category.category_name : 'N/A'}</td>
                      <td className="py-3 px-4">{renderStatusBadge(article.status)}</td>
                      <td className="py-3 px-4">{article.reviewedAt ? new Date(article.reviewedAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Articles (Admin only) */}
        {user?.role === 'ADMIN' && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <h3 className={`text-xl font-semibold p-4 border-b ${isDark ? 'border-gray-700 text-white' : 'border-gray-200 text-gray-800'}`}>
              All Articles (Admin) ({allArticles.length})
            </h3>
            {allArticles.length === 0 ? (
              <p className={`p-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No articles found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}>
                      <th className="py-3 px-4 text-left font-semibold">Title</th>
                      <th className="py-3 px-4 text-left font-semibold">Author</th>
                      <th className="py-3 px-4 text-left font-semibold">Category</th>
                      <th className="py-3 px-4 text-left font-semibold">Status</th>
                      <th className="py-3 px-4 text-left font-semibold">Published At</th>
                      <th className="py-3 px-4 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allArticles.map((article) => (
                      <tr key={article._id} className="border-b dark:border-gray-700 last:border-b-0">
                        <td className="py-3 px-4">{article.title}</td>
                        <td className="py-3 px-4">{article.author ? article.author.pen_name || article.author.username : 'N/A'}</td>
                        <td className="py-3 px-4">{article.category ? article.category.category_name : 'N/A'}</td>
                        <td className="py-3 px-4">{renderStatusBadge(article.status)}</td>
                        <td className="py-3 px-4">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleForceDelete(article._id, article.title)}
                            className="bg-red-800 hover:bg-red-900 text-white font-bold py-1 px-3 rounded text-sm transition duration-200"
                          >
                            Force Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorDashboard;
