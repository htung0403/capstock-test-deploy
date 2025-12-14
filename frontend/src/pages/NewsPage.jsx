/*
  File: frontend/src/pages/NewsPage.jsx
  Purpose: Professional financial news dashboard with modern UI/UX
  Date: 2025-11-17
  Updated: 2025-01-XX - Enhanced layout, badges, filters, and UX
*/

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  X,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Filter,
  Clock,
  TrendingUp,
  Flame
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import NewsCard from '../components/NewsCard';
import HeroCard from '../components/HeroCard';
import HighlightCard from '../components/HighlightCard';
import NewsCardSkeleton from '../components/NewsCardSkeleton';

const NewsPage = () => {
  const [articles, setArticles] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayCount, setDisplayCount] = useState(12); // Initial display count
  const [filterTime, setFilterTime] = useState('all'); // all, today, week
  const [filterPremium, setFilterPremium] = useState(false);
  const [filterAnalysis, setFilterAnalysis] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Category tabs - Dynamic based on actual categories from database
  const categoryTabs = useMemo(() => {
    const tabs = [{ id: 'all', name: 'Tất cả', categoryId: null }];
    
    // Add all categories from database as tabs
    if (categories && Array.isArray(categories) && categories.length > 0) {
      categories.forEach(cat => {
        if (cat && cat._id && cat.category_name) {
          tabs.push({
            id: cat._id,
            name: cat.category_name,
            categoryId: cat._id
          });
        }
      });
    }
    
    return tabs;
  }, [categories]);

  // Main categories (first 5) and more categories (rest)
  const mainCategories = useMemo(() => {
    return categoryTabs.slice(0, 6); // All + 5 main categories
  }, [categoryTabs]);

  const moreCategories = useMemo(() => {
    return categoryTabs.slice(6);
  }, [categoryTabs]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [articlesResponse, categoriesResponse] = await Promise.all([
          api.get('/news'),
          api.get('/categories').catch(() => ({ data: [] }))
        ]);
        
        setAllArticles(articlesResponse.data);
        setCategories(categoriesResponse.data);
      } catch (err) {
        console.error('Error fetching news articles:', err);
        setError('Không thể tải tin tức. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = [...allArticles];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => {
        if (!article.category) return false;
        
        const categoryId = typeof article.category === 'object' 
          ? article.category._id || article.category 
          : article.category;
        
        return categoryId === selectedCategory || 
               String(categoryId) === String(selectedCategory);
      });
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(article => 
        article.title?.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.content?.toLowerCase().includes(query) ||
        article.symbol?.toLowerCase().includes(query)
      );
    }

    // Time filter
    if (filterTime !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(article => {
        const articleDate = new Date(article.publishedAt || article.createdAt);
        if (filterTime === 'today') {
          return articleDate >= today;
        } else if (filterTime === 'week') {
          return articleDate >= weekAgo;
        }
        return true;
      });
    }

    // Premium filter
    if (filterPremium) {
      filtered = filtered.filter(article => article.isPremium === true);
    }

    // Analysis filter (articles with symbol or category contains "phân tích")
    if (filterAnalysis) {
      filtered = filtered.filter(article => 
        article.symbol || 
        article.category?.category_name?.toLowerCase().includes('phân tích') ||
        article.category?.category_name?.toLowerCase().includes('analysis')
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt);
      const dateB = new Date(b.publishedAt || b.createdAt);
      
      switch (sortBy) {
        case 'latest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'trending':
          const scoreA = (dateB - dateA) / 1000 + (a.thumbnail ? 1000 : 0) + (a.isPremium ? 500 : 0);
          const scoreB = (dateB - dateA) / 1000 + (b.thumbnail ? 1000 : 0) + (b.isPremium ? 500 : 0);
          return scoreB - scoreA;
        default:
          return dateB - dateA;
      }
    });

    return filtered;
  }, [allArticles, selectedCategory, debouncedSearch, sortBy, filterTime, filterPremium, filterAnalysis]);

  // Get featured articles (with badges logic)
  const featuredArticles = useMemo(() => {
    const withThumbnail = filteredArticles.filter(a => a.thumbnail);
    const withoutThumbnail = filteredArticles.filter(a => !a.thumbnail);
    const sorted = [...withThumbnail, ...withoutThumbnail];
    
    // Determine badges for featured articles
    const hero = sorted[0] || null;
    const highlights = sorted.slice(1, 4).map((article, index) => {
      // Assign badges: Breaking (recent), Editor's Pick (premium), Premium
      let badge = null;
      const articleDate = new Date(article.publishedAt || article.createdAt);
      const hoursAgo = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursAgo < 6) {
        badge = { type: 'breaking', label: '🔥 Breaking', color: 'bg-red-600' };
      } else if (article.isPremium && index === 0) {
        badge = { type: 'editor', label: '⭐ Editor\'s Pick', color: 'bg-purple-600' };
      } else if (article.isPremium) {
        badge = { type: 'premium', label: '💎 Premium', color: 'bg-gradient-to-r from-yellow-500 to-amber-500' };
      }
      
      return { ...article, badge };
    });
    
    return {
      hero: hero ? {
        ...hero,
        badge: hero.isPremium 
          ? { type: 'premium', label: '💎 Premium', color: 'bg-gradient-to-r from-yellow-500 to-amber-500' }
          : null
      } : null,
      highlights
    };
  }, [filteredArticles]);

  // Grid articles (exclude featured, with pagination)
  const gridArticles = useMemo(() => {
    const featuredIds = [
      featuredArticles.hero?._id,
      ...featuredArticles.highlights.map(a => a._id)
    ].filter(Boolean);
    
    const filtered = filteredArticles.filter(a => !featuredIds.includes(a._id));
    return filtered.slice(0, displayCount);
  }, [filteredArticles, featuredArticles, displayCount]);

  const hasMore = useMemo(() => {
    const featuredIds = [
      featuredArticles.hero?._id,
      ...featuredArticles.highlights.map(a => a._id)
    ].filter(Boolean);
    const totalFiltered = filteredArticles.filter(a => !featuredIds.includes(a._id)).length;
    return displayCount < totalFiltered;
  }, [filteredArticles, featuredArticles, displayCount]);

  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + 12);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const categoryDropdown = event.target.closest('.category-dropdown');
      const filterDropdown = event.target.closest('.filter-dropdown');
      
      if (!categoryDropdown && !filterDropdown) {
        setShowMoreCategories(false);
        setShowFilterDropdown(false);
      }
    };
    
    if (showMoreCategories || showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreCategories, showFilterDropdown]);

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${
        isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className={`h-12 w-64 rounded mb-4 ${isDark ? 'bg-slate-800' : 'bg-gray-200'} animate-pulse`} />
            <div className={`h-6 w-96 rounded ${isDark ? 'bg-slate-800' : 'bg-gray-200'} animate-pulse`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <NewsCardSkeleton key={i} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <p className="text-xl font-semibold mb-2 text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* ============================================
          TIER 1: HERO / FEATURED SECTION
          ============================================ */}
      {featuredArticles.hero && (
        <div className={`border-b ${
          isDark ? 'border-slate-800/50' : 'border-gray-200'
        }`}>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
              <h2 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                NỔI BẬT
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Hero Card - Full width on large screens */}
              <div className="lg:col-span-2">
                <HeroCard article={featuredArticles.hero} isDark={isDark} />
              </div>

              {/* Highlights - 2-3 cards on the right */}
              <div className="flex flex-col gap-3">
                {featuredArticles.highlights.map((article) => (
                  <HighlightCard 
                    key={article._id} 
                    article={article} 
                    isDark={isDark}
                    badge={article.badge}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          TIER 2: CATEGORY NAV + SEARCH
          ============================================ */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur-md ${
        isDark 
          ? 'bg-slate-900/95 border-slate-800' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="container mx-auto px-4 py-4">
          {/* Category Navigation */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide scroll-smooth">
            {/* Main Categories */}
            {mainCategories.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === tab.id
                    ? isDark
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50'
                      : 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300/50'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={`Filter by ${tab.name}`}
              >
                {tab.name}
              </button>
            ))}

            {/* More Categories Dropdown */}
            {moreCategories.length > 0 && (
              <div className="relative category-dropdown">
                <button
                  onClick={() => {
                    setShowMoreCategories(!showMoreCategories);
                    setShowFilterDropdown(false);
                  }}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1 ${
                    showMoreCategories
                      ? isDark
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-blue-500 text-white shadow-lg'
                      : isDark
                        ? 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Thêm <ChevronDown className={`w-4 h-4 transition-transform ${showMoreCategories ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showMoreCategories && moreCategories.length > 0 && (
                  <div 
                    className={`absolute top-full left-0 mt-2 rounded-lg shadow-xl border z-[60] min-w-[200px] max-h-[300px] overflow-y-auto ${
                      isDark
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-white border-gray-200'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {moreCategories.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(tab.id);
                          setShowMoreCategories(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedCategory === tab.id
                            ? isDark
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : isDark
                              ? 'text-gray-300 hover:bg-slate-700'
                              : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Tìm theo cổ phiếu (AAPL), chủ đề (AI), thị trường (VN-Index)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                aria-label="Search articles"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative filter-dropdown">
              <button
                onClick={() => {
                  setShowFilterDropdown(!showFilterDropdown);
                  setShowMoreCategories(false);
                }}
                className={`px-4 py-2.5 rounded-lg border flex items-center gap-2 ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                } transition-colors ${(filterTime !== 'all' || filterPremium || filterAnalysis) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Lọc</span>
              </button>

              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <div className={`absolute top-full right-0 mt-2 rounded-lg shadow-xl border z-50 min-w-[250px] p-4 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-gray-200'
                }`}>
                <div className="space-y-3">
                  {/* Time Filter */}
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      ⏱ Thời gian
                    </label>
                    <select
                      value={filterTime}
                      onChange={(e) => setFilterTime(e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border text-sm ${
                        isDark
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">Tất cả</option>
                      <option value="today">Hôm nay</option>
                      <option value="week">Tuần này</option>
                    </select>
                  </div>

                  {/* Premium Filter */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filterPremium"
                      checked={filterPremium}
                      onChange={(e) => setFilterPremium(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <label htmlFor="filterPremium" className={`text-sm font-medium cursor-pointer ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      💎 Premium only
                    </label>
                  </div>

                  {/* Analysis Filter */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filterAnalysis"
                      checked={filterAnalysis}
                      onChange={(e) => setFilterAnalysis(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <label htmlFor="filterAnalysis" className={`text-sm font-medium cursor-pointer ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📊 Analysis only
                    </label>
                  </div>
                </div>
                </div>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-4 py-2.5 rounded-lg border ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium`}
              aria-label="Sort articles"
            >
              <option value="latest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="trending">Đang hot</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================
          TIER 3: CONTENT FEED
          ============================================ */}
      <div className="container mx-auto px-4 py-8">
        {/* News Grid */}
        {gridArticles.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-xl font-semibold mb-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {searchQuery ? 'Không tìm thấy bài viết nào' : 'Không có bài viết nào'}
            </p>
            <p className={`text-sm ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy thử chọn chuyên mục khác'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridArticles.map((article) => (
                <NewsCard key={article._id} article={article} isDark={isDark} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                  } shadow-md hover:shadow-lg`}
                >
                  Tải thêm bài viết
                </button>
              </div>
            )}

            {/* Results Count */}
            {filteredArticles.length > 0 && (
              <div className={`mt-6 text-center text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Hiển thị {gridArticles.length} / {filteredArticles.length} bài viết
              </div>
            )}
          </>
        )}
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-all ${
          isDark
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        } hover:scale-110 z-40`}
        aria-label="Scroll to top"
      >
        <ArrowRight className="w-5 h-5 rotate-[-90deg]" />
      </button>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default NewsPage;
