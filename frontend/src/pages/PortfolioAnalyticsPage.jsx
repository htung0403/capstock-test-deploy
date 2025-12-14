import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import portfolioApiService from '../services/portfolioApiService';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import PortfolioSummaryCard from '../components/PortfolioSummaryCard';
import TransactionHistoryTable from '../components/TransactionHistoryTable';
import MiniSparkline from '../components/MiniSparkline';
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
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);

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

        // Fetch portfolio holdings for stock selection
        const portfolioResponse = await api.get('/portfolio');
        const holdings = portfolioResponse.data?.holdings || [];
        setPortfolioHoldings(holdings);
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
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-100'
    }`}>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className={`text-3xl font-bold mb-6 ${
          isDark ? 'text-white' : 'text-gray-800'
        }`}>
          My Portfolio Analytics
        </h1>

        {/* 1. Portfolio Summary */}
        <section className="mb-8">
          <PortfolioSummaryCard />
        </section>

        {/* 2. Watchlist Section with Mini Charts */}
        <section className="mb-8">
          <div className={`rounded-xl p-6 border transition-colors duration-300 ${
            isDark
              ? 'bg-white/10 border-white/20'
              : 'bg-white/80 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                My Watchlist
              </h2>
            </div>
            
            {/* Add Stock Form */}
            <form onSubmit={handleAddToWatchlist} className="mb-6 flex gap-2">
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
                  .filter(stock => !watchlist.includes(stock.symbol))
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

            {/* Watchlist Items with Mini Charts */}
            {watchlistStocks.length > 0 ? (
              <div className="space-y-2">
                {watchlistStocks.map((stock) => (
                  <Link
                    key={stock.symbol}
                    to={`/stocks/${stock.symbol}`}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all group ${
                      isDark
                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Mini Sparkline Chart */}
                      <div className="flex-shrink-0">
                        <MiniSparkline symbol={stock.symbol} width={80} height={30} />
                      </div>
                      
                      {/* Stock Info */}
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
                    </div>
                    
                    {/* Price and Change */}
                    <div className="text-right ml-4">
                      <div className={`font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {stock.currentPrice > 0 ? `$${stock.currentPrice.toFixed(2)}` : 'N/A'}
                      </div>
                      {stock.change !== 0 && (
                        <div className={`text-sm font-semibold ${
                          stock.change >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                  </Link>
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

        {/* 3. Portfolio Distribution by Stock */}
        <section className="mb-8">
          <h2 className={`text-2xl font-semibold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Portfolio Distribution by Stock
          </h2>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Click on a segment to view stock details
          </p>
          <div className={`rounded-xl p-6 border h-80 flex items-center justify-center ${
            isDark
              ? 'bg-white/10 border-white/20'
              : 'bg-white/80 border-gray-200'
          }`}>
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

        {/* 4. Transaction History - At the bottom */}
        <section className="mb-8">
          <TransactionHistoryTable sortBy="date" sortOrder="desc" />
        </section>


      </div>
    </div>
  );
};

export default PortfolioAnalyticsPage;
