/*
  File: frontend/src/components/MarketBoard.jsx
  Purpose: Displays a board of stock cards, typically used for lists like Top Gainers, Top Losers, Most Active.
  Date: 2025-11-17
*/

import React from 'react';
import StockCard from './StockCard';
import { useTheme } from '../contexts/ThemeContext';

const MarketBoard = ({ title, stocks, loading, error }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`p-4 rounded-lg shadow-lg 
      ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
    `}>
      <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
      {loading ? (
        <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
      ) : error ? (
        <p className="text-center text-red-500">Error: {error}</p>
      ) : stocks.length === 0 ? (
        <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No data available.</p>
      ) : (
        <div className="grid gap-4">
          {stocks.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketBoard;
