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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  return (
    <div style={{ background: 'rgba(2,6,23,.95)', color: '#e2e8f0', padding: '.5rem .75rem', borderRadius: '.5rem', boxShadow: '0 6px 24px rgba(0,0,0,.35)', border: '1px solid rgba(148,163,184,.2)' }}>
      <div style={{ fontSize: 12, opacity: .8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, color: '#22d3ee' }}>{formatCurrency(p.price)}</div>
      <div style={{ fontSize: 12, opacity: .85 }}>Vol: {p.volume?.toLocaleString?.() || p.volume}</div>
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('ALL');
  const [chartType, setChartType] = useState('area'); // 'area' | 'line'
  const [refreshing, setRefreshing] = useState(false);

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

  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;
  const change = latest && first ? latest.price - first.price : 0;
  const changePct = latest && first && first.price ? (change / first.price) * 100 : 0;

  // Modern cyan theme (good on light/dark panels)
  const accent = '#06b6d4'; // cyan-500
  const accentSoft = '#22d3ee'; // cyan-400

  const chartData = useMemo(() => {
    return (history || []).map((h) => ({
      time: new Date(h.timestamp).toISOString(),
      price: h.price,
      volume: h.volume,
    }));
  }, [history]);

  return (
    <div className="container" style={{ padding: '1rem 1rem 2rem' }}>
      {/* Header with symbol and key stats */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header" style={{ alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
              <span>{symbol}</span>
              {latest ? (
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: accentSoft }}>
                  {formatCurrency(latest.price)}
                </span>
              ) : null}
            </div>
            <div className="card-subtle">
              {latest ? (
                <span style={{ color: change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
                </span>
              ) : (
                'No recent data'
              )}
            </div>
          </div>
          <div className="flex" style={{ gap: '.5rem' }}>
            <button className="btn btn-outline" onClick={onRefreshNow} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between" style={{ padding: '0 .75rem .75rem' }}>
          <div className="flex" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
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
          <div className="flex" style={{ gap: '.5rem' }}>
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
        <div style={{ width: '100%', height: 460, background: 'var(--panel, #fff)', borderTop: '1px solid rgba(148,163,184,.15)' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: '100%' }}>Loading chart...</div>
          ) : error ? (
            <div className="flex items-center justify-center" style={{ height: '100%', color: 'red' }}>{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: 'rgba(30,41,59,.85)' }}
                  minTickGap={24}
                  tickFormatter={(value) => formatXAxisLabel(value, timeframe)}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12, fill: 'rgba(30,41,59,.85)' }}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  labelFormatter={(v) => formatXAxisLabel(v, timeframe)}
                  cursor={{ stroke: 'rgba(14,165,233,.55)', strokeWidth: 1 }}
                />
                {first && (
                  <ReferenceLine y={first.price} stroke="rgba(148,163,184,.5)" strokeDasharray="3 3" />
                )}
                {chartType === 'area' && (
                  <Area type="monotone" dataKey="price" stroke={accent} fill="url(#priceGradient)" strokeWidth={2.25} dot={false} />
                )}
                {chartType === 'line' && (
                  <Line type="monotone" dataKey="price" stroke={accent} dot={false} strokeWidth={2.25} activeDot={{ r: 3, stroke: accentSoft, strokeWidth: 2 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actions panel (placeholders for future trading actions) */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Quick Trade</div>
            <span className="card-subtle">Place a mock order (coming soon)</span>
          </div>
          <div className="flex" style={{ gap: '.5rem' }}>
            <button className="btn btn-primary" disabled>Buy</button>
            <button className="btn btn-secondary" disabled>Sell</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Alerts</div>
            <span className="card-subtle">Set price alerts (coming soon)</span>
          </div>
          <div className="flex" style={{ gap: '.5rem' }}>
            <button className="btn btn-outline" disabled>Create Alert</button>
          </div>
        </div>
      </div>
    </div>
  );
}


