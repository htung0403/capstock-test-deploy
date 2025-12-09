import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import portfolioApiService from '../services/portfolioApiService';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666', '#66CCFF', '#FFD700'];

const PortfolioAnalyticsPage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { show } = useToast();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistStocks, setWatchlistStocks] = useState([]); // Full stock info with prices
  const [availableStocks, setAvailableStocks] = useState([]); // All 25 stocks from database
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [addingSymbol, setAddingSymbol] = useState(false);
  const [stockDistribution, setStockDistribution] = useState([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchWatchlistWithStockInfo = async (symbols) => {
    if (!symbols || symbols.length === 0) {
      setWatchlistStocks([]);
      return;
    }

    try {
      // Fetch all stocks to get current prices
      const stocksResponse = await api.get('/stocks');
      const allStocks = stocksResponse.data;

      // Map watchlist symbols to full stock info
      const stocksWithInfo = symbols.map(symbol => {
        const stock = allStocks.find(s => s.symbol === symbol);
        return stock ? {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice || 0,
          change: stock.change || 0,
          changePct: stock.changePct || 0,
        } : {
          symbol,
          name: symbol,
          currentPrice: 0,
          change: 0,
          changePct: 0,
        };
      });

      setWatchlistStocks(stocksWithInfo);
    } catch (err) {
      console.error('Error fetching stock info for watchlist:', err);
      // Fallback to just symbols if stock info fetch fails
      setWatchlistStocks(symbols.map(s => ({ symbol: s, name: s, currentPrice: 0, change: 0, changePct: 0 })));
    }
  };

  useEffect(() => {
    const fetchPortfolioData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all available stocks (25 stocks)
        const stocksResponse = await api.get('/stocks');
        const allStocks = stocksResponse.data || [];
        setAvailableStocks(allStocks);

        const fetchedWatchlist = await portfolioApiService.getWatchlist();
        setWatchlist(fetchedWatchlist);
        await fetchWatchlistWithStockInfo(fetchedWatchlist);

        const fetchedStockDistribution = await portfolioApiService.getPortfolioDistributionByStock();
        setStockDistribution(fetchedStockDistribution);
      } catch (err) {
        setError('Failed to load portfolio analytics data.');
        console.error('Error fetching portfolio data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPortfolioData();
    }
  }, [isAuthenticated]); // Re-fetch when authenticated

  const handleAddToWatchlist = async (e) => {
    e.preventDefault();
    if (!selectedSymbol) {
      show('error', 'Please select a stock symbol');
      return;
    }

    // Check if already in watchlist
    if (watchlist.includes(selectedSymbol)) {
      show('error', `${selectedSymbol} is already in your watchlist`);
      return;
    }

    setAddingSymbol(true);
    try {
      const updatedWatchlist = await portfolioApiService.addToWatchlist(selectedSymbol);
      setWatchlist(updatedWatchlist);
      await fetchWatchlistWithStockInfo(updatedWatchlist);
      setSelectedSymbol('');
      show('success', `Added ${selectedSymbol} to watchlist`);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to add stock to watchlist';
      show('error', errorMsg);
    } finally {
      setAddingSymbol(false);
    }
  };

  const handleRemoveFromWatchlist = async (symbol) => {
    try {
      const updatedWatchlist = await portfolioApiService.removeFromWatchlist(symbol);
      setWatchlist(updatedWatchlist);
      await fetchWatchlistWithStockInfo(updatedWatchlist);
      show('success', `Removed ${symbol} from watchlist`);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Failed to remove stock from watchlist';
      show('error', errorMsg);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 dark:text-gray-300">Loading Portfolio Analytics...</p>
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
        My Portfolio Analytics
      </h1>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">My Watchlist</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Add Stock Form */}
          <form onSubmit={handleAddToWatchlist} className="mb-4 flex gap-2">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">-- Select a stock to add --</option>
              {availableStocks
                .filter(stock => !watchlist.includes(stock.symbol)) // Only show stocks not in watchlist
                .map(stock => (
                  <option key={stock._id || stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.name}
                  </option>
                ))}
            </select>
            <button
              type="submit"
              disabled={addingSymbol || !selectedSymbol}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                addingSymbol || !selectedSymbol
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {addingSymbol ? 'Adding...' : 'Add'}
            </button>
          </form>

          {/* Watchlist Items */}
          {watchlistStocks.length > 0 ? (
            <div className="space-y-2">
              {watchlistStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    isDark
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Link
                    to={`/stocks/${stock.symbol}`}
                    className="flex-1 flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <div className={`font-bold text-lg group-hover:text-blue-500 transition-colors ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {stock.symbol}
                      </div>
                      <div className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <div className={`font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {stock.currentPrice > 0 ? `$${stock.currentPrice.toFixed(2)}` : 'N/A'}
                      </div>
                      {stock.change !== 0 && (
                        <div className={`text-sm ${
                          stock.change >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveFromWatchlist(stock.symbol);
                    }}
                    className={`ml-4 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                    title="Remove from watchlist"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Your watchlist is empty. Add stocks to track them here.
            </p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Portfolio Distribution by Stock</h2>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Click on a segment to view stock details
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-80 flex items-center justify-center">
          {stockDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  onClick={(data) => {
                    if (data && data.name) {
                      navigate(`/stocks/${data.name}`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `$${value.toLocaleString()}`,
                    `${props.payload.name}: ${props.payload.percentage}%`
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No stock distribution data available. Start investing to see your portfolio distribution.
            </p>
          )}
        </div>
      </section>

    </div>
  );
};

export default PortfolioAnalyticsPage;
