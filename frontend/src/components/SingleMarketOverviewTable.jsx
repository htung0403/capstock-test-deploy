/*
  File: frontend/src/components/SingleMarketOverviewTable.jsx
  Purpose: Displays a single table with top stocks, including their current price, daily change, and percentage change.
  Date: 2025-11-17
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const SingleMarketOverviewTable = ({ stocks, loading, error }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`p-4 rounded-lg shadow-lg overflow-x-auto
      ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
    `}>
      <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Market Overview</h2>
      
      {loading ? (
        <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading market data...</p>
      ) : error ? (
        <p className="text-center text-red-500">Error: {error}</p>
      ) : stocks.length === 0 ? (
        <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No data available.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-700">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <tr>
              <th scope="col" className={`px-4 py-2 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Symbol</th>
              <th scope="col" className={`px-4 py-2 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Name</th>
              <th scope="col" className={`px-4 py-2 text-right text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Price</th>
              <th scope="col" className={`px-4 py-2 text-right text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Change</th>
              <th scope="col" className={`px-4 py-2 text-right text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>% Change</th>
              <th scope="col" className={`px-4 py-2 text-right text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {stocks.map((stock) => {
              const changeColorClass = stock.change >= 0 ? 'text-green-500' : 'text-red-500';
              const changeSign = stock.change >= 0 ? '+' : '';
              
              const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stock.currentPrice || 0);
              const formattedChange = `${changeSign}${stock.change.toFixed(2)}`;
              const formattedChangePct = `${changeSign}${stock.change_pct.toFixed(2)}%`;

              return (
                <tr key={stock.symbol} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Link to={`/stocks/${stock.symbol}`} className="hover:underline text-blue-500">
                      {stock.symbol}
                    </Link>
                  </td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{stock.name}</td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{formattedPrice}</td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm text-right ${changeColorClass}`}>{formattedChange}</td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm text-right ${changeColorClass}`}>{formattedChangePct}</td>
                  <td className={`px-4 py-2 whitespace-nowrap text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{new Intl.NumberFormat().format(stock.volume)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SingleMarketOverviewTable;