/*
  File: frontend/src/pages/StockDetail.jsx
  Purpose: Displays detailed information about a single stock, including historical data, trading options, and AI analysis.
  
  CHANGES (2025-10-20):
  - Added AI Advisor Analysis panel to display comprehensive stock analysis (sentiment, trends, recommendations).
  - Integrated `AIChatWidget` to provide a floating chat interface for AI interaction with stock-specific context.
*/
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ReferenceLine,
} from 'recharts';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import SellModal from '../components/SellModal';
import BuyModal from '../components/BuyModal';
import AIChatWidget from '../components/AIChatWidget'; // Import the AI Chat Widget

const TIMEFRAMES = [
  { key: '1D', label: '1D', ms: 1 * 24 * 60 * 60 * 1000 },
  { key: '5D', label: '5D', ms: 5 * 24 * 60 * 60 * 1000 },
  { key: '1M', label: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: '3M', label: '3M', ms: 90 * 24 * 60 * 60 * 1000 },
  { key: '6M', label: '6M', ms: 180 * 24 * 60 * 60 * 1000 },
  { key: '1Y', label: '1Y', ms: 365 * 24 * 60 * 60 * 1000 },
  { key: 'ALL', label: 'ALL', ms: null },
];

function formatCurrency(n) {
  if (n == null || Number.isNaN(n)) return '';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function formatXAxisLabel(isoStr, timeframeKey) {
  const d = new Date(isoStr);
  if (timeframeKey === '1D' || timeframeKey === '5D') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

function CustomTooltip({ active, payload, label, isDark }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className={`px-3 py-2 rounded-lg shadow-2xl border ${
      isDark 
        ? 'bg-slate-900/95 text-slate-200 border-slate-400/20' 
        : 'bg-white/95 text-slate-800 border-slate-300/50'
    }`}>
      <div className="text-xs opacity-80 mb-1">{label}</div>
      <div className="font-extrabold text-cyan-500">{formatCurrency(p.price)}</div>
      <div className="text-xs opacity-85">Vol: {p.volume?.toLocaleString?.() || p.volume}</div>
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { show } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('ALL');
  const [chartType, setChartType] = useState('area'); // 'area' | 'line'
  const [refreshing, setRefreshing] = useState(false);
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAIAnalysis, setLoadingAIAnalysis] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  
  // Buy stock state
  const [showBuyModal, setShowBuyModal] = useState(false);
  
  // Sell stock state
  const [showSellModal, setShowSellModal] = useState(false);
  
  // Portfolio state
  const [userHolding, setUserHolding] = useState(null);
  
  const isDark = theme === 'dark';

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '1000');
      const tf = TIMEFRAMES.find((t) => t.key === timeframe);
      if (tf && tf.ms) {
        const from = new Date(Date.now() - tf.ms).toISOString();
        params.set('from', from);
      }
      const res = await api.get(`/stocks/symbol/${symbol}/history?${params.toString()}`);
      setHistory(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    (async () => {
      await fetchHistory();
    })();
  }, [fetchHistory]);

  const fetchUserHolding = useCallback(async () => {
    if (!user || !symbol) return;
    
    try {
      const response = await api.get('/portfolio');
      const holding = response.data.find(h => h.stock.symbol === symbol.toUpperCase());
      setUserHolding(holding || null);
    } catch (error) {
      console.error('Error fetching user holding:', error);
    }
  }, [user, symbol]);

  useEffect(() => {
    if (user) {
      fetchUserHolding();
    }
  }, [fetchUserHolding]);

  const onRefreshNow = useCallback(async () => {
    try {
      setRefreshing(true);
      await api.post(`/stocks/refresh/${symbol}`);
      await fetchHistory();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setRefreshing(false);
    }
  }, [symbol, fetchHistory]);

  const fetchAIAnalysis = useCallback(async () => {
    setLoadingAIAnalysis(true);
    setAiAnalysisError('');
    try {
      const res = await api.get(`/ai/analysis/${symbol}`);
      setAiAnalysis(res.data.analysis);
      show('success', `AI analysis for ${symbol} completed.`);
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e.message;
      setAiAnalysisError(errorMessage);
      show('error', `AI analysis failed: ${errorMessage}`);
    } finally {
      setLoadingAIAnalysis(false);
    }
  }, [symbol, show]);

  const handleSellSuccess = () => {
    // Refresh user data and portfolio after selling
    refreshUser();
    fetchUserHolding();
  };

  const handleBuySuccess = () => {
    // Refresh user data and portfolio after buying
    refreshUser();
    fetchUserHolding();
  };

  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;
  const change = latest && first ? latest.price - first.price : 0;
  const changePct = latest && first && first.price ? (change / first.price) * 100 : 0;

  // Prepare stock data for SellModal
  const stockForModal = latest ? {
    symbol: symbol,
    currentPrice: latest.price,
    name: symbol // We could add more stock info here if available
  } : null;

  const marketData = {
    change,
    changePct
  };

  // Theme-aware colors
  const chartColors = {
    accent: '#06b6d4', // cyan-500
    accentSoft: '#22d3ee', // cyan-400
    grid: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.35)',
    text: isDark ? 'rgba(226,232,240,0.85)' : 'rgba(30,41,59,0.85)',
    cursor: isDark ? 'rgba(34,211,238,0.55)' : 'rgba(14,165,233,0.55)',
    referenceLine: isDark ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.6)'
  };

  const chartData = useMemo(() => {
    return (history || []).map((h) => ({
      time: new Date(h.timestamp).toISOString(),
      price: h.price,
      volume: h.volume,
    }));
  }, [history]);

  return (
    <div className="container px-4 pb-8 pt-4">
      {/* Header with symbol and key stats */}
      <div className="card mb-4">
        <div className="card-header items-center">
          <div>
            <div className="card-title flex items-baseline gap-2">
              <span>{symbol}</span>
              {latest ? (
                <span className="text-xl font-extrabold text-cyan-400">
                  {formatCurrency(latest.price)}
                </span>
              ) : null}
            </div>
            <div className="card-subtle">
              {latest ? (
                <span className={`font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
                </span>
              ) : (
                'No recent data'
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={onRefreshNow} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex gap-2 flex-wrap">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                className={`btn ${timeframe === tf.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className={`btn ${chartType === 'area' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setChartType('area')}
            >
              Area
            </button>
            <button
              className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setChartType('line')}
            >
              Line
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className={`w-full h-[460px] border-t transition-colors duration-200 ${
          isDark 
            ? 'bg-slate-900/50 border-slate-700/30' 
            : 'bg-white border-slate-200/50'
        }`}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-600 dark:text-slate-400">
              Loading chart...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.accent} stopOpacity={isDark ? 0.25 : 0.35} />
                    <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={chartColors.grid}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: chartColors.text }}
                  minTickGap={24}
                  tickFormatter={(value) => formatXAxisLabel(value, timeframe)}
                  axisLine={{ stroke: chartColors.grid }}
                  tickLine={{ stroke: chartColors.grid }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12, fill: chartColors.text }}
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={{ stroke: chartColors.grid }}
                  tickLine={{ stroke: chartColors.grid }}
                />
                <Tooltip
                  content={<CustomTooltip isDark={isDark} />}
                  labelFormatter={(v) => formatXAxisLabel(v, timeframe)}
                  cursor={{ stroke: chartColors.cursor, strokeWidth: 1 }}
                />
                {first && (
                  <ReferenceLine 
                    y={first.price} 
                    stroke={chartColors.referenceLine} 
                    strokeDasharray="3 3" 
                  />
                )}
                {chartType === 'area' && (
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={chartColors.accent} 
                    fill="url(#priceGradient)" 
                    strokeWidth={2.25} 
                    dot={false} 
                  />
                )}
                {chartType === 'line' && (
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={chartColors.accent} 
                    dot={false} 
                    strokeWidth={2.25} 
                    activeDot={{ 
                      r: 3, 
                      stroke: chartColors.accentSoft, 
                      strokeWidth: 2,
                      fill: isDark ? chartColors.accentSoft : chartColors.accent
                    }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actions panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="card-header">
            <div className="card-title">💰 Quick Trade</div>
            <span className="card-subtle">Mua cổ phiếu với giá thị trường</span>
          </div>
          <div className="space-y-4">
            {latest && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>Giá hiện tại: <span className="font-bold text-cyan-500">{formatCurrency(latest.price)}</span></p>
                <p>Số dư: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(user?.balance || 0)}</span></p>
              </div>
            )}
            <div className="flex gap-2">
              <button 
                className="btn btn-primary flex-1"
                onClick={() => setShowBuyModal(true)}
                disabled={!latest?.price}
              >
                💳 Mua
              </button>
              {latest?.price && userHolding ? (
                <button 
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowSellModal(true)}
                >
                  📉 Bán
                </button>
              ) : (
                <button className="btn btn-secondary flex-1" disabled>
                  📈 Bán {userHolding ? '' : '(Không có cổ phiếu)'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔔 Alerts</div>
            <span className="card-subtle">Đặt cảnh báo giá (sắp có)</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline flex-1" disabled>
              Tạo cảnh báo
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <div className="card mb-4">
        <div className="card-header items-center">
          <div className="card-title">🤖 AI Advisor Analysis</div>
          <button 
            className="btn btn-primary"
            onClick={fetchAIAnalysis}
            disabled={loadingAIAnalysis}
          >
            {loadingAIAnalysis ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        </div>
        {aiAnalysisError && (
          <div className="text-red-600 dark:text-red-400 p-3">Error: {aiAnalysisError}</div>
        )}
        {aiAnalysis ? (
          <div className="p-4 space-y-3">
            <p><strong>Overall Sentiment:</strong> <span className={`font-semibold ${aiAnalysis.sentiment === 'Positive' ? 'text-green-600' : aiAnalysis.sentiment === 'Negative' ? 'text-red-600' : 'text-yellow-600'}`}>{aiAnalysis.sentiment}</span></p>
            <p><strong>Short-Term Trend:</strong> <span className={`font-semibold ${aiAnalysis.price_trends.short_term_trend === 'Bullish' ? 'text-green-600' : aiAnalysis.price_trends.short_term_trend === 'Bearish' ? 'text-red-600' : 'text-yellow-600'}`}>{aiAnalysis.price_trends.short_term_trend}</span></p>
            <p><strong>Long-Term Trend:</strong> <span className={`font-semibold ${aiAnalysis.price_trends.long_term_trend === 'Bullish' ? 'text-green-600' : aiAnalysis.price_trends.long_term_trend === 'Bearish' ? 'text-red-600' : 'text-yellow-600'}`}>{aiAnalysis.price_trends.long_term_trend}</span></p>
            <p><strong>Profit Potential:</strong> <span className="font-semibold text-cyan-500">{aiAnalysis.profit_potential}</span></p>
            <p><strong>Risk Level:</strong> <span className="font-semibold text-orange-500">{aiAnalysis.risk_level}</span></p>
            {aiAnalysis.price_trends.ma_short && (
                <p><strong>MA (10 days):</strong> {formatCurrency(aiAnalysis.price_trends.ma_short)}</p>
            )}
            {aiAnalysis.price_trends.ma_long && (
                <p><strong>MA (50 days):</strong> {formatCurrency(aiAnalysis.price_trends.ma_long)}</p>
            )}
          </div>
        ) : ( !loadingAIAnalysis && !aiAnalysisError && 
          <div className="p-4 text-slate-600 dark:text-slate-400">
            Click "Analyze with AI" to get a comprehensive analysis for {symbol}.
          </div>
        )}
      </div>

      {/* Buy Modal Component */}
      <BuyModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        stock={stockForModal}
        onBuySuccess={handleBuySuccess}
      />

      {/* Sell Modal Component */}
      <SellModal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        stock={stockForModal}
        userHolding={userHolding}
        onSellSuccess={handleSellSuccess}
        marketData={marketData}
      />

      {/* AI Chat Widget */}
      <AIChatWidget stockSymbol={symbol} />
    </div>
  );
}


