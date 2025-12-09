import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Link } from "react-router-dom";
import api from "../services/api";
import BuyModal from "../components/BuyModal";
import SellModal from "../components/SellModal";
import MarketSummarySection from "../components/MarketSummarySection"; // Import new component
import TopNewsSection from "../components/TopNewsSection"; // Import TopNewsSection

const Dashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [error, setError] = useState("");
  // New states for transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState("");
  
  // Sell modal state
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState(null);
  
  // Buy modal state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  
  const isDark = theme === 'dark';

  const openSellModal = (holding) => {
    setSelectedHolding(holding);
    setShowSellModal(true);
  };

  const closeSellModal = () => {
    setShowSellModal(false);
    setSelectedHolding(null);
  };

  const openBuyModal = (stock) => {
    setSelectedStock(stock);
    setShowBuyModal(true);
  };

  const closeBuyModal = () => {
    setShowBuyModal(false);
    setSelectedStock(null);
  };

  const handleSellSuccess = () => {
    // Refresh portfolio after selling
    fetchPortfolio();
  };

  const handleBuySuccess = () => {
    // Refresh portfolio and user data after buying
    fetchPortfolio();
    refreshUser();
  };

  useEffect(() => {
    fetchStocks();
    if (user) {
      fetchPortfolio();
      fetchTransactions(); // Call fetchTransactions
    }
  }, [user]);

  const fetchStocks = async () => {
    try {
      const response = await api.get("/stocks");
      setStocks(response.data);
    } catch (err) {
      setError("Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    setPortfolioLoading(true); // Start loading before API call
    try {
      const response = await api.get("/portfolio");
      setPortfolio(response.data.holdings || []); // Correctly set portfolio to the holdings array
    } catch (err) {
      console.error("Failed to fetch portfolio for Dashboard:", err);
      setError("Failed to load portfolio for Dashboard."); // Set an error message
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await api.get("/transactions");
      setTransactions(response.data);
    } catch (err) {
      console.error("Failed to fetch transactions for Dashboard:", err);
      setTransactionsError("Failed to load recent transactions.");
    } finally {
      setTransactionsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' 
          : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-100'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
            isDark ? 'border-blue-400' : 'border-blue-600'
          }`}></div>
          <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-100'
    }`}>
      {/* Hero header */}
      <section className="container mx-auto px-4 pt-8 pb-4">
        <div className={`backdrop-blur-sm rounded-xl p-6 border overflow-hidden relative transition-all duration-300 ${
          isDark 
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/60 border-blue-200/50 shadow-lg'
        }`}>
          <div className={`absolute inset-0 ${
            isDark 
              ? 'bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10' 
              : 'bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5'
          }`}></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className={`text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Welcome back, {user?.username}
              </h1>
              <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                Your personalized trading overview
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="container mx-auto px-4 pb-8">
        {/* Market Overview Snapshot */}
        <MarketSummarySection />

        {error && (
          <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
            isDark 
              ? 'bg-red-500/10 border-red-500/25 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stocks Section */}
          <div className={`lg:col-span-2 backdrop-blur-sm rounded-xl p-6 border transition-colors duration-300 ${
            isDark 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-xl font-bold transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Market Watch</h2>
                <p className={`text-sm transition-colors duration-300 ${
                  isDark ? 'text-slate-300' : 'text-gray-600'
                }`}>Top tickers</p>
              </div>
            </div>
            {stocks.length > 0 ? (
              <div className="space-y-3">
                {stocks.map((stock) => (
                  <div
                    key={stock._id}
                    className={`flex justify-between items-center p-4 rounded-lg border transition-all duration-200 ${
                      isDark 
                        ? 'bg-white/5 border-white/10 hover:border-white/20' 
                        : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Link
                      to={`/stocks/${stock.symbol}`}
                      className="flex-1 no-underline group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className={`font-bold group-hover:text-cyan-400 transition-colors ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {stock.symbol}
                          </div>
                          <div className={`text-sm transition-colors duration-300 ${
                            isDark ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                            {stock.name}
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <div className={`font-bold transition-colors duration-300 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {stock.currentPrice && stock.currentPrice > 0 ? `$${stock.currentPrice}` : 'N/A'}
                          </div>
                          <div className={`text-xs transition-colors duration-300 ${
                            isDark ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                            per share
                          </div>
                        </div>
                      </div>
                    </Link>
                    {/* <button
                      onClick={() => openBuyModal(stock)}
                      className={`ml-2 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isDark 
                          ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' 
                          : 'bg-cyan-500 text-white hover:bg-cyan-600'
                      }`}
                    >
                      💳 Buy
                    </button> */}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>No stocks available</p>
            )}

            {/* Top News Section */}
            <div className="mt-6">
              <TopNewsSection limit={5} /> {/* Display top 5 news articles */}
            </div>

          </div>

          <div className="space-y-6">
            {/* Portfolio Section */}
            <div className={`backdrop-blur-sm rounded-xl p-6 border transition-colors duration-300 ${
              isDark 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/80 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-lg font-bold transition-colors duration-300 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Your Portfolio
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    isDark ? 'text-slate-300' : 'text-gray-600'
                  }`}>Overview</p>
                </div>
              </div>
              {portfolioLoading ? (
                <div className="text-center py-8">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <svg className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className={`transition-colors duration-300 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    Loading portfolio...
                  </p>
                </div>
              ) : portfolio.length > 0 ? (
                <div className="space-y-3">
                  {portfolio.map((holding) => {
                    const currentValue = holding.quantity * holding.stock.currentPrice;
                    const totalCost = holding.quantity * holding.avgBuyPrice;
                    const profit = currentValue - totalCost;
                    const profitPercentage = ((profit / totalCost) * 100).toFixed(2);
                    
                    return (
                      <div
                        key={holding._id}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isDark 
                            ? 'bg-white/5 border-white/10 hover:border-white/20' 
                            : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <Link 
                              to={`/stocks/${holding.stock.symbol}`}
                              className="no-underline"
                            >
                              <div className={`font-bold transition-colors duration-300 hover:text-cyan-400 ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {holding.stock.symbol}
                              </div>
                            </Link>
                            <div className={`text-sm transition-colors duration-300 ${
                              isDark ? 'text-slate-400' : 'text-gray-600'
                            }`}>
                              {holding.quantity} shares @ ${holding.avgBuyPrice.toFixed(2)}
                            </div>
                            <div className={`text-xs mt-1 transition-colors duration-300 ${
                              isDark ? 'text-slate-500' : 'text-gray-500'
                            }`}>
                              Current: ${holding.stock.currentPrice}
                            </div>
                          </div>
                          <div className="text-right mr-4">
                            <div className={`font-bold transition-colors duration-300 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              ${currentValue.toFixed(2)}
                            </div>
                            <div className={`text-sm font-medium ${
                              profit >= 0 
                                ? isDark ? 'text-green-400' : 'text-green-600'
                                : isDark ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({profitPercentage}%)
                            </div>
                          </div>
                          <button
                            onClick={() => openSellModal(holding)}
                            className="btn btn-secondary text-xs px-3 py-1"
                          >
                            📉 Bán
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Portfolio Summary */}
                  <div className={`mt-4 p-4 rounded-lg border transition-colors duration-300 ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-600' 
                      : 'bg-blue-50/80 border-blue-200'
                  }`}>
                    {(() => {
                      const totalValue = portfolio.reduce((sum, holding) => 
                        sum + (holding.quantity * holding.stock.currentPrice), 0
                      );
                      const totalCost = portfolio.reduce((sum, holding) => 
                        sum + (holding.quantity * holding.avgBuyPrice), 0
                      );
                      const totalProfit = totalValue - totalCost;
                      
                      return (
                        <div className="flex justify-between items-center">
                          <span className={`font-medium transition-colors duration-300 ${
                            isDark ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            Total Portfolio Value:
                          </span>
                          <div className="text-right">
                            <div className={`text-lg font-bold transition-colors duration-300 ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              ${totalValue.toFixed(2)}
                            </div>
                            <div className={`text-sm font-medium ${
                              totalProfit >= 0 
                                ? isDark ? 'text-green-400' : 'text-green-600'
                                : isDark ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <svg
                      className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <p className={`transition-colors duration-300 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    No holdings yet. Start by buying some stocks!
                  </p>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className={`backdrop-blur-sm rounded-xl p-6 border transition-colors duration-300 ${
              isDark 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/80 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-lg font-bold transition-colors duration-300 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Recent Transactions
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    isDark ? 'text-slate-300' : 'text-gray-600'
                  }`}>Last 30 days</p>
                </div>
              </div>
              {transactionsLoading ? (
                <div className="text-center py-8">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    isDark ? 'bg-green-500/20' : 'bg-green-100'
                  }`}>
                    <svg className={`w-8 h-8 animate-spin ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className={`transition-colors duration-300 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    Loading transactions...
                  </p>
                </div>
              ) : transactionsError ? (
                <p className={`text-red-500 transition-colors duration-300 ${isDark ? 'text-red-400' : ''}`}>
                  {transactionsError}
                </p>
              ) : transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction._id}
                      className={`p-4 rounded-lg border flex justify-between items-center transition-all duration-200 ${
                        isDark 
                          ? 'bg-white/5 border-white/10 hover:border-white/20' 
                          : 'bg-gray-50/80 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className={`font-bold transition-colors duration-300 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {transaction.type === 'BUY' ? 'Mua' : 'Bán'} {transaction.quantity} {transaction.stockSymbol}
                        </div>
                        <div className={`text-sm transition-colors duration-300 ${
                          isDark ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          {new Date(transaction.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className={`font-bold ${
                        transaction.type === 'BUY'
                          ? isDark ? 'text-green-400' : 'text-green-600'
                          : isDark ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {transaction.type === 'BUY' ? '-' : '+'}${transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <Link 
                    to="/orders" 
                    className={`block text-center mt-4 px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                      isDark 
                        ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    View All Transactions
                  </Link>
                </div>
              ) : (
              <div className="text-center py-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <svg
                    className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <p className={`transition-colors duration-300 ${
                  isDark ? 'text-slate-400' : 'text-gray-600'
                }`}>
                    No recent transactions.
                </p>
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {/* <div className={`mt-8 backdrop-blur-sm rounded-xl p-6 border transition-colors duration-300 ${
          isDark 
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-lg font-bold transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Quick Actions</h3>
              <p className={`text-sm transition-colors duration-300 ${
                isDark ? 'text-slate-300' : 'text-gray-600'
              }`}>Common tasks</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Buy Stock
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 12H4"
                />
              </svg>
              Sell Stock
            </button>
            <Link
              to="/payments"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 border-white/30 hover:border-white/50 hover:bg-white/5 text-white rounded-lg font-semibold transition-all duration-200 no-underline"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
              Deposit Funds
            </Link>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 border-white/30 hover:border-white/50 hover:bg-white/5 text-white rounded-lg font-semibold transition-all duration-200">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Withdraw Funds
            </button>
          </div>
        </div> */}
      </main>
    </div>
  );
};

export default Dashboard;