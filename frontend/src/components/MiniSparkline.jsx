import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const MiniSparkline = ({ symbol, width = 60, height = 20 }) => {
  const [data, setData] = useState([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/stocks/symbol/${symbol}/history?range=1W&limit=7`);
        const history = response.data || [];
        if (history.length > 0) {
          const prices = history.map(h => h.close || h.price).filter(Boolean);
          setData(prices);
        }
      } catch (err) {
        console.error(`Error fetching sparkline data for ${symbol}:`, err);
      }
    };

    if (symbol) {
      fetchData();
    }
  }, [symbol]);

  if (data.length === 0) {
    return (
      <div 
        className={`${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}
        style={{ width, height, borderRadius: '2px' }}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((price, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((price - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = isPositive ? '#22c55e' : '#ef4444';
  const fillColor = isPositive 
    ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
    : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={fillColor}
      />
    </svg>
  );
};

export default MiniSparkline;

