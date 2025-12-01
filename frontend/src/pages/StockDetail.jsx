/*
  File: frontend/src/pages/StockDetail.jsx
  Purpose: Displays detailed information about a single stock, including historical data, trading options, and AI analysis.
  
  CHANGES (2025-10-20):
  - Added AI Advisor Analysis panel to display comprehensive stock analysis (sentiment, trends, recommendations).
  - Integrated `AIChatWidget` to provide a floating chat interface for AI interaction with stock-specific context.
*/
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ReferenceLine,
  Bar,
} from "recharts";
import api from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import SellModal from "../components/SellModal";
import BuyModal from "../components/BuyModal";
import OrderForm from "../components/OrderForm"; // Import the new OrderForm
import AIChatWidget from "../components/AIChatWidget"; // Import the AI Chat Widget

const TIMEFRAMES = [
  { key: "1D", label: "1D", ms: 1 * 24 * 60 * 60 * 1000 },
  { key: "5D", label: "5D", ms: 5 * 24 * 60 * 60 * 1000 },
  { key: "1M", label: "1M", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "3M", label: "3M", ms: 90 * 24 * 60 * 60 * 1000 },
  { key: "6M", label: "6M", ms: 180 * 24 * 60 * 60 * 1000 },
  { key: "1Y", label: "1Y", ms: 365 * 24 * 60 * 60 * 1000 },
  { key: "ALL", label: "ALL", ms: null },
];

function formatCurrency(n) {
  if (n == null || Number.isNaN(n)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatXAxisLabel(isoStr, timeframeKey) {
  const d = new Date(isoStr);
  if (timeframeKey === "1D" || timeframeKey === "5D") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString();
}

function CustomTooltip({ active, payload, label, isDark }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  return (
    <div
      className={`px-3 py-2 rounded-lg shadow-2xl border ${
        isDark
          ? "bg-slate-900/95 text-slate-200 border-slate-400/20"
          : "bg-white/95 text-slate-800 border-slate-300/50"
      }`}
    >
      <div className="text-xs opacity-80 mb-1">{label}</div>
      {p.open !== undefined ? (
        <>
          <div className="text-xs">
            <span className="opacity-70">Open:</span>{" "}
            <span className="font-bold">{formatCurrency(p.open)}</span>
          </div>
          <div className="text-xs">
            <span className="opacity-70">High:</span>{" "}
            <span className="font-bold text-green-500">
              {formatCurrency(p.high)}
            </span>
          </div>
          <div className="text-xs">
            <span className="opacity-70">Low:</span>{" "}
            <span className="font-bold text-red-500">
              {formatCurrency(p.low)}
            </span>
          </div>
          <div className="text-xs">
            <span className="opacity-70">Close:</span>{" "}
            <span className="font-bold text-cyan-500">
              {formatCurrency(p.close)}
            </span>
          </div>
          <div className="text-xs opacity-85 mt-1">
            Vol: {p.volume?.toLocaleString?.() || p.volume}
          </div>
        </>
      ) : (
        <>
          <div className="font-extrabold text-cyan-500">
            {formatCurrency(p.price)}
          </div>
          <div className="text-xs opacity-85">
            Vol: {p.volume?.toLocaleString?.() || p.volume}
          </div>
        </>
      )}
    </div>
  );
}

// Custom Candlestick Shape Component
const Candlestick = (props) => {
  const { x, y, width, height, payload } = props;

  if (
    !payload ||
    typeof payload.open !== "number" ||
    typeof payload.close !== "number" ||
    typeof payload.high !== "number" ||
    typeof payload.low !== "number"
  ) {
    return null;
  }

  const { open, close, high, low } = payload;

  // Validate data
  if (high < low || high < open || high < close || low > open || low > close) {
    console.warn("Invalid OHLC data:", payload);
    return null;
  }

  const isGrowing = close >= open;
  const color = isGrowing ? "#10b981" : "#ef4444"; // green-500 : red-500

  // Bar component gives us y at the 'high' value and height from low to high
  // So: y = pixel position of 'high', y + height = pixel position of 'low'
  const range = high - low;
  if (range <= 0) {
    // Flat candle (all prices same)
    const wickX = x + width / 2;
    return (
      <g>
        <line
          x1={wickX}
          y1={y}
          x2={wickX}
          y2={y + height}
          stroke={color}
          strokeWidth={1.5}
        />
        <rect
          x={x + 1}
          y={y}
          width={Math.max(width - 2, 1)}
          height={2}
          fill={color}
        />
      </g>
    );
  }

  // Calculate body positions as ratios
  const openFromHigh = high - open;
  const closeFromHigh = high - close;

  const yOpen = y + (openFromHigh / range) * height;
  const yClose = y + (closeFromHigh / range) * height;

  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

  const wickX = x + width / 2;

  return (
    <g>
      {/* Wick (High-Low line) */}
      <line
        x1={wickX}
        y1={y}
        x2={wickX}
        y2={y + height}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body (Open-Close rectangle) */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 1)}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
        fillOpacity={isGrowing ? 0.8 : 1}
      />
    </g>
  );
};

