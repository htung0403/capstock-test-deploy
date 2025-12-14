/*
  File: frontend/src/pages/WriterDashboard.jsx
  Purpose: Enhanced Writer Dashboard with overview cards, tabs, advanced table management (search, filter, sort, pagination, bulk actions)
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Tab state
  const [activeTab, setActiveTab] = useState('all');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Sort state
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk selection state
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Dropdown state for row actions
  const [openDropdown, setOpenDropdown] = useState(null);

  // Available categories and tags for filters
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

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

  // Fetch categories and tags for filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/tags'),
        ]);
        setCategories(categoriesRes.data || []);
        setTags(tagsRes.data || []);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    fetchFilters();
  }, []);

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

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const total = articles.length;
    const draft = articles.filter(a => a.status === 'draft').length;
    const pending = articles.filter(a => a.status === 'pending').length;
    const published = articles.filter(a => a.status === 'published').length;
    const rejected = articles.filter(a => a.status === 'denied').length;
    const deleteRequests = articles.filter(a => a.deleteRequest?.requested).length;

    return { total, draft, pending, published, rejected, deleteRequests };
  }, [articles]);

  // Filter and sort articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = [...articles];

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(a => a.status === activeTab);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(a =>
        a.category?._id === selectedCategory || a.category?._id?.toString() === selectedCategory
      );
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter(a =>
        a.tags?.some(tag =>
          tag._id === selectedTag || tag._id?.toString() === selectedTag
        )
      );
    }

    // Status filter (additional to tab)
    if (selectedStatus) {
      filtered = filtered.filter(a => a.status === selectedStatus);
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
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt || 0);
          bValue = new Date(b.updatedAt || 0);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [articles, activeTab, searchQuery, selectedCategory, selectedTag, selectedStatus, dateRange, sortField, sortOrder]);

  // Pagination
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedArticles.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedArticles, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedArticles.length / pageSize);

  // Handlers
  const handleDeleteArticle = async (articleId, articleTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${articleTitle}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await api.delete(`/writer/article/${articleId}`);
      toast.success('Article deleted successfully');
      fetchArticles();
      setSelectedArticles(new Set());
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

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedArticles.size === 0) {
      toast.warning('Please select at least one article');
      return;
    }

    const articleIds = Array.from(selectedArticles);
    const selectedArticlesData = articles.filter(a => articleIds.includes(a._id));
    
    try {
      switch (action) {
        case 'delete':
          // Only allow delete for non-published articles
          const nonPublishedForDelete = selectedArticlesData.filter(a => 
            a.status === 'draft' || a.status === 'denied'
          );
          if (nonPublishedForDelete.length === 0) {
            toast.warning('Delete is only available for Draft or Rejected articles');
            return;
          }
          if (nonPublishedForDelete.length < selectedArticlesData.length) {
            toast.warning(`Only ${nonPublishedForDelete.length} article(s) can be deleted. Published articles cannot be deleted directly.`);
          }
          if (!window.confirm(`Bạn có chắc chắn muốn xóa ${nonPublishedForDelete.length} bài viết?`)) return;
          await Promise.all(nonPublishedForDelete.map(a => api.delete(`/writer/article/${a._id}`)));
          toast.success(`${nonPublishedForDelete.length} articles deleted`);
          break;
        case 'request-delete':
          // Only allow request delete for published articles
          const publishedForDelete = selectedArticlesData.filter(a => 
            a.status === 'published' && !a.deleteRequest?.requested
          );
          if (publishedForDelete.length === 0) {
            toast.warning('Request Delete is only available for Published articles that have not already requested deletion');
            return;
          }
          if (publishedForDelete.length < selectedArticlesData.length) {
            toast.warning(`Only ${publishedForDelete.length} article(s) can request deletion.`);
          }
          const reason = window.prompt('Lý do xóa (tùy chọn):');
          await Promise.all(publishedForDelete.map(a => 
            api.post(`/writer/article/${a._id}/request-delete`, { reason: reason || '' })
          ));
          toast.success(`${publishedForDelete.length} delete requests sent`);
          break;
        case 'submit':
          // Only allow submit for draft/denied articles
          const canSubmit = selectedArticlesData.filter(a => 
            a.status === 'draft' || a.status === 'denied'
          );
          if (canSubmit.length === 0) {
            toast.warning('Submit for Review is only available for Draft or Rejected articles');
            return;
          }
          if (canSubmit.length < selectedArticlesData.length) {
            toast.warning(`Only ${canSubmit.length} article(s) can be submitted. Published or Pending articles cannot be submitted.`);
          }
          await Promise.all(canSubmit.map(a => api.post(`/writer/article/${a._id}/submit`)));
          toast.success(`${canSubmit.length} articles submitted for review`);
          break;
        default:
          break;
      }
      fetchArticles();
      setSelectedArticles(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      toast.error('Failed to perform bulk action');
    }
  };

  const toggleSelectArticle = (articleId) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedArticles.size === paginatedArticles.length) {
      setSelectedArticles(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedArticles(new Set(paginatedArticles.map(a => a._id)));
      setShowBulkActions(true);
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
        tooltip: 'Waiting for editor review'
      },
      published: { 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: '✅',
        tooltip: 'Published and live'
      },
      draft: { 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: '📝',
        tooltip: 'Draft - not submitted'
      },
      denied: { 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: '❌',
        tooltip: article?.note || 'Rejected by editor'
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

  const renderTags = (articleTags) => {
    if (!articleTags || articleTags.length === 0) return <span className="text-gray-400">No tags</span>;
    
    const maxVisible = 2;
    const visible = articleTags.slice(0, maxVisible);
    const remaining = articleTags.length - maxVisible;

    return (
      <div className="flex flex-wrap gap-1 items-center">
        {visible.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          >
            {tag.tag_name || tag}
          </span>
        ))}
        {remaining > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">+{remaining}</span>
        )}
      </div>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderRowActions = (article) => {
    const actions = [];
    
    // Edit is available for all statuses except pending
    if (article.status !== 'pending') {
      actions.push({
        label: 'Edit',
        onClick: () => navigate(`/writer/edit-article/${article._id}`),
        icon: '✏️',
      });
    }
    
    // Submit for Review and Delete only for non-published articles (draft, denied)
    if (article.status === 'draft' || article.status === 'denied') {
      actions.push({
        label: 'Submit for Review',
        onClick: () => handleSubmitForReview(article._id),
        icon: '📤',
      });
      actions.push({
        label: 'Delete',
        onClick: () => handleDeleteArticle(article._id, article.title),
        icon: '🗑️',
        danger: true,
      });
    } 
    // Published articles can only request delete (must wait for editor approval)
    else if (article.status === 'published') {
      // Only show Request Delete if not already requested
      if (!article.deleteRequest?.requested) {
        actions.push({
          label: 'Request Delete',
          onClick: () => handleRequestDelete(article._id, article.title),
          icon: '🗑️',
          danger: true,
        });
      }
    }
    // Pending articles have no actions (waiting for editor review)
    else if (article.status === 'pending') {
      // No actions available
    }

    // If no actions, return empty or a message
    if (actions.length === 0) {
      return (
        <span className={`text-xs ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {article.status === 'pending' ? 'Waiting for review' : 'No actions'}
        </span>
      );
    }

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
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                      action.danger
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
            isDark ? 'border-blue-400' : 'border-blue-600'
          }`}></div>
          <p>Loading articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Writer Dashboard
          </h2>
          <Link
            to="/writer/new-article"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Create New Article
          </Link>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Total Articles
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.total}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Draft
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.draft}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Pending Review
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.pending}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Published
            </div>
            <div className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.published}
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Delete Requests
            </div>
            <div className={`text-2xl font-bold ${
              overviewStats.deleteRequests > 0 ? 'text-orange-600' : isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {overviewStats.deleteRequests}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`mb-6 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { key: 'all', label: 'All' },
              { key: 'draft', label: 'Draft' },
              { key: 'pending', label: 'Pending' },
              { key: 'published', label: 'Published' },
              { key: 'denied', label: 'Rejected' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
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
                {tab.key !== 'all' && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? isDark ? 'bg-blue-900/30' : 'bg-blue-100'
                      : isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    {overviewStats[tab.key] || 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
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
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
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
                    ? 'bg-gray-700 border-gray-600 text-white'
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

            {/* Tag Filter */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Tag
              </label>
              <select
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2 rounded border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag._id} value={tag._id}>
                    {tag.tag_name}
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
                  className={`flex-1 px-3 py-2 rounded border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
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
                  className={`flex-1 px-3 py-2 rounded border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedCategory || selectedTag || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedTag('');
                setDateRange({ start: '', end: '' });
                setCurrentPage(1);
              }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center justify-between flex-wrap gap-3 ${
            isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
          }`}>
            <span className={`text-sm font-medium ${
              isDark ? 'text-blue-300' : 'text-blue-700'
            }`}>
              {selectedArticles.size} article(s) selected
            </span>
            <div className="flex gap-2 flex-wrap">
              {/* Submit for Review - only for draft/denied */}
              <button
                onClick={() => handleBulkAction('submit')}
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                title="Only available for Draft or Rejected articles"
              >
                Submit for Review
              </button>
              {/* Request Delete - only for published */}
              <button
                onClick={() => handleBulkAction('request-delete')}
                className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                title="Only available for Published articles"
              >
                Request Delete
              </button>
              {/* Delete - only for draft/denied */}
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Only available for Draft or Rejected articles"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedArticles(new Set());
                  setShowBulkActions(false);
                }}
                className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={`rounded-lg border overflow-hidden ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className={isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}>
                  <th className="py-3 px-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedArticles.size === paginatedArticles.length && paginatedArticles.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th
                    className="py-3 px-4 text-left font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-2">
                      Title
                      {sortField === 'title' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">Category</th>
                  <th className="py-3 px-4 text-left font-semibold">Tags</th>
                  <th className="py-3 px-4 text-left font-semibold">Status</th>
                  <th
                    className="py-3 px-4 text-left font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center gap-2">
                      Updated
                      {sortField === 'updatedAt' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No articles found
                    </td>
                  </tr>
                ) : (
                  paginatedArticles.map((article) => (
                    <tr
                      key={article._id}
                      className={`border-b transition-colors ${
                        isDark
                          ? 'border-gray-700 hover:bg-gray-700/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedArticles.has(article._id)}
                          onChange={() => toggleSelectArticle(article._id)}
                          className="rounded"
                        />
                      </td>
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
                            Updated: {formatDate(article.updatedAt)} • Created: {formatDate(article.createdAt)}
                          </div>
                          {article.deleteRequest?.requested && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ Delete requested
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {article.category?.category_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {renderTags(article.tags)}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(article.status, article)}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`text-sm ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {formatDate(article.updatedAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {renderRowActions(article)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`px-4 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-gray-700' : 'border-gray-200'
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
                    ? 'bg-gray-700 border-gray-600 text-white'
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
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
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
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WriterDashboard;
