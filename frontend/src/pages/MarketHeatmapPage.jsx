import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import marketApiService from '../services/marketApiService';

const MarketHeatmapPage = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [holdingsSymbols, setHoldingsSymbols] = useState([]);
  
  // Filter & Sort states
  const [selectedSector, setSelectedSector] = useState('All');
  const [sortBy, setSortBy] = useState('change'); // 'change' | 'marketCap' | 'volume'
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [showHoldingsOnly, setShowHoldingsOnly] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const fetchMarketData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await marketApiService.getMarketHeatmapPageData();
        setHeatmapData(data.heatmapData || []);
        setTopGainers(data.topGainers || []);
        setTopLosers(data.topLosers || []);
        setWatchlistSymbols(data.watchlistSymbols || []);
        setHoldingsSymbols(data.holdingsSymbols || []);
      } catch (err) {
        setError('Failed to load market data for heatmap.');
        console.error('Error fetching market heatmap data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchMarketData();
    }
  }, [isAuthenticated]);

  // Get unique sectors
  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(heatmapData.map(item => item.sector).filter(Boolean))];
    return ['All', ...uniqueSectors.sort()];
  }, [heatmapData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...heatmapData];

    // Sector filter
    if (selectedSector !== 'All') {
      filtered = filtered.filter(item => item.sector === selectedSector);
    }

    // Watchlist filter
    if (showWatchlistOnly) {
      filtered = filtered.filter(item => watchlistSymbols.includes(item.symbol));
    }

    // Holdings filter
    if (showHoldingsOnly) {
      filtered = filtered.filter(item => holdingsSymbols.includes(item.symbol));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'marketCap':
          return (b.marketCap || 0) - (a.marketCap || 0);
        case 'volume':
          return (b.volume || 0) - (a.volume || 0);
        case 'change':
        default:
          return b.change - a.change;
      }
    });

    return filtered;
  }, [heatmapData, selectedSector, showWatchlistOnly, showHoldingsOnly, sortBy, watchlistSymbols, holdingsSymbols]);

  // Calculate gradient color based on %change
  // Color appears immediately when there's any change (even 0.1%)
  // Intensity increases with absolute change value
  const getGradientColor = (change) => {
    const absChange = Math.abs(change);
    const maxChange = 5; // Max change for full intensity (5%)
    
    // If change is exactly 0 or very close to 0, return neutral color
    if (absChange < 0.01) {
      return isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)';
    }
    
    // Calculate intensity based on absolute change (0% to 5%)
    const intensity = Math.min(absChange / maxChange, 1); // 0 to 1
    const opacity = 0.2 + (intensity * 0.8); // 0.2 to 1.0 (minimum opacity for visibility)
    
    if (change > 0) {
      // Green gradient: #16a34a
      const r = 22;
      const g = 163;
      const b = 74;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else {
      // Red gradient: #dc2626
      const r = 220;
      const g = 38;
      const b = 38;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (!num || num === 0) return 'N/A';
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 dark:text-gray-300">Loading Market Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Market Heatmap
        </h1>
        
        {/* Legend */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <span className="text-xs text-gray-600 dark:text-gray-400">-5%</span>
          <div className="flex h-4 w-32 rounded overflow-hidden">
            <div className="flex-1 bg-gradient-to-r from-red-600 via-red-300 to-red-100"></div>
            <div className="flex-1 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex-1 bg-gradient-to-r from-green-100 via-green-300 to-green-600"></div>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">+5%</span>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="flex flex-wrap gap-4 items-center">
          {/* Sector Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sector:</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className={`px-3 py-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-3 py-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="change">% Change</option>
              <option value="marketCap">Market Cap</option>
              <option value="volume">Volume</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showWatchlistOnly}
                onChange={(e) => {
                  setShowWatchlistOnly(e.target.checked);
                  if (e.target.checked) setShowHoldingsOnly(false);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Watchlist Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHoldingsOnly}
                onChange={(e) => {
                  setShowHoldingsOnly(e.target.checked);
                  if (e.target.checked) setShowWatchlistOnly(false);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">My Holdings</span>
            </label>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAndSortedData.length > 0 ? (
            filteredAndSortedData.map((item) => {
              const isInWatchlist = watchlistSymbols.includes(item.symbol);
              const isInHoldings = holdingsSymbols.includes(item.symbol);
              const bgColor = getGradientColor(item.change);
              const isHovered = hoveredCard === item.symbol;

              return (
                <div key={item.symbol} className="relative">
                  <Link
                    to={`/stocks/${item.symbol}`}
                    className="block"
                    onMouseEnter={() => setHoveredCard(item.symbol)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div
                      className={`p-4 rounded-lg shadow-md transition-all cursor-pointer ${
                        isHovered ? 'shadow-xl scale-105' : 'hover:shadow-lg hover:scale-102'
                      } ${isInHoldings ? 'ring-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: bgColor }}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            {item.symbol}
                          </h3>
                          {isInWatchlist && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">⭐</span>
                          )}
                        </div>
                        {item.sector && item.sector !== 'N/A' && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {item.sector}
                          </span>
                        )}
                      </div>

                      {/* Price & Change */}
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${typeof item.currentPrice === 'number' ? item.currentPrice.toFixed(2) : item.currentPrice}
                        </p>
                        {item.change !== 0 && (
                          <p className={`text-lg font-bold ${
                            item.change > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                          }`}>
                            {item.change > 0 ? '🔼' : '🔽'} {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                          </p>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        {item.volumeFormatted && item.volumeFormatted !== 'N/A' && (
                          <p>Vol: {item.volumeFormatted}</p>
                        )}
                        {item.low > 0 && item.high > 0 && (
                          <p>Range: ${item.low.toFixed(2)} - ${item.high.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className={`absolute z-50 p-3 rounded-lg shadow-xl min-w-[200px] ${
                      isDark ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                    style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' }}>
                      <div className="text-sm space-y-1">
                        <p className="font-bold">{item.name} ({item.symbol})</p>
                        <p>Price: ${item.currentPrice?.toFixed(2) || 'N/A'}</p>
                        {item.open > 0 && <p>Open: ${item.open.toFixed(2)}</p>}
                        {item.high > 0 && <p>High: ${item.high.toFixed(2)}</p>}
                        {item.low > 0 && <p>Low: ${item.low.toFixed(2)}</p>}
                        {item.close > 0 && <p>Close: ${item.close.toFixed(2)}</p>}
                        {item.marketCap > 0 && (
                          <p>Market Cap: ${(item.marketCap / 1000000000).toFixed(2)}B</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className={`col-span-full text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No stocks found matching your filters.
            </p>
          )}
        </div>
      </div>

      {/* Top Gainers and Losers Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-4">Top Gainers</h2>
          <div className={`rounded-lg shadow-md p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {topGainers.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {topGainers.map((gainer) => (
                  <li key={gainer.symbol} className="py-3 flex justify-between items-center">
                    <Link to={`/stocks/${gainer.symbol}`} className="font-medium text-gray-900 dark:text-white hover:underline">
                      {gainer.name} ({gainer.symbol})
                    </Link>
                    <span className="text-green-600 font-semibold">+{gainer.change}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No top gainers data available.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-4">Top Losers</h2>
          <div className={`rounded-lg shadow-md p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {topLosers.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {topLosers.map((loser) => (
                  <li key={loser.symbol} className="py-3 flex justify-between items-center">
                    <Link to={`/stocks/${loser.symbol}`} className="font-medium text-gray-900 dark:text-white hover:underline">
                      {loser.name} ({loser.symbol})
                    </Link>
                    <span className="text-red-600 font-semibold">{loser.change}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No top losers data available.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarketHeatmapPage;