export default function StockDetail() {
  const { symbol } = useParams();
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { show } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeframe, setTimeframe] = useState("ALL");
  const [chartType, setChartType] = useState("candlestick"); // 'candlestick' | 'line'
  const [refreshing, setRefreshing] = useState(false);

  // Zoom state
  const [zoomDomain, setZoomDomain] = useState({ start: 0, end: 100 }); // percentage
  const [isZooming, setIsZooming] = useState(false);

  // Calculate zoom percentage (100% = no zoom, lower = more zoomed in)
  const zoomPercentage = zoomDomain.end - zoomDomain.start;

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAIAnalysis, setLoadingAIAnalysis] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState("");

  // Order form state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderType, setOrderType] = useState("BUY"); // 'BUY' or 'SELL'

  // Sell stock state (keeping for backward compatibility)
  const [showSellModal, setShowSellModal] = useState(false);

  // Portfolio state
  const [userHolding, setUserHolding] = useState(null);

  const isDark = theme === "dark";

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "1000");
      const tf = TIMEFRAMES.find((t) => t.key === timeframe);
      if (tf && tf.ms) {
        const from = new Date(Date.now() - tf.ms).toISOString();
        params.set("from", from);
      }
      const res = await api.get(
        `/stocks/symbol/${symbol}/history?${params.toString()}`
      );
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
      const response = await api.get("/portfolio");
      const holding = response.data.find(
        (h) => h.stock.symbol === symbol.toUpperCase()
      );
      setUserHolding(holding || null);
    } catch (error) {
      console.error("Error fetching user holding:", error);
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
    setAiAnalysisError("");
    try {
      const res = await api.get(`/ai/analysis/${symbol}`);
      setAiAnalysis(res.data.analysis);
      show("success", `AI analysis for ${symbol} completed.`);
    } catch (e) {
      const errorMessage = e?.response?.data?.message || e.message;
      setAiAnalysisError(errorMessage);
      show("error", `AI analysis failed: ${errorMessage}`);
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

  const handleOrderSubmit = async (orderData) => {
    try {
      const response = await api.post("/orders", orderData);
      show("success", response.data.message || "Đặt lệnh thành công!");
      setShowOrderForm(false);

      // Refresh data
      refreshUser();
      fetchUserHolding();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || "Đặt lệnh thất bại";
      show("error", errorMessage);
      throw error; // Let OrderForm handle the error display
    }
  };

  const handleBuyClick = () => {
    setOrderType("BUY");
    setShowOrderForm(true);
  };

  const handleSellClick = () => {
    setOrderType("SELL");
    setShowOrderForm(true);
  };

  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;
  const change = latest && first ? latest.price - first.price : 0;
  const changePct =
    latest && first && first.price ? (change / first.price) * 100 : 0;

  // Prepare stock data for OrderForm
  const stockForOrderForm = latest
    ? {
        symbol: symbol,
        currentPrice: latest.price,
        name: symbol, // Could add more stock info here
      }
    : null;

  const marketData = {
    change,
    changePct,
  };

  // Zoom functions
  const handleZoomIn = () => {
    const currentRange = zoomDomain.end - zoomDomain.start;
    const zoomFactor = 0.8; // Zoom in by 20%
    const newRange = currentRange * zoomFactor;
    const center = (zoomDomain.start + zoomDomain.end) / 2;
    const newStart = Math.max(0, center - newRange / 2);
    const newEnd = Math.min(100, center + newRange / 2);
    setZoomDomain({ start: newStart, end: newEnd });
  };

  const handleZoomOut = () => {
    const currentRange = zoomDomain.end - zoomDomain.start;
    if (currentRange >= 100) return; // Already at max zoom out
    const zoomFactor = 1.25; // Zoom out by 25%
    const newRange = Math.min(100, currentRange * zoomFactor);
    const center = (zoomDomain.start + zoomDomain.end) / 2;
    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;

    // Adjust if out of bounds
    if (newStart < 0) {
      newEnd = Math.min(100, newEnd - newStart);
      newStart = 0;
    }
    if (newEnd > 100) {
      newStart = Math.max(0, newStart - (newEnd - 100));
      newEnd = 100;
    }

    setZoomDomain({ start: newStart, end: newEnd });
  };

  const handleResetZoom = () => {
    setZoomDomain({ start: 0, end: 100 });
  };

  // Theme-aware colors
  const chartColors = {
    accent: "#06b6d4", // cyan-500
    accentSoft: "#22d3ee", // cyan-400
    grid: isDark ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.35)",
    text: isDark ? "rgba(226,232,240,0.85)" : "rgba(30,41,59,0.85)",
    cursor: isDark ? "rgba(34,211,238,0.55)" : "rgba(14,165,233,0.55)",
    referenceLine: isDark ? "rgba(148,163,184,0.4)" : "rgba(148,163,184,0.6)",
  };

  const chartData = useMemo(() => {
    return (history || []).map((h) => ({
      time: new Date(h.timestamp).toISOString(),
      price: h.price,
      open: h.open || h.price,
      high: h.high || h.price,
      low: h.low || h.price,
      close: h.close || h.price,
      volume: h.volume,
    }));
  }, [history]);

  // Zoomed chart data based on zoomDomain
  const zoomedChartData = useMemo(() => {
    if (!chartData.length) return [];

    const startIdx = Math.floor((zoomDomain.start / 100) * chartData.length);
    const endIdx = Math.ceil((zoomDomain.end / 100) * chartData.length);

    return chartData.slice(startIdx, endIdx);
  }, [chartData, zoomDomain]);

  // Handle zoom with Ctrl + wheel
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return; // Only zoom when Ctrl/Cmd is pressed

    e.preventDefault();

    const delta = e.deltaY;
    const zoomFactor = 0.1; // 10% zoom per scroll

    setZoomDomain((prev) => {
      const currentRange = prev.end - prev.start;
      const zoomAmount = currentRange * zoomFactor * (delta > 0 ? 1 : -1);

      let newStart = prev.start + zoomAmount / 2;
      let newEnd = prev.end - zoomAmount / 2;

      // Ensure minimum zoom level (at least 5% of data visible)
      if (newEnd - newStart < 5) {
        const center = (prev.start + prev.end) / 2;
        newStart = center - 2.5;
        newEnd = center + 2.5;
      }

      // Ensure maximum zoom level (100% of data)
      if (newStart < 0) {
        newEnd = newEnd - newStart;
        newStart = 0;
      }
      if (newEnd > 100) {
        newStart = newStart - (newEnd - 100);
        newEnd = 100;
      }

      // Clamp values
      newStart = Math.max(0, newStart);
      newEnd = Math.min(100, newEnd);

      return { start: newStart, end: newEnd };
    });
  }, []);

  // Attach wheel event listener
  useEffect(() => {
    const chartContainer = document.getElementById("stock-chart-container");
    if (!chartContainer) return;

    chartContainer.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      chartContainer.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

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
                <span
                  className={`font-semibold ${
                    change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)} ({changePct.toFixed(2)}%)
                </span>
              ) : (
                "No recent data"
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={onRefreshNow}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh now"}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex gap-2 flex-wrap">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                className={`btn ${
                  timeframe === tf.key ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => setTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
              <button
                className="text-lg font-bold text-gray-700 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={handleZoomOut}
                disabled={zoomPercentage >= 100}
                title="Zoom out (Ctrl + Scroll down)"
              >
                −
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                {zoomPercentage.toFixed(0)}%
              </span>
              <button
                className="text-lg font-bold text-gray-700 dark:text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={handleZoomIn}
                disabled={zoomPercentage <= 10}
                title="Zoom in (Ctrl + Scroll up)"
              >
                +
              </button>
            </div>

            {/* Chart Type Buttons */}
            <button
              className={`btn ${
                chartType === "candlestick" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setChartType("candlestick")}
            >
              🕯️ Candlestick
            </button>
            <button
              className={`btn ${
                chartType === "line" ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setChartType("line")}
            >
              📈 Line
            </button>

            {/* Reset Zoom Button */}
            {(zoomDomain.start !== 0 || zoomDomain.end !== 100) && (
              <button
                className="btn btn-outline"
                onClick={handleResetZoom}
                title="Reset zoom"
              >
                🔍 Reset
              </button>
            )}
          </div>
        </div>

        {/* Zoom Instructions */}
        <div className="px-3 pb-2">
          <div
            className={`text-xs px-2 py-1 rounded ${
              isDark
                ? "bg-blue-900/30 text-blue-300"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            💡 <strong>Tip:</strong> Giữ Ctrl (hoặc Cmd) và cuộn chuột để zoom
            in/out
            {(zoomDomain.start !== 0 || zoomDomain.end !== 100) && (
              <span className="ml-2">
                - Đang xem: {Math.round(zoomDomain.start)}% →{" "}
                {Math.round(zoomDomain.end)}%
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div
          id="stock-chart-container"
          className={`w-full h-[460px] border-t transition-colors duration-200 ${
            isDark
              ? "bg-slate-900/50 border-slate-700/30"
              : "bg-white border-slate-200/50"
          }`}
        >
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
              <ComposedChart
                data={zoomedChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient
                    id="priceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={chartColors.accent}
                      stopOpacity={isDark ? 0.25 : 0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartColors.accent}
                      stopOpacity={0}
                    />
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
                {chartType === "candlestick" && (
                  <Bar
                    dataKey="high"
                    shape={(props) => (
                      <Candlestick {...props} payload={props.payload} />
                    )}
                    isAnimationActive={false}
                  />
                )}
                {chartType === "line" && (
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={chartColors.accent}
                    dot={false}
                    strokeWidth={2.25}
                    activeDot={{
                      r: 3,
                      stroke: chartColors.accentSoft,
                      strokeWidth: 2,
                      fill: isDark
                        ? chartColors.accentSoft
                        : chartColors.accent,
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actions panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="card-header">
            <div className="card-title">� Advanced Trading</div>
            <span className="card-subtle">
              Market, Limit, Stop, Stop-Limit orders
            </span>
          </div>
          <div className="space-y-4">
            {latest && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>
                  Giá hiện tại:{" "}
                  <span className="font-bold text-cyan-500">
                    {formatCurrency(latest.price)}
                  </span>
                </p>
                <p>
                  Số dư:{" "}
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(user?.balance || 0)}
                  </span>
                </p>
                {userHolding && (
                  <p>
                    Đang nắm giữ:{" "}
                    <span className="font-bold text-blue-500">
                      {userHolding.quantity} cổ phiếu
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="btn btn-primary flex-1"
                onClick={handleBuyClick}
                disabled={!latest?.price}
              >
                💳 Mua
              </button>
              {latest?.price && userHolding ? (
                <button
                  className="btn btn-secondary flex-1"
                  onClick={handleSellClick}
                >
                  📉 Bán
                </button>
              ) : (
                <button className="btn btn-secondary flex-1" disabled>
                  📈 Bán {userHolding ? "" : "(Không có cổ phiếu)"}
                </button>
              )}
            </div>
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
            {loadingAIAnalysis ? "Analyzing..." : "Analyze with AI"}
          </button>
        </div>
        {aiAnalysisError && (
          <div className="text-red-600 dark:text-red-400 p-3">
            Error: {aiAnalysisError}
          </div>
        )}
        {aiAnalysis ? (
          <div className="p-4 space-y-3">
            <p>
              <strong>Overall Sentiment:</strong>{" "}
              <span
                className={`font-semibold ${
                  aiAnalysis.sentiment === "Positive"
                    ? "text-green-600"
                    : aiAnalysis.sentiment === "Negative"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {aiAnalysis.sentiment}
              </span>
            </p>
            <p>
              <strong>Short-Term Trend:</strong>{" "}
              <span
                className={`font-semibold ${
                  aiAnalysis.price_trends.short_term_trend === "Bullish"
                    ? "text-green-600"
                    : aiAnalysis.price_trends.short_term_trend === "Bearish"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {aiAnalysis.price_trends.short_term_trend}
              </span>
            </p>
            <p>
              <strong>Long-Term Trend:</strong>{" "}
              <span
                className={`font-semibold ${
                  aiAnalysis.price_trends.long_term_trend === "Bullish"
                    ? "text-green-600"
                    : aiAnalysis.price_trends.long_term_trend === "Bearish"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {aiAnalysis.price_trends.long_term_trend}
              </span>
            </p>
            <p>
              <strong>Profit Potential:</strong>{" "}
              <span className="font-semibold text-cyan-500">
                {aiAnalysis.profit_potential}
              </span>
            </p>
            <p>
              <strong>Risk Level:</strong>{" "}
              <span className="font-semibold text-orange-500">
                {aiAnalysis.risk_level}
              </span>
            </p>
            {aiAnalysis.price_trends.ma_short && (
              <p>
                <strong>MA (10 days):</strong>{" "}
                {formatCurrency(aiAnalysis.price_trends.ma_short)}
              </p>
            )}
            {aiAnalysis.price_trends.ma_long && (
              <p>
                <strong>MA (50 days):</strong>{" "}
                {formatCurrency(aiAnalysis.price_trends.ma_long)}
              </p>
            )}
          </div>
        ) : (
          !loadingAIAnalysis &&
          !aiAnalysisError && (
            <div className="p-4 text-slate-600 dark:text-slate-400">
              Click "Analyze with AI" to get a comprehensive analysis for{" "}
              {symbol}.
            </div>
          )
        )}
      </div>

      {/* Order Form Modal - Advanced Trading */}
      {showOrderForm && stockForOrderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <OrderForm
              stock={stockForOrderForm}
              orderType={orderType}
              onSubmit={handleOrderSubmit}
              onCancel={() => setShowOrderForm(false)}
              userBalance={user?.balance || 0}
            />
          </div>
        </div>
      )}

      {/* Buy Modal Component - Old System (Keeping for backward compatibility) */}
      <BuyModal
        isOpen={false}
        onClose={() => {}}
        stock={stockForOrderForm}
        onBuySuccess={handleBuySuccess}
      />

      {/* Sell Modal Component - Old System (Keeping for backward compatibility) */}
      <SellModal
        isOpen={false}
        onClose={() => {}}
        stock={stockForOrderForm}
        userHolding={userHolding}
        onSellSuccess={handleSellSuccess}
        marketData={marketData}
      />

      {/* AI Chat Widget */}
      <AIChatWidget stockSymbol={symbol} />
    </div>
  );
}
