/*
  File: frontend/src/components/StockChart.jsx
  Purpose: Professional stock price chart using TradingView lightweight-charts library
*/
import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, AreaSeries, BaselineSeries, HistogramSeries } from 'lightweight-charts';
import { useTheme } from '../contexts/ThemeContext';

function formatCurrency(n) {
  if (n == null || Number.isNaN(n)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function StockChart({ mode, data, selectedRange, onRangeChange, onModeChange }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Drawing tools state
  const [activeTool, setActiveTool] = useState(null); // null | 'trendline' | 'fibo' | 'ruler' | 'rectangle'
  const [shapes, setShapes] = useState([]); // Array of finalized shape objects
  const [isDrawing, setIsDrawing] = useState(false); // Track if currently drawing
  const [draftShape, setDraftShape] = useState(null); // Temporary shape during drag

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Get container dimensions - ensure it has size
    const rect = chartContainerRef.current.getBoundingClientRect();
    let { width, height } = rect;
    
    // Fallback if container has no size yet
    if (width === 0 || height === 0) {
      width = chartContainerRef.current.clientWidth || 800;
      height = chartContainerRef.current.clientHeight || 460;
    }

    // Create chart with proper options
    const chartOptions = {
      layout: {
        textColor: isDark ? '#e2e8f0' : '#6b7280',
        background: {
          type: 'solid',
          color: isDark ? '#1e293b' : '#ffffff',
        },
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.18)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.18)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.4)',
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      // Disable chart interactions when drawing tools are active (handled by overlay)
      // We'll control this dynamically
      width,
      height,
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      const { width, height } = chartContainerRef.current.getBoundingClientRect();
      chartRef.current.applyOptions({ width, height });
    };

    // Initial resize
    handleResize();
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDark]);

  // Create/update series based on mode
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Remove existing series (only if it exists and is valid)
    // In React Strict Mode, this effect runs twice, so we need to handle the case
    // where the series might already be removed
    if (seriesRef.current) {
      try {
        if (chartRef.current) {
          chartRef.current.removeSeries(seriesRef.current);
        }
      } catch (error) {
        // Series might already be removed or invalid, just clear the ref
        // This is expected in React Strict Mode (double mount)
      } finally {
        // Always clear the ref after attempting to remove
        seriesRef.current = null;
      }
    }

    // Prepare data for lightweight-charts
    // lightweight-charts requires data to be sorted by time in ascending order
    // and no duplicate time entries, and all values must be valid numbers
    let chartData = data
      .map((item) => {
        // Skip invalid items
        if (!item || !item.time) return null;

        const date = new Date(item.time);
        // Skip invalid dates
        if (isNaN(date.getTime())) return null;

        // Format as 'YYYY-MM-DD' string (recommended for daily data)
        const timeStr = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        
        if (mode === 'candlestick') {
          // Validate all OHLC values exist and are numbers
          const open = Number(item.open);
          const high = Number(item.high);
          const low = Number(item.low);
          const close = Number(item.close);

          if (
            isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) ||
            item.open === undefined || item.high === undefined ||
            item.low === undefined || item.close === undefined
          ) {
            return null; // Skip invalid candlestick data
          }

          return {
            time: timeStr,
            open,
            high,
            low,
            close,
          };
        } else if (mode === 'baseline' || mode === 'histogram') {
          // Baseline and Histogram use single value
          const value = Number(item.close || item.price);
          if (isNaN(value) || (item.close === undefined && item.price === undefined)) {
            return null; // Skip invalid data
          }

          return {
            time: timeStr,
            value,
          };
        } else {
          // Line/Area chart
          const value = Number(item.close || item.price);
          if (isNaN(value) || (item.close === undefined && item.price === undefined)) {
            return null; // Skip invalid line data
          }

          return {
            time: timeStr,
            value,
          };
        }
      })
      .filter((item) => item !== null); // Remove null entries

    // If no valid data, return early
    if (chartData.length === 0) {
      console.warn('StockChart: No valid data points after filtering');
      return;
    }

    // Remove duplicates (keep the last entry if same time)
    const timeMap = new Map();
    chartData.forEach((item) => {
      timeMap.set(item.time, item);
    });
    chartData = Array.from(timeMap.values());

    // Sort by time in ascending order
    chartData.sort((a, b) => {
      // Compare time strings 'YYYY-MM-DD'
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });

    // Create new series using addSeries with series type
    if (mode === 'candlestick') {
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderVisible: false,
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
      candlestickSeries.setData(chartData);
      seriesRef.current = candlestickSeries;
    } else if (mode === 'baseline') {
      // Calculate base value (average of all values)
      const avgValue = chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length;
      
      const baselineSeries = chartRef.current.addSeries(BaselineSeries, {
        baseValue: {
          type: 'price',
          price: avgValue,
        },
        topLineColor: 'rgba(38, 166, 154, 1)', // Green
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        bottomLineColor: 'rgba(239, 83, 80, 1)', // Red
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
      baselineSeries.setData(chartData);
      seriesRef.current = baselineSeries;
    } else if (mode === 'histogram') {
      const histogramSeries = chartRef.current.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
      histogramSeries.setData(chartData);
      seriesRef.current = histogramSeries;
    } else {
      // Line/Area chart
      const lineSeries = chartRef.current.addSeries(AreaSeries, {
        lineColor: '#2563eb',
        topColor: 'rgba(37, 99, 235, 0.12)',
        bottomColor: 'rgba(37, 99, 235, 0)',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
      lineSeries.setData(chartData);
      seriesRef.current = lineSeries;
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [mode, data]);

  // Create tooltip element
  useEffect(() => {
    if (!chartContainerRef.current || tooltipRef.current) return;

    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      width: 120px;
      height: auto;
      min-height: 80px;
      position: absolute;
      display: none;
      padding: 8px;
      box-sizing: border-box;
      font-size: 12px;
      text-align: left;
      z-index: 1000;
      pointer-events: none;
      border: 1px solid;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    `;
    tooltip.style.background = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    tooltip.style.color = isDark ? '#e2e8f0' : '#1f2937';
    tooltip.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(37, 99, 235, 0.3)';
    
    chartContainerRef.current.appendChild(tooltip);
    tooltipRef.current = tooltip;

    return () => {
      if (tooltipRef.current && chartContainerRef.current) {
        chartContainerRef.current.removeChild(tooltipRef.current);
      }
    };
  }, [isDark]);

  // Handle crosshair move for TradingView-style tooltip
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !tooltipRef.current || !data || data.length === 0) return;

    const container = chartContainerRef.current;
    const tooltip = tooltipRef.current;
    const toolTipWidth = 120;
    const toolTipHeight = 80;
    const toolTipMargin = 15;

    const handleCrosshairMove = (param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        tooltip.style.display = 'none';
        return;
      }

      const dateStr = param.time;
      const seriesData = param.seriesData.get(seriesRef.current);
      
      if (!seriesData) {
        tooltip.style.display = 'none';
        return;
      }

      // Get price value (handle different series types)
      let price = seriesData.value !== undefined ? seriesData.value : 
                  seriesData.close !== undefined ? seriesData.close : 
                  seriesData.high !== undefined ? seriesData.high : null;

      if (price === null) {
        tooltip.style.display = 'none';
        return;
      }

      // Format price
      const formattedPrice = Math.round(100 * price) / 100;

      // Build tooltip content
      let tooltipContent = `
        <div style="color: ${isDark ? '#60a5fa' : '#2563eb'}; font-weight: 600; margin-bottom: 4px;">
          ${data[0]?.symbol || 'Stock'}
        </div>
        <div style="font-size: 20px; margin: 4px 0px; color: ${isDark ? '#e2e8f0' : '#1f2937'}; font-weight: 600;">
          ${formatCurrency(formattedPrice)}
        </div>
        <div style="color: ${isDark ? '#94a3b8' : '#6b7280'}; font-size: 11px; margin-top: 4px;">
          ${dateStr}
        </div>
      `;

      // Add OHLC data if available (for candlestick)
      if (seriesData.open !== undefined && seriesData.high !== undefined && 
          seriesData.low !== undefined && seriesData.close !== undefined) {
        tooltipContent += `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'};">
            <div style="font-size: 10px; color: ${isDark ? '#94a3b8' : '#6b7280'}; margin-top: 2px;">
              <span style="opacity: 0.7;">O:</span> <span style="color: ${isDark ? '#e2e8f0' : '#1f2937'}">${formatCurrency(seriesData.open)}</span>
            </div>
            <div style="font-size: 10px; color: ${isDark ? '#94a3b8' : '#6b7280'}; margin-top: 2px;">
              <span style="opacity: 0.7;">H:</span> <span style="color: #16a34a">${formatCurrency(seriesData.high)}</span>
            </div>
            <div style="font-size: 10px; color: ${isDark ? '#94a3b8' : '#6b7280'}; margin-top: 2px;">
              <span style="opacity: 0.7;">L:</span> <span style="color: #dc2626">${formatCurrency(seriesData.low)}</span>
            </div>
            <div style="font-size: 10px; color: ${isDark ? '#94a3b8' : '#6b7280'}; margin-top: 2px;">
              <span style="opacity: 0.7;">C:</span> <span style="color: ${isDark ? '#60a5fa' : '#2563eb'}">${formatCurrency(seriesData.close)}</span>
            </div>
        `;
        
        if (seriesData.volume !== undefined) {
          tooltipContent += `
            <div style="font-size: 10px; color: ${isDark ? '#94a3b8' : '#6b7280'}; margin-top: 2px;">
              <span style="opacity: 0.7;">Vol:</span> <span style="color: ${isDark ? '#e2e8f0' : '#1f2937'}">${(seriesData.volume || 0).toLocaleString()}</span>
            </div>
          `;
        }
        
        tooltipContent += `</div>`;
      } else if (seriesData.volume !== undefined) {
        // For line/area charts, show volume if available
        tooltipContent += `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'};">
            <div style="font-size: 10px; color: ${isDark ? '#94a3b8' : '#6b7280'};">
              <span style="opacity: 0.7;">Vol:</span> <span style="color: ${isDark ? '#e2e8f0' : '#1f2937'}">${(seriesData.volume || 0).toLocaleString()}</span>
            </div>
          </div>
        `;
      }

      tooltip.innerHTML = tooltipContent;
      tooltip.style.display = 'block';

      // Position tooltip (Tracking style - follows cursor)
      const y = param.point.y;
      let left = param.point.x + toolTipMargin;
      
      // Adjust if tooltip goes off right edge
      if (left > container.clientWidth - toolTipWidth) {
        left = param.point.x - toolTipMargin - toolTipWidth;
      }
      
      // Ensure tooltip stays within bounds
      left = Math.max(0, Math.min(left, container.clientWidth - toolTipWidth));

      let top = y + toolTipMargin;
      
      // Adjust if tooltip goes off bottom edge
      if (top > container.clientHeight - toolTipHeight) {
        top = y - toolTipHeight - toolTipMargin;
      }
      
      // Ensure tooltip stays within bounds
      top = Math.max(0, Math.min(top, container.clientHeight - toolTipHeight));

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove(handleCrosshairMove);
      }
    };
  }, [data, mode, isDark]);

  // Update chart theme when dark mode changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: 'solid', color: isDark ? '#1e293b' : '#ffffff' },
        textColor: isDark ? '#e2e8f0' : '#6b7280',
      },
    });
  }, [isDark]);

  // Note: We don't disable chart interactions anymore
  // The overlay layer will handle pointer events based on activeTool
  // Chart can still scroll/zoom when tool is active (overlay will be transparent to events when activeTool === 'cursor')

  // Redraw overlay when shapes change, chart resizes, or visible range changes
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !overlayCanvasRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = chartContainerRef.current?.getBoundingClientRect();
    
    if (!rect || rect.width === 0 || rect.height === 0) {
      return;
    }
    
    // Set canvas size to match container (use device pixel ratio for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Also set CSS size to ensure proper rendering
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Clear canvas (use CSS size for clearing)
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (shapes.length === 0 && !draftShape) return;

    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current;

    // Helper: Convert time to x coordinate
    const timeToX = (time) => {
      let coord;
      if (typeof time === 'string') {
        // Convert 'YYYY-MM-DD' to timestamp
        const timestamp = new Date(time).getTime() / 1000;
        coord = timeScale.timeToCoordinate(timestamp);
      } else if (typeof time === 'number') {
        coord = timeScale.timeToCoordinate(time);
      } else {
        return null;
      }
      return coord;
    };

    // Helper: Convert price to y coordinate
    // Use series.priceToCoordinate for consistency with coordinateToPrice
    const priceToY = (price) => {
      return series.priceToCoordinate(price);
    };

    // Draw all shapes
    shapes.forEach((shape) => {
      ctx.strokeStyle = shape.color || (isDark ? '#3b82f6' : '#2563eb');
      ctx.fillStyle = shape.fillColor || (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)');
      ctx.lineWidth = shape.lineWidth || 2;
      ctx.setLineDash(shape.dashed ? [5, 5] : []);

      if (shape.type === 'trendline') {
        const x1 = timeToX(shape.p1.time);
        const y1 = priceToY(shape.p1.price);
        const x2 = timeToX(shape.p2.time);
        const y2 = priceToY(shape.p2.price);

        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (shape.type === 'rectangle') {
        const x1 = timeToX(shape.p1.time);
        const y1 = priceToY(shape.p1.price);
        const x2 = timeToX(shape.p2.time);
        const y2 = priceToY(shape.p2.price);

        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const width = maxX - minX;
          const height = maxY - minY;

          // Draw filled rectangle
          ctx.fillRect(minX, minY, width, height);
          // Draw border (reset line width for border)
          ctx.lineWidth = 2;
          ctx.strokeRect(minX, minY, width, height);
        }
      } else if (shape.type === 'ruler') {
        const x1 = timeToX(shape.p1.time);
        const y1 = priceToY(shape.p1.price);
        const x2 = timeToX(shape.p2.time);
        const y2 = priceToY(shape.p2.price);

        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          // Draw line
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Calculate metrics
          const deltaPrice = shape.p2.price - shape.p1.price;
          const deltaPercent = (deltaPrice / shape.p1.price) * 100;
          const time1Date = typeof shape.p1.time === 'string' ? new Date(shape.p1.time) : new Date(shape.p1.time * 1000);
          const time2Date = typeof shape.p2.time === 'string' ? new Date(shape.p2.time) : new Date(shape.p2.time * 1000);
          const deltaDays = Math.round((time2Date - time1Date) / (1000 * 60 * 60 * 24));

          // Draw label background
          const labelX = Math.min(x2 + 10, rect.width - 120);
          const labelY = y2;
          const labelText = `Δ${formatCurrency(Math.abs(deltaPrice))} (${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(2)}%, ${deltaDays}d)`;
          
          ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(labelX - 4, labelY - 18, 110, 18);
          
          ctx.fillStyle = isDark ? '#e2e8f0' : '#1f2937';
          ctx.font = '10px monospace';
          ctx.fillText(labelText, labelX, labelY - 4);
        }
      } else if (shape.type === 'fibo') {
        const x1 = timeToX(shape.p1.time);
        const y1 = priceToY(shape.p1.price);
        const x2 = timeToX(shape.p2.time);
        const y2 = priceToY(shape.p2.price);

        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          const minPrice = Math.min(shape.p1.price, shape.p2.price);
          const maxPrice = Math.max(shape.p1.price, shape.p2.price);
          const priceRange = maxPrice - minPrice;
          
          // Fibonacci retracement levels
          const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const fibColors = [
            isDark ? '#ef4444' : '#dc2626', // 0% - red
            isDark ? '#f59e0b' : '#d97706', // 23.6% - orange
            isDark ? '#eab308' : '#ca8a04', // 38.2% - yellow
            isDark ? '#3b82f6' : '#2563eb', // 50% - blue
            isDark ? '#10b981' : '#059669', // 61.8% - green
            isDark ? '#06b6d4' : '#0891b2', // 78.6% - cyan
            isDark ? '#8b5cf6' : '#7c3aed', // 100% - purple
          ];

          const timeStart = Math.min(x1, x2);
          const timeEnd = Math.max(x1, x2);

          fibRatios.forEach((ratio, index) => {
            const level = minPrice + priceRange * ratio;
            const y = priceToY(level);
            
            if (y !== null) {
              ctx.strokeStyle = fibColors[index];
              ctx.lineWidth = 1.5;
              ctx.setLineDash(ratio === 0 || ratio === 1 ? [] : [3, 3]);
              
              ctx.beginPath();
              ctx.moveTo(timeStart, y);
              ctx.lineTo(timeEnd, y);
              ctx.stroke();

              // Draw label on the right
              const labelText = `${(ratio * 100).toFixed(1)}% (${formatCurrency(level)})`;
              ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)';
              ctx.fillRect(timeEnd - 100, y - 9, 98, 14);
              
              ctx.fillStyle = fibColors[index];
              ctx.font = '10px sans-serif';
              ctx.fillText(labelText, timeEnd - 98, y + 2);
            }
          });
        }
      }
    });

    // Draw draft shape if exists (during drag) - with different style for preview
    if (draftShape) {
      // Save current drawing state
      const savedStrokeStyle = ctx.strokeStyle;
      const savedFillStyle = ctx.fillStyle;
      const savedLineWidth = ctx.lineWidth;
      const savedLineDash = ctx.getLineDash();

      // Apply draft style (dashed, lower opacity)
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = draftShape.color || (isDark ? '#3b82f6' : '#2563eb');
      ctx.lineWidth = 2;

      if (draftShape.type === 'trendline') {
        const x1 = timeToX(draftShape.p1.time);
        const y1 = priceToY(draftShape.p1.price);
        const x2 = timeToX(draftShape.p2.time);
        const y2 = priceToY(draftShape.p2.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (draftShape.type === 'rectangle') {
        const x1 = timeToX(draftShape.p1.time);
        const y1 = priceToY(draftShape.p1.price);
        const x2 = timeToX(draftShape.p2.time);
        const y2 = priceToY(draftShape.p2.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          ctx.fillStyle = draftShape.fillColor || (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(5, 150, 105, 0.1)');
          ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        }
      } else if (draftShape.type === 'ruler') {
        const x1 = timeToX(draftShape.p1.time);
        const y1 = priceToY(draftShape.p1.price);
        const x2 = timeToX(draftShape.p2.time);
        const y2 = priceToY(draftShape.p2.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (draftShape.type === 'fibo') {
        const x1 = timeToX(draftShape.p1.time);
        const y1 = priceToY(draftShape.p1.price);
        const x2 = timeToX(draftShape.p2.time);
        const y2 = priceToY(draftShape.p2.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          const minPrice = Math.min(draftShape.p1.price, draftShape.p2.price);
          const maxPrice = Math.max(draftShape.p1.price, draftShape.p2.price);
          const priceRange = maxPrice - minPrice;
          const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const timeStart = Math.min(x1, x2);
          const timeEnd = Math.max(x1, x2);
          fibRatios.forEach((ratio) => {
            const level = minPrice + priceRange * ratio;
            const y = priceToY(level);
            if (y !== null) {
              ctx.strokeStyle = isDark ? '#8b5cf6' : '#7c3aed';
              ctx.lineWidth = 1.5;
              ctx.setLineDash(ratio === 0 || ratio === 1 ? [] : [3, 3]);
              ctx.beginPath();
              ctx.moveTo(timeStart, y);
              ctx.lineTo(timeEnd, y);
              ctx.stroke();
            }
          });
        }
      }

      // Restore drawing state
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = savedStrokeStyle;
      ctx.fillStyle = savedFillStyle;
      ctx.lineWidth = savedLineWidth;
      ctx.setLineDash(savedLineDash);
    }
  }, [shapes, draftShape, activeTool, isDark, data, mode]);

  // Subscribe to chart visible range changes to redraw overlay
  useEffect(() => {
    if (!chartRef.current) return;

    const timeScale = chartRef.current.timeScale();
    const handleVisibleRangeChange = () => {
      // Trigger redraw - the shapes effect will redraw when dependencies change
      // Force canvas resize to trigger redraw
      if (overlayCanvasRef.current && chartContainerRef.current) {
        const canvas = overlayCanvasRef.current;
        const rect = chartContainerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        // Redraw will happen in the shapes effect
      }
    };

    timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
    };
  }, [shapes, draftShape]);

  // Helper: Convert mouse event coordinates to chart coordinates
  const getChartCoordinates = (e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Validate click is within canvas bounds
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return null;
    }

    const chart = chartRef.current;
    if (!chart) return null;

    const timeScale = chart.timeScale();
    if (!timeScale) return null;

    const series = seriesRef.current;
    if (!series) return null;

    // Use lightweight-charts coordinate conversion APIs
    const time = timeScale.coordinateToTime(x);
    const price = series.coordinateToPrice(y);

    if (time == null || price == null) {
      return null;
    }

    // Convert time to string format if needed
    let timeStr;
    if (typeof time === 'string') {
      timeStr = time;
    } else if (typeof time === 'number') {
      const timeDate = new Date(time * 1000);
      if (isNaN(timeDate.getTime())) {
        return null;
      }
      timeStr = timeDate.toISOString().split('T')[0];
    } else {
      return null;
    }

    if (!Number.isFinite(price)) {
      return null;
    }

    return { time: timeStr, price };
  };

  // Helper: Create shape object based on active tool
  const createShape = (p1, p2) => {
    return {
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: activeTool,
      p1,
      p2,
      color: activeTool === 'trendline' ? (isDark ? '#3b82f6' : '#2563eb') :
             activeTool === 'ruler' ? (isDark ? '#f59e0b' : '#d97706') :
             activeTool === 'rectangle' ? (isDark ? '#10b981' : '#059669') :
             (isDark ? '#8b5cf6' : '#7c3aed'), // fibo
      fillColor: activeTool === 'rectangle' ? (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(5, 150, 105, 0.1)') : undefined,
      dashed: activeTool === 'ruler',
    };
  };

  // Handle mouse down - start drawing
  const handleMouseDown = (e) => {
    // Only handle if a tool is active
    if (!activeTool || isDrawing) return;

    e.preventDefault();
    e.stopPropagation();

    if (!chartRef.current || !seriesRef.current || !data || data.length === 0) {
      return;
    }

    const coords = getChartCoordinates(e);
    if (!coords) return;

    // Start drawing - create draft shape with p1 = p2 initially
    const p = { time: coords.time, price: coords.price };
    const draft = createShape(p, p);
    setDraftShape(draft);
    setIsDrawing(true);
  };

  // Handle mouse move - update draft shape while dragging
  const handleMouseMove = (e) => {
    if (!isDrawing || !draftShape) return;

    e.preventDefault();
    e.stopPropagation();

    const coords = getChartCoordinates(e);
    if (!coords) return;

    // Update draft shape p2 - this will trigger useEffect to redraw overlay
    setDraftShape(prev => 
      prev ? { ...prev, p2: { time: coords.time, price: coords.price } } : null
    );
  };

  // Global mouse event handlers for drag (capture events even when mouse leaves overlay)
  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMouseMove = (e) => {
      // Use functional update to access latest draftShape
      setDraftShape(prev => {
        if (!prev) return null;
        
        const coords = getChartCoordinates(e);
        if (!coords) return prev; // Keep current if outside chart
        
        // Update draft shape p2
        return { ...prev, p2: { time: coords.time, price: coords.price } };
      });
    };

    const handleGlobalMouseUp = () => {
      // Use functional update to access latest draftShape
      setDraftShape(prev => {
        if (!prev) return null;
        
        // Finalize the shape
        setShapes(currentShapes => [...currentShapes, prev]);
        setIsDrawing(false);
        return null; // Clear draft
      });
    };

    // Add global listeners when drawing
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDrawing]);

  // Handle mouse up - finalize shape
  const handleMouseUp = (e) => {
    if (!isDrawing || !draftShape) return;

    e.preventDefault();
    e.stopPropagation();

    // Finalize the shape
    setShapes(prev => [...prev, draftShape]);
    setDraftShape(null);
    setIsDrawing(false);
  };

  // Handle mouse leave - treat as mouse up
  const handleMouseLeave = (e) => {
    if (isDrawing) {
      handleMouseUp(e);
    }
  };

  // Clear all drawings
  const handleClearDrawings = () => {
    setShapes([]);
    setDraftShape(null);
    setIsDrawing(false);
  };

  return (
    <div className="relative w-full h-full">
      {/* Drawing Tools Toolbar */}
      <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1 bg-white/90 dark:bg-gray-800/90 rounded-lg p-1 shadow-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTool(null);
            setDraftShape(null);
            setIsDrawing(false);
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTool === null
              ? 'bg-gray-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title="None (zoom/pan mode)"
        >
          🖱️ None
        </button>
        <button
          onClick={() => {
            setActiveTool('trendline');
            setDraftShape(null);
            setIsDrawing(false);
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTool === 'trendline'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title="Trendline (click and drag)"
        >
          📈 Trendline
        </button>
        <button
          onClick={() => {
            setActiveTool('fibo');
            setDraftShape(null);
            setIsDrawing(false);
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTool === 'fibo'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title="Fibonacci Retracement (click and drag from high to low)"
        >
          📊 Fibo
        </button>
        <button
          onClick={() => {
            setActiveTool('ruler');
            setDraftShape(null);
            setIsDrawing(false);
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTool === 'ruler'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title="Ruler (click and drag to measure)"
        >
          📏 Ruler
        </button>
        <button
          onClick={() => {
            setActiveTool('rectangle');
            setDraftShape(null);
            setIsDrawing(false);
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTool === 'rectangle'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title="Rectangle (click and drag for corners)"
        >
          ▭ Rectangle
        </button>
        <button
          onClick={handleClearDrawings}
          className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          title="Clear all drawings"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Chart container with overlay layer (like a glass pane) */}
      <div className="relative" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        {/* Chart layer - always active, can scroll/zoom normally */}
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Overlay layer (glass pane) - transparent layer on top of chart */}
        {/* Only captures mouse events when a drawing tool is active */}
        {activeTool && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: 10,
              pointerEvents: 'auto',
              cursor: 'crosshair',
              backgroundColor: 'transparent',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
          {/* Canvas for drawing shapes */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0"
            style={{
              width: '100%',
              height: '100%',
              touchAction: 'none',
              pointerEvents: 'none', // Canvas itself doesn't capture events, parent div does
            }}
          />
          </div>
        )}
      </div>

    </div>
  );
}

export default StockChart;

