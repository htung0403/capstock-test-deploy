/*
  File: frontend/src/pages/StockDetail.jsx
  Purpose: Displays detailed information about a single stock, including historical data, trading options, and AI analysis.
  
  CHANGES (2025-10-20):
  - Added AI Advisor Analysis panel to display comprehensive stock analysis (sentiment, trends, recommendations).
  - Integrated `AIChatWidget` to provide a floating chat interface for AI interaction with stock-specific context.
*/
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import SellModal from "../components/SellModal";
import BuyModal from "../components/BuyModal";
import OrderForm from "../components/OrderForm";
import AIChatWidget from "../components/AIChatWidget";
import StockChart from "../components/StockChart";

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
      // Portfolio response has holdings array
      const holdings = response.data?.holdings || response.data || [];
      const holding = Array.isArray(holdings) 
        ? holdings.find((h) => h.stock?.symbol === symbol.toUpperCase())
        : null;
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
      // Use hybrid analysis instead of comprehensive analysis (better technical indicators)
      const res = await api.get(`/ai/hybrid-analysis/${symbol}`);
      // Transform hybrid analysis result to match existing UI structure
      const hybridData = res.data.hybrid_analysis;
      setAiAnalysis({
        sentiment: hybridData.sentiment_label,
        price_trends: {
          short_term_trend: hybridData.technical_signal,
          long_term_trend: hybridData.technical_signal, // Use technical signal for both
          ma_short: hybridData.ema_20,
          ma_long: null, // EMA instead of SMA
        },
        profit_potential: hybridData.final_signal === "Buy" ? "High" : hybridData.final_signal === "Sell" ? "Low" : "Moderate",
        risk_level: hybridData.confidence === "High" ? "Low to Moderate" : hybridData.confidence === "Medium" ? "Moderate" : "Moderate to High",
        // Additional hybrid analysis fields
        hybrid_analysis: hybridData, // Keep full hybrid data for detailed display
      });
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

  // Prepare chart data for lightweight-charts
  const chartData = useMemo(() => {
    return (history || []).map((h) => {
      // Handle both timestamp (Date) and time (string) formats
      let timeValue;
      if (h.timestamp) {
        const date = new Date(h.timestamp);
        timeValue = isNaN(date.getTime()) ? h.time || h.timestamp : date.toISOString();
      } else if (h.time) {
        timeValue = h.time;
      } else {
        // Fallback: use current time if no time field
        timeValue = new Date().toISOString();
      }
      
      return {
        time: timeValue,
        price: h.price,
        open: h.open || h.price,
        high: h.high || h.price,
        low: h.low || h.price,
        close: h.close || h.price,
        volume: h.volume || 0,
      };
    });
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
        <div className="flex items-center justify-between px-3 pb-3 flex-wrap gap-3">
          {/* Time Range Segmented Control */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  timeframe === tf.key
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                onClick={() => setTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart Type Segmented Control */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-wrap">
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                chartType === "candlestick"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              onClick={() => setChartType("candlestick")}
            >
              🕯️ Candlestick
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                chartType === "line"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              onClick={() => setChartType("line")}
            >
              📈 Line
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                chartType === "baseline"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              onClick={() => setChartType("baseline")}
            >
              📊 Baseline
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                chartType === "histogram"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              onClick={() => setChartType("histogram")}
            >
              📉 Histogram
            </button>
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
            💡 <strong>Tip:</strong> Giữ Ctrl (hoặc Cmd) và cuộn chuột để zoom in/out
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-[460px] border-t bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
              Loading chart...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
              No data available
            </div>
          ) : (
            <StockChart
              mode={chartType}
              data={chartData}
              selectedRange={timeframe}
              onRangeChange={setTimeframe}
              onModeChange={setChartType}
            />
          )}
        </div>
      </div>

      {/* Actions panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="card-header">
            <div className="card-title">💳 Advanced Trading</div>
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

            {/* Enhanced display with hybrid analysis details if available */}
            {aiAnalysis.hybrid_analysis && (
              <>
                {/* Confidence Warning */}
                {aiAnalysis.hybrid_analysis.confidence_warning && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3 mb-3">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm font-semibold">
                      ⚠️ {aiAnalysis.hybrid_analysis.confidence_warning}
                    </p>
                  </div>
                )}

                {/* Technical Indicators */}
                <div className="border-t dark:border-gray-700 pt-3 mt-3">
                  <h4 className="font-bold text-sm mb-2 text-gray-600 dark:text-gray-400">📊 Technical Indicators</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>EMA (20):</strong>{" "}
                      <span className="font-semibold text-cyan-500">
                        {aiAnalysis.hybrid_analysis.ema_20 ? formatCurrency(aiAnalysis.hybrid_analysis.ema_20) : "N/A"}
                      </span>
                    </div>
                    <div>
                      <strong>RSI (14):</strong>{" "}
                      <span className={`font-semibold ${
                        aiAnalysis.hybrid_analysis.rsi_14 > 70 ? "text-red-500" :
                        aiAnalysis.hybrid_analysis.rsi_14 < 30 ? "text-green-500" :
                        "text-yellow-500"
                      }`}>
                        {aiAnalysis.hybrid_analysis.rsi_14 ? aiAnalysis.hybrid_analysis.rsi_14.toFixed(2) : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Signal with Confidence */}
                <div className="border-t dark:border-gray-700 pt-3 mt-3">
                  <p>
                    <strong>Final Signal:</strong>{" "}
                    <span
                      className={`font-bold text-lg ${
                        aiAnalysis.hybrid_analysis.final_signal === "Buy"
                          ? "text-green-600"
                          : aiAnalysis.hybrid_analysis.final_signal === "Sell"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {aiAnalysis.hybrid_analysis.final_signal}
                    </span>
                    {" "}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      (Confidence: {aiAnalysis.hybrid_analysis.confidence})
                    </span>
                  </p>
                  {aiAnalysis.hybrid_analysis.explanation && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                      {aiAnalysis.hybrid_analysis.explanation}
                    </p>
                  )}
                </div>
              </>
            )}

            {aiAnalysis.price_trends.ma_short && (
              <p>
                <strong>EMA (20 days):</strong>{" "}
                {formatCurrency(aiAnalysis.price_trends.ma_short)}
              </p>
            )}
          </div>
        ) : (
          !loadingAIAnalysis &&
          !aiAnalysisError && (
            <div className="p-4 text-slate-600 dark:text-slate-400">
              Click "Analyze with AI" to get a comprehensive hybrid analysis (Technical Indicators + Sentiment) for{" "}
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
