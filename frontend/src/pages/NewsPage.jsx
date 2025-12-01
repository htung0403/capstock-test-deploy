/*
  File: frontend/src/pages/NewsPage.jsx
  Purpose: Professional financial news dashboard with modern UI/UX
  Date: 2025-11-17
*/

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X,
  Sparkles,
  ArrowRight
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

    // Category filter - Use exact category ID match
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => {
        if (!article.category) return false;
        
        // Handle both cases: category as object (populated) or as string ID
        const categoryId = typeof article.category === 'object' 
          ? article.category._id || article.category 
          : article.category;
        
        return categoryId === selectedCategory || 
               String(categoryId) === String(selectedCategory);
      });
    }

    // Search filter (using debounced search)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(article => 
        article.title?.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.content?.toLowerCase().includes(query)
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
          // Simple trending: recent + has thumbnail
          const scoreA = (dateB - dateA) / 1000 + (a.thumbnail ? 1000 : 0);
          const scoreB = (dateB - dateA) / 1000 + (b.thumbnail ? 1000 : 0);
          return scoreB - scoreA;
        default:
          return dateB - dateA;
      }
    });

    return filtered;
  }, [allArticles, selectedCategory, debouncedSearch, sortBy]);

  // Get featured articles
  const featuredArticles = useMemo(() => {
    const withThumbnail = filteredArticles.filter(a => a.thumbnail);
    const withoutThumbnail = filteredArticles.filter(a => !a.thumbnail);
    const sorted = [...withThumbnail, ...withoutThumbnail];
    return {
      hero: sorted[0] || null,
      highlights: sorted.slice(1, 5)
    };
  }, [filteredArticles]);

  // Grid articles (exclude featured)
  const gridArticles = useMemo(() => {
    const featuredIds = [
      featuredArticles.hero?._id,
      ...featuredArticles.highlights.map(a => a._id)
    ].filter(Boolean);
    
    return filteredArticles.filter(a => !featuredIds.includes(a._id));
  }, [filteredArticles, featuredArticles]);


  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${
        isDark ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className={`h-12 w-64 rounded mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`} />
            <div className={`h-6 w-96 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`} />
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
        isDark ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-gray-900'
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
      isDark ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-gray-900'
    }`}>
    

      {/* Category Navigation - Sticky */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur-md ${
        isDark 
          ? 'bg-[#0f172a]/95 border-gray-800' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="container mx-auto px-4 py-4">
          {/* Primary Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-2 scroll-smooth">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-6 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === tab.id
                    ? isDark
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-blue-500 text-white shadow-lg'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={`Filter by ${tab.name}`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Tìm kiếm bài viết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
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

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-800/50 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Sort articles"
            >
              <option value="latest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="trending">Đang hot</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Featured Section */}
        {featuredArticles.hero && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
              <h2 className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                NỔI BẬT
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Hero Card */}
              <div className="lg:col-span-2">
                <HeroCard article={featuredArticles.hero} isDark={isDark} />
              </div>

              {/* Highlights */}
              <div className="flex flex-col gap-3">
                {featuredArticles.highlights.slice(0, 2).map((article) => (
                  <HighlightCard 
                    key={article._id} 
                    article={article} 
                    isDark={isDark} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* News Grid */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-xl font-medium mb-2 ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridArticles.map((article) => (
              <NewsCard key={article._id} article={article} isDark={isDark} />
            ))}
          </div>
        )}

        {/* Results Count */}
        {filteredArticles.length > 0 && (
          <div className={`mt-8 text-center text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Hiển thị {filteredArticles.length} / {allArticles.length} bài viết
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-all ${
          isDark
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        } hover:scale-110`}
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
