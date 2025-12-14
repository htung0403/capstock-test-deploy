import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const TransactionHistoryTable = ({ symbol = null, sortBy = 'date', sortOrder = 'desc' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState(sortOrder);
  const [displayLimit, setDisplayLimit] = useState(10); // 5, 10, 20, or 'ALL'


  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/transactions');
      let allTransactions = response.data || [];
      
      // Filter by symbol if provided
      if (symbol) {
        allTransactions = allTransactions.filter(
          (t) => t.stockSymbol && t.stockSymbol.toUpperCase() === symbol.toUpperCase()
        );
      }
      
      // Sort transactions
      const sorted = [...allTransactions].sort((a, b) => {
        let aValue, bValue;
        
        switch (currentSortBy) {
          case 'date':
            aValue = new Date(a.date || a.createdAt);
            bValue = new Date(b.date || b.createdAt);
            break;
          case 'symbol':
            aValue = (a.stockSymbol || '').toUpperCase();
            bValue = (b.stockSymbol || '').toUpperCase();
            break;
          case 'type':
            aValue = a.type || '';
            bValue = b.type || '';
            break;
          case 'amount':
            aValue = a.totalAmount || 0;
            bValue = b.totalAmount || 0;
            break;
          default:
            aValue = new Date(a.date || a.createdAt);
            bValue = new Date(b.date || b.createdAt);
        }
        
        if (currentSortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
      
      setTransactions(sorted);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [symbol, currentSortBy, currentSortOrder]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeColor = (type) => {
    if (type === 'BUY' || type === 'DEPOSIT') {
      return isDark ? 'text-green-400' : 'text-green-600';
    } else if (type === 'SELL' || type === 'WITHDRAW') {
      return isDark ? 'text-red-400' : 'text-red-600';
    }
    return isDark ? 'text-slate-300' : 'text-gray-600';
  };

  const getTypeBadgeColor = (type) => {
    if (type === 'BUY' || type === 'DEPOSIT') {
      return isDark
        ? 'bg-green-500/20 text-green-400 border-green-500/30'
        : 'bg-green-100 text-green-700 border-green-200';
    } else if (type === 'SELL' || type === 'WITHDRAW') {
      return isDark
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-red-100 text-red-700 border-red-200';
    }
    return isDark
      ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      : 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl p-6 border ${
          isDark
            ? 'bg-white/10 border-white/20'
            : 'bg-white/80 border-gray-200'
        }`}
      >
        <div className="flex items-center justify-center h-64">
          <div
            className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${
              isDark ? 'border-blue-400' : 'border-blue-600'
            }`}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-xl p-6 border ${
          isDark
            ? 'bg-red-500/10 border-red-500/25 text-red-400'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}
      >
        <p>{error}</p>
      </div>
    );
  }

  // Filter only buy/sell transactions for the table
  const stockTransactions = transactions.filter(
    (t) => t.type === 'BUY' || t.type === 'SELL'
  );

  // Apply display limit
  const displayedTransactions = displayLimit === 'ALL' 
    ? stockTransactions 
    : stockTransactions.slice(0, displayLimit);

  if (stockTransactions.length === 0) {
    return (
      <div
        className={`rounded-xl p-6 border ${
          isDark
            ? 'bg-white/10 border-white/20'
            : 'bg-white/80 border-gray-200'
        }`}
      >
        <h2
          className={`text-xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Transaction History
        </h2>
        <div className="flex items-center justify-center h-64">
          <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
            No transaction history. Start trading to see your transactions here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-6 border transition-colors duration-300 ${
        isDark
          ? 'bg-white/10 border-white/20'
          : 'bg-white/80 border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2
          className={`text-xl font-bold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Transaction History{symbol ? ` - ${symbol}` : ''}
        </h2>
        
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Display Limit Selector */}
          <select
            value={displayLimit}
            onChange={(e) => setDisplayLimit(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value={5}>Show 5</option>
            <option value={10}>Show 10</option>
            <option value={20}>Show 20</option>
            <option value="ALL">Show All</option>
          </select>
          
          {/* Sort Controls */}
          <select
            value={currentSortBy}
            onChange={(e) => setCurrentSortBy(e.target.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="date">Sort by Date</option>
            <option value="symbol">Sort by Symbol</option>
            <option value="type">Sort by Type</option>
            <option value="amount">Sort by Amount</option>
          </select>
          <button
            onClick={() => setCurrentSortOrder(currentSortOrder === 'asc' ? 'desc' : 'asc')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/10 text-slate-300 hover:bg-white/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={currentSortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
          >
            {currentSortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <th
                className={`text-left py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Date
              </th>
              <th
                className={`text-left py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Stock
              </th>
              <th
                className={`text-left py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Type
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Price
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Quantity
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Fee
              </th>
              <th
                className={`text-right py-3 px-4 text-sm font-semibold ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                Total Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTransactions.map((transaction) => (
              <tr
                key={transaction._id}
                className={`border-b hover:bg-opacity-50 transition-colors ${
                  isDark
                    ? 'border-white/5 hover:bg-white/5'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <td className="py-3 px-4">
                  <p
                    className={`text-sm ${
                      isDark ? 'text-slate-400' : 'text-gray-600'
                    }`}
                  >
                    {formatDate(transaction.date || transaction.createdAt)}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <Link
                    to={`/stocks/${transaction.stockSymbol}`}
                    className={`font-semibold hover:underline ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  >
                    {transaction.stockSymbol}
                  </Link>
                  {transaction.stockName && (
                    <p
                      className={`text-xs ${
                        isDark ? 'text-slate-500' : 'text-gray-500'
                      }`}
                    >
                      {transaction.stockName}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getTypeBadgeColor(
                      transaction.type
                    )}`}
                  >
                    {transaction.type}
                    {transaction.orderType && ` (${transaction.orderType})`}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <p
                    className={`text-sm font-medium ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {formatCurrency(transaction.price || 0)}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <p
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-700'
                    }`}
                  >
                    {transaction.quantity || 0}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <p
                    className={`text-sm ${
                      isDark ? 'text-slate-400' : 'text-gray-600'
                    }`}
                  >
                    {formatCurrency(transaction.fee || 0)}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <p
                    className={`text-sm font-semibold ${getTypeColor(
                      transaction.type
                    )}`}
                  >
                    {transaction.type === 'BUY' ? '-' : '+'}
                    {formatCurrency(transaction.totalAmount || 0)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {stockTransactions.map((transaction) => (
          <div
            key={transaction._id}
            className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-white/5 border-white/10'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <Link
                  to={`/stocks/${transaction.stockSymbol}`}
                  className={`font-bold text-lg hover:underline ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`}
                >
                  {transaction.stockSymbol}
                </Link>
                <p
                  className={`text-xs mt-1 ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}
                >
                  {formatDate(transaction.date || transaction.createdAt)}
                </p>
              </div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getTypeBadgeColor(
                  transaction.type
                )}`}
              >
                {transaction.type}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}
                >
                  Price
                </p>
                <p
                  className={`text-sm font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatCurrency(transaction.price || 0)}
                </p>
              </div>
              <div>
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}
                >
                  Quantity
                </p>
                <p
                  className={`text-sm font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {transaction.quantity || 0}
                </p>
              </div>
              <div>
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}
                >
                  Fee
                </p>
                <p
                  className={`text-sm ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}
                >
                  {formatCurrency(transaction.fee || 0)}
                </p>
              </div>
              <div>
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  }`}
                >
                  Total
                </p>
                <p
                  className={`text-sm font-semibold ${getTypeColor(
                    transaction.type
                  )}`}
                >
                  {transaction.type === 'BUY' ? '-' : '+'}
                  {formatCurrency(transaction.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionHistoryTable;

