/*
  File: frontend/src/components/StockCard.jsx
  Purpose: Displays a summary card for a single stock with its current price, daily change, and percentage change.
  Date: 2025-11-17
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const StockCard = ({ stock }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!stock) {
    return null;
  }

  const { symbol, name, currentPrice, change, change_pct } = stock;

  const changeColorClass = change >= 0 ? 'text-green-500' : 'text-red-500';
  const changeSign = change >= 0 ? '+' : '';

  const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentPrice);
  const formattedChange = `${changeSign}${change.toFixed(2)}`;
  const formattedChangePct = `${changeSign}${change_pct.toFixed(2)}%`;

  return (
    <Link 
      to={`/stocks/${symbol}`}
      className={`flex flex-col p-4 rounded-lg shadow-md transition-all duration-200 ease-in-out 
        ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}
        border ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{symbol}</h3>
        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${change >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
          {formattedChangePct}
        </span>
      </div>
      <p className={`text-xl font-extrabold mb-1 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>{formattedPrice}</p>
      <p className={`text-sm ${changeColorClass}`}>{formattedChange}</p>
      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{name}</p>
    </Link>
  );
};

export default StockCard;
