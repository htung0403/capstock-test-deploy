import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const PortfolioPerformanceChart = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [error, setError] = useState(null);

  const periods = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: 'ALL', value: 'ALL' },
  ];

  useEffect(() => {
    fetchGrowthData();
  }, [selectedPeriod]);

  const fetchGrowthData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/portfolio/growth?period=${selectedPeriod}`);
      setData(response.data || []);
    } catch (err) {
      console.error('Error fetching portfolio growth:', err);
      setError('Failed to load portfolio performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`rounded-lg border p-3 shadow-lg ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <p className="font-semibold mb-1">
            {payload[0].payload.date ? formatDate(payload[0].payload.date) : ''}
          </p>
          <p className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
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
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div
              className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4 ${
                isDark ? 'border-blue-400' : 'border-blue-600'
              }`}
            />
            <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
              Loading performance data...
            </p>
          </div>
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

  if (data.length === 0) {
    return (
      <div
        className={`rounded-xl p-6 border ${
          isDark
            ? 'bg-white/10 border-white/20'
            : 'bg-white/80 border-gray-200'
        }`}
      >
        <div className="flex items-center justify-center h-80">
          <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
            No performance data available. Start investing to see your portfolio growth.
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className={`text-xl font-bold mb-1 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Portfolio Performance
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            Track your portfolio value over time
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === period.value
                ? isDark
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : isDark
                ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isDark ? '#22c55e' : '#10b981'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isDark ? '#22c55e' : '#10b981'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke={isDark ? '#94a3b8' : '#64748b'}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              stroke={isDark ? '#94a3b8' : '#64748b'}
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isDark ? '#22c55e' : '#10b981'}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isDark ? '#22c55e' : '#10b981'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioPerformanceChart;

