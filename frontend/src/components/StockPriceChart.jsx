import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const TIME_RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y', '10Y', 'ALL'];

const StockPriceChart = ({ symbol, defaultRange = '1W' }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [range, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#1e293b' : '#ffffff' },
        textColor: isDark ? '#e2e8f0' : '#1e293b',
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
    });

    // Add area series for price
    const areaSeries = chart.addAreaSeries({
      lineColor: '#22c55e', // Green color
      topColor: 'rgba(34, 197, 94, 0.4)',
      bottomColor: 'rgba(34, 197, 94, 0.0)',
      lineWidth: 2,
    });

    // Add histogram series for volume (on separate price scale)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      color: isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(148, 163, 184, 0.5)',
    });

    // Create separate price scale for volume
    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDark]);

  // Fetch and update data when range or symbol changes
  useEffect(() => {
    async function fetchData() {
      if (!chartRef.current || !areaSeriesRef.current || !volumeSeriesRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/stocks/symbol/${symbol}/history?range=${range}`);
        const data = response.data || [];

        if (data.length === 0) {
          setError('No data available for this time range');
          setLoading(false);
          return;
        }

        // Convert time strings to timestamps (lightweight-charts expects Unix timestamps)
        const priceData = data.map((point) => ({
          time: point.time, // lightweight-charts can handle YYYY-MM-DD format
          value: point.close,
        }));

        const volumeData = data.map((point) => ({
          time: point.time,
          value: point.volume,
          color: point.close >= point.open 
            ? (isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)')
            : (isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.3)'),
        }));

        areaSeriesRef.current.setData(priceData);
        volumeSeriesRef.current.setData(volumeData);

        // Fit content to show all data
        chartRef.current.timeScale().fitContent();
      } catch (err) {
        console.error('Error fetching stock history:', err);
        setError(err?.response?.data?.message || 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [symbol, range, isDark]);

  return (
    <div className="space-y-3">
      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-1">
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              r === range
                ? isDark
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : isDark
                ? 'bg-white/10 text-slate-300 hover:bg-white/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: '400px', minHeight: '400px' }}
      />

      {/* Loading/Error States */}
      {loading && (
        <div className="text-center py-4">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Loading chart data...
          </p>
        </div>
      )}

      {error && (
        <div className={`text-center py-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default StockPriceChart;

