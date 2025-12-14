import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const PortfolioSummaryCard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/portfolio/summary');
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching portfolio summary:', err);
      setError('Failed to load portfolio summary');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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

  if (!summary) {
    return null;
  }

  const {
    totalPortfolioValue,
    totalInvested,
    totalProfitLoss,
    totalProfitLossPercent,
    dailyProfitLoss,
    bestPerformingStock,
    worstPerformingStock,
  } = summary;

  return (
    <div
      className={`rounded-xl p-6 border transition-colors duration-300 ${
        isDark
          ? 'bg-white/10 border-white/20'
          : 'bg-white/80 border-gray-200'
      }`}
    >
      <h2
        className={`text-xl font-bold mb-6 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        Portfolio Summary
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Portfolio Value */}
        <div
          className={`p-4 rounded-lg border ${
            isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <p
            className={`text-sm mb-1 ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}
          >
            Total Portfolio Value
          </p>
          <p
            className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {formatCurrency(totalPortfolioValue)}
          </p>
        </div>

        {/* Total Invested */}
        <div
          className={`p-4 rounded-lg border ${
            isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <p
            className={`text-sm mb-1 ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}
          >
            Total Invested
          </p>
          <p
            className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {formatCurrency(totalInvested)}
          </p>
        </div>

        {/* Total Profit/Loss */}
        <div
          className={`p-4 rounded-lg border ${
            isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <p
            className={`text-sm mb-1 ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}
          >
            Total Profit/Loss
          </p>
          <p
            className={`text-2xl font-bold ${
              totalProfitLoss >= 0
                ? isDark
                  ? 'text-green-400'
                  : 'text-green-600'
                : isDark
                ? 'text-red-400'
                : 'text-red-600'
            }`}
          >
            {totalProfitLoss >= 0 ? '+' : ''}
            {formatCurrency(totalProfitLoss)}
          </p>
          <p
            className={`text-sm mt-1 ${
              totalProfitLoss >= 0
                ? isDark
                  ? 'text-green-400'
                  : 'text-green-600'
                : isDark
                ? 'text-red-400'
                : 'text-red-600'
            }`}
          >
            ({totalProfitLossPercent >= 0 ? '+' : ''}
            {totalProfitLossPercent.toFixed(2)}%)
          </p>
        </div>

        {/* Daily P/L */}
        <div
          className={`p-4 rounded-lg border ${
            isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <p
            className={`text-sm mb-1 ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}
          >
            Daily P/L
          </p>
          <p
            className={`text-2xl font-bold ${
              dailyProfitLoss >= 0
                ? isDark
                  ? 'text-green-400'
                  : 'text-green-600'
                : isDark
                ? 'text-red-400'
                : 'text-red-600'
            }`}
          >
            {dailyProfitLoss >= 0 ? '+' : ''}
            {formatCurrency(dailyProfitLoss)}
          </p>
        </div>

        {/* Best Performing Stock */}
        {bestPerformingStock && (
          <div
            className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-green-500/10 border-green-500/25'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <p
              className={`text-sm mb-1 ${
                isDark ? 'text-green-400' : 'text-green-700'
              }`}
            >
              Best Performing Stock
            </p>
            <p
              className={`text-lg font-bold mb-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {bestPerformingStock.symbol}
            </p>
            <p
              className={`text-sm ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`}
            >
              {bestPerformingStock.profit >= 0 ? '+' : ''}
              {formatCurrency(bestPerformingStock.profit)} (
              {bestPerformingStock.profitPercent >= 0 ? '+' : ''}
              {bestPerformingStock.profitPercent.toFixed(2)}%)
            </p>
          </div>
        )}

        {/* Worst Performing Stock */}
        {worstPerformingStock && (
          <div
            className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-red-500/10 border-red-500/25'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={`text-sm mb-1 ${
                isDark ? 'text-red-400' : 'text-red-700'
              }`}
            >
              Worst Performing Stock
            </p>
            <p
              className={`text-lg font-bold mb-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {worstPerformingStock.symbol}
            </p>
            <p
              className={`text-sm ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}
            >
              {worstPerformingStock.profit >= 0 ? '+' : ''}
              {formatCurrency(worstPerformingStock.profit)} (
              {worstPerformingStock.profitPercent >= 0 ? '+' : ''}
              {worstPerformingStock.profitPercent.toFixed(2)}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioSummaryCard;

