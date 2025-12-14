import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const StockStats = ({ stats }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const formatCurrency = (value) => {
    if (value == null || isNaN(value)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value) => {
    if (value == null || isNaN(value)) return '-';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const formatPercent = (value) => {
    if (value == null || isNaN(value)) return '-';
    return `${value.toFixed(2)}%`;
  };

  // Only show stats that have values
  const statsToShow = [
    { label: 'Open', value: stats.open, formatter: formatCurrency },
    { label: 'High', value: stats.high, formatter: formatCurrency },
    { label: 'Low', value: stats.low, formatter: formatCurrency },
    { label: 'Vol', value: stats.volume, formatter: formatNumber },
    { label: 'P/E', value: stats.pe, formatter: (v) => v != null ? v.toFixed(2) : '-' },
    { label: 'Mkt Cap', value: stats.marketCap, formatter: formatCurrency },
    { label: '52W H', value: stats.high52w, formatter: formatCurrency },
    { label: '52W L', value: stats.low52w, formatter: formatCurrency },
    { label: 'Avg Vol', value: stats.avgVolume, formatter: formatNumber },
    { label: 'Yield', value: stats.yield, formatter: formatPercent },
    { label: 'Beta', value: stats.beta, formatter: (v) => v != null ? v.toFixed(2) : '-' },
    { label: 'EPS', value: stats.eps, formatter: formatCurrency },
  ].filter(item => item.value != null && !isNaN(item.value));

  if (statsToShow.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl p-6 border transition-colors duration-300 ${
        isDark
          ? 'bg-white/10 border-white/20'
          : 'bg-white/80 border-gray-200'
      }`}
    >
      <h3
        className={`text-lg font-bold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        Statistics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statsToShow.map((stat, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              isDark
                ? 'bg-white/5 border-white/10'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <p
              className={`text-xs mb-1 ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}
            >
              {stat.label}
            </p>
            <p
              className={`text-sm font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {stat.formatter(stat.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockStats;

