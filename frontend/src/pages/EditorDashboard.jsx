/*
  File: frontend/src/pages/EditorDashboard.jsx
  Purpose: Enhanced Editor Dashboard with tabs, overview cards, advanced table management, review drawer, and improved UX
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Tab state
  const [activeTab, setActiveTab] = useState('pending');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Sort state
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Review drawer state
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [selectedArticleForReview, setSelectedArticleForReview] = useState(null);
  const [reviewDenyReason, setReviewDenyReason] = useState('');

  // Force delete state
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
  const [selectedArticleForDelete, setSelectedArticleForDelete] = useState(null);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState('');
  const [forceDeleteReason, setForceDeleteReason] = useState('');

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);

  // Available filters
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pendingRes, deleteRes, reviewedRes] = await Promise.all([
        api.get('/editor/pending'),
        api.get('/editor/delete-requests'),
        api.get('/editor/reviewed-by-me'),
      ]);
      
      setPendingArticles(pendingRes.data || []);
      setDeleteRequests(deleteRes.data || []);
      setReviewedByMe(reviewedRes.data || []);

      // Fetch all articles (admin only)
      const isAdmin = user?.role === 'ADMIN' || user?.roles?.includes('ADMIN');
      if (isAdmin) {
        try {
          const allRes = await api.get('/writer/all-articles');
          setAllArticles(allRes.data || []);
        } catch (err) {
          if (err?.response?.status !== 401) {
            console.error('Error fetching all articles:', err);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching editor data:", err);
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || `Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch categories and authors for filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesRes] = await Promise.all([
          api.get('/categories'),
        ]);
        setCategories(categoriesRes.data || []);
        
        // Extract unique authors from all articles
        const allArticlesData = [...pendingArticles, ...deleteRequests, ...reviewedByMe, ...allArticles];
        const uniqueAuthors = Array.from(
          new Map(
            allArticlesData
              .filter(a => a.author)
              .map(a => [a.author._id || a.author, a.author])
          ).values()
        );
        setAuthors(uniqueAuthors);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    if (pendingArticles.length > 0 || deleteRequests.length > 0 || reviewedByMe.length > 0 || allArticles.length > 0) {
      fetchFilters();
    }
  }, [pendingArticles, deleteRequests, reviewedByMe, allArticles]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setLoading(false);
      setError("Please log in to view editor dashboard.");
      toast.info("Please log in to view editor dashboard.");
    }
  }, [user, fetchAllData]);

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const pending = pendingArticles.length;
    const deleteReqs = deleteRequests.length;
    
    // Published today/this week
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const publishedToday = reviewedByMe.filter(a => 
      a.status === 'published' && 
      a.publishedAt && 
      new Date(a.publishedAt) >= todayStart
    ).length;
    const publishedThisWeek = reviewedByMe.filter(a => 
      a.status === 'published' && 
      a.publishedAt && 
      new Date(a.publishedAt) >= weekStart
    ).length;
    
    // Denied this week
    const deniedThisWeek = reviewedByMe.filter(a => 
      a.status === 'denied' && 
      a.reviewedAt && 
      new Date(a.reviewedAt) >= weekStart
    ).length;

    return { pending, deleteReqs, publishedToday, publishedThisWeek, deniedThisWeek };
  }, [pendingArticles, deleteRequests, reviewedByMe]);

  // Get current tab articles
  const getCurrentTabArticles = () => {
    switch (activeTab) {
      case 'pending':
        return pendingArticles;
      case 'delete-requests':
        return deleteRequests;
      case 'reviewed':
        return reviewedByMe;
      case 'all':
        return allArticles;
      default:
        return [];
    }
  };

  // Filter and sort articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = [...getCurrentTabArticles()];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(a => a.status === selectedStatus);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(a =>
        a.category?._id === selectedCategory || a.category?._id?.toString() === selectedCategory
      );
    }

    // Author filter
    if (selectedAuthor) {
      filtered = filtered.filter(a =>
        a.author?._id === selectedAuthor || a.author?._id?.toString() === selectedAuthor
      );
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(a => new Date(a.createdAt) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => new Date(a.createdAt) <= endDate);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortField) {
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'author':
          aValue = (a.author?.pen_name || a.author?.username || '').toLowerCase();
          bValue = (b.author?.pen_name || b.author?.username || '').toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [activeTab, pendingArticles, deleteRequests, reviewedByMe, allArticles, searchQuery, selectedStatus, selectedCategory, selectedAuthor, dateRange, sortField, sortOrder]);

  // Pagination
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedArticles.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedArticles, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedArticles.length / pageSize);

  // Handlers
  const handleOpenReview = (article) => {
    setSelectedArticleForReview(article);
    setReviewDrawerOpen(true);
    setReviewDenyReason('');
  };

  const handleApproveArticle = async () => {
    if (!selectedArticleForReview) return;
    
    try {
      await api.put(`/editor/approve/${selectedArticleForReview._id}`, {
        category: selectedArticleForReview.category?._id,
        tags: selectedArticleForReview.tags?.map(t => t._id),
        publishedAt: new Date().toISOString(),
        isPremium: selectedArticleForReview.isPremium,
        symbol: selectedArticleForReview.symbol,
        thumbnail: selectedArticleForReview.thumbnail,
      });
      toast.success('Article approved and published');
      setReviewDrawerOpen(false);
      setSelectedArticleForReview(null);
      fetchAllData();
    } catch (err) {
      console.error('Error approving article:', err);
      toast.error(err?.response?.data?.message || `Failed to approve article: ${err.message}`);
    }
  };

  const handleDenyArticle = async () => {
    if (!selectedArticleForReview || !reviewDenyReason.trim()) {
      toast.warning('Please provide a reason for denial');
      return;
    }
    
    try {
      await api.put(`/editor/reject/${selectedArticleForReview._id}`, {
        note: reviewDenyReason,
      });
      toast.success('Article rejected');
      setReviewDrawerOpen(false);
      setSelectedArticleForReview(null);
      setReviewDenyReason('');
      fetchAllData();
    } catch (err) {
      console.error('Error rejecting article:', err);
      toast.error(err?.response?.data?.message || `Failed to reject article: ${err.message}`);
    }
  };

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

  const handleOpenForceDelete = (article) => {
    setSelectedArticleForDelete(article);
    setForceDeleteOpen(true);
    setForceDeleteConfirm('');
    setForceDeleteReason('');
  };

  const handleForceDelete = async () => {
    if (!selectedArticleForDelete) return;
    
    if (forceDeleteConfirm !== 'DELETE' && forceDeleteConfirm !== selectedArticleForDelete.title) {
      toast.warning('Please type "DELETE" or the article title to confirm');
      return;
    }

    if (!forceDeleteReason.trim()) {
      toast.warning('Please provide a reason for force deletion');
      return;
    }

    try {
      await api.delete(`/admin/article/${selectedArticleForDelete._id}`, {
        data: { reason: forceDeleteReason },
      });
      toast.success('Article permanently deleted');
      setForceDeleteOpen(false);
      setSelectedArticleForDelete(null);
      setForceDeleteConfirm('');
      setForceDeleteReason('');
      fetchAllData();
    } catch (err) {
      console.error('Error force deleting article:', err);
      toast.error(err?.response?.data?.message || `Failed to delete article: ${err.message}`);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderStatusBadge = (status, article = null) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: '⏳',
        tooltip: 'Waiting for review'
      },
      published: { 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: '✅',
        tooltip: 'Published and live'
      },
      draft: { 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: '📝',
        tooltip: 'Draft'
      },
      denied: { 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: '❌',
        tooltip: article?.note || 'Rejected'
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}
        title={config.tooltip}
      >
        <span>{config.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateWithTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const getAuthorDisplay = (author) => {
    if (!author) return { name: 'Unknown', avatar: null };
    return {
      name: author.pen_name || author.username || 'Unknown',
      avatar: author.avatar || null,
    };
  };

  const renderRowActions = (article) => {
    if (activeTab === 'pending') {
      return (
        <button
          onClick={() => handleOpenReview(article)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Open Review
        </button>
      );
    } else if (activeTab === 'delete-requests') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleApproveDeleteRequest(article._id, article.title)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => handleRejectDeleteRequest(article._id)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
          >
            Reject
          </button>
        </div>
      );
    } else if (activeTab === 'all' && (user?.role === 'ADMIN' || user?.roles?.includes('ADMIN'))) {
      return (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === article._id ? null : article._id);
            }}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              openDropdown === article._id ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <span className="text-lg">⋯</span>
          </button>
          {openDropdown === article._id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenDropdown(null)}
              />
              <div className={`absolute right-0 mt-1 w-48 rounded-md shadow-lg z-20 ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/editor/review-article/${article._id}`);
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <span>👁️</span>
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenForceDelete(article);
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span>🗑️</span>
                    Force Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className={`h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4`}></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-24 bg-gray-300 dark:bg-gray-700 rounded`}></div>
              ))}
            </div>
            <div className={`h-96 bg-gray-300 dark:bg-gray-700 rounded`}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pendingArticles.length && !deleteRequests.length && !reviewedByMe.length) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full p-6 rounded-lg border ${
          isDark ? 'bg-slate-800 border-red-500/50' : 'bg-white border-red-200'
        }`}>
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Error Loading Dashboard
            </h3>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {error}
            </p>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <h2 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Editor Dashboard
        </h2>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Pending
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.pending}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Delete Requests
            </div>
            <div className={`text-2xl font-bold ${
              overviewStats.deleteReqs > 0 ? 'text-orange-600' : isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.deleteReqs}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Published This Week
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.publishedThisWeek}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Denied This Week
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.deniedThisWeek}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`mb-6 border-b ${
          isDark ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { key: 'pending', label: 'Need Review', count: pendingArticles.length },
              { key: 'delete-requests', label: 'Delete Requests', count: deleteRequests.length },
              { key: 'reviewed', label: 'Reviewed By Me', count: reviewedByMe.length },
              ...((user?.role === 'ADMIN' || user?.roles?.includes('ADMIN')) ? [{ key: 'all', label: 'All', count: allArticles.length }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? isDark
                      ? 'border-blue-400 text-blue-400'
                      : 'border-blue-600 text-blue-600'
                    : isDark
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? isDark ? 'bg-blue-900/30' : 'bg-blue-100'
                    : isDark ? 'bg-slate-700' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Search by Title
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search articles..."
                className={`w-full px-3 py-2 rounded border ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 rounded border ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="denied">Denied</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 rounded border ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, start: e.target.value });
                    setCurrentPage(1);
                  }}
                  className={`flex-1 px-3 py-2 rounded border text-sm ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, end: e.target.value });
                    setCurrentPage(1);
                  }}
                  className={`flex-1 px-3 py-2 rounded border text-sm ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedStatus || selectedCategory || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('');
                setSelectedCategory('');
                setDateRange({ start: '', end: '' });
                setCurrentPage(1);
              }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className={`rounded-lg border overflow-hidden ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className={`sticky top-0 z-10 ${
                isDark ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <tr>
                  <th
                    className="py-3 px-4 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-2">
                      Title
                      {sortField === 'title' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={() => handleSort('author')}
                  >
                    <div className="flex items-center gap-2">
                      Author
                      {sortField === 'author' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">Category</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th
                    className="py-3 px-4 text-left font-semibold cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {sortField === 'createdAt' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {activeTab === 'delete-requests' && (
                    <>
                      <th className="py-3 px-4 text-left font-semibold">Requested By</th>
                      <th className="py-3 px-4 text-left font-semibold">Reason</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'delete-requests' ? 8 : 6} className="py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="text-4xl mb-4">📭</div>
                        <p className={`text-lg font-medium mb-2 ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          No articles found
                        </p>
                        <button
                          onClick={fetchAllData}
                          className="mt-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedArticles.map((article, idx) => {
                    const author = getAuthorDisplay(article.author);
                    return (
                      <tr
                        key={article._id}
                        className={`border-b transition-colors ${
                          isDark
                            ? idx % 2 === 0 ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700'
                            : idx % 2 === 0 ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className={`font-medium mb-1 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              {article.title || 'Untitled'}
                            </div>
                            <div className={`text-xs ${
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {article.category?.category_name || 'No category'} • {author.name} • {formatDate(article.createdAt)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {author.avatar ? (
                              <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {author.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{author.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {article.category?.category_name || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(article.status, article)}
                        </td>
                        <td className="py-3 px-4">
                          <div className={`text-sm ${
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`} title={`Created at ${formatDateWithTime(article.createdAt)} (UTC+7)`}>
                            {formatDate(article.createdAt)}
                          </div>
                        </td>
                        {activeTab === 'delete-requests' && (
                          <>
                            <td className="py-3 px-4">
                              {article.deleteRequest?.requestedBy ? 
                                (article.deleteRequest.requestedBy.pen_name || article.deleteRequest.requestedBy.username) : 
                                'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-sm ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {article.deleteRequest?.reason || 'No reason provided'}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4">
                          {renderRowActions(article)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`px-4 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedArticles.length)} of {filteredAndSortedArticles.length} articles
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Previous
              </button>
              <span className={`text-sm px-3 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage >= totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Drawer */}
      {reviewDrawerOpen && selectedArticleForReview && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setReviewDrawerOpen(false)} />
          <div className={`relative ml-auto w-full max-w-2xl h-full overflow-y-auto ${
            isDark ? 'bg-slate-900' : 'bg-white'
          } shadow-xl`}>
            <div className={`sticky top-0 z-10 p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Review Article
              </h3>
              <button
                onClick={() => setReviewDrawerOpen(false)}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedArticleForReview.title}
                </h4>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p>Author: {getAuthorDisplay(selectedArticleForReview.author).name}</p>
                  <p>Category: {selectedArticleForReview.category?.category_name || 'N/A'}</p>
                  <p>Created: {formatDateWithTime(selectedArticleForReview.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <h5 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Summary</h5>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {selectedArticleForReview.summary || 'No summary'}
                </p>
              </div>

              <div>
                <h5 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Content</h5>
                <div 
                  className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}
                  dangerouslySetInnerHTML={{ __html: selectedArticleForReview.content || '' }}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Deny Reason (required if rejecting)
                  </label>
                  <textarea
                    value={reviewDenyReason}
                    onChange={(e) => setReviewDenyReason(e.target.value)}
                    placeholder="Enter reason for denial..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded border ${
                      isDark
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleApproveArticle}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
                  >
                    ✅ Approve & Publish
                  </button>
                  <button
                    onClick={handleDenyArticle}
                    disabled={!reviewDenyReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ❌ Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Force Delete Modal */}
      {forceDeleteOpen && selectedArticleForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setForceDeleteOpen(false)} />
          <div className={`relative w-full max-w-md p-6 rounded-lg border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          } shadow-xl`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Force Delete Article
            </h3>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              This action cannot be undone. Type <strong>"DELETE"</strong> or the article title to confirm.
            </p>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Confirmation
                </label>
                <input
                  type="text"
                  value={forceDeleteConfirm}
                  onChange={(e) => setForceDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE" or article title'
                  className={`w-full px-3 py-2 rounded border ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-red-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Reason (required)
                </label>
                <textarea
                  value={forceDeleteReason}
                  onChange={(e) => setForceDeleteReason(e.target.value)}
                  placeholder="Enter reason for force deletion..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded border ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-red-500`}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setForceDeleteOpen(false);
                    setSelectedArticleForDelete(null);
                    setForceDeleteConfirm('');
                    setForceDeleteReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceDelete}
                  disabled={forceDeleteConfirm !== 'DELETE' && forceDeleteConfirm !== selectedArticleForDelete.title || !forceDeleteReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Force Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorDashboard;
