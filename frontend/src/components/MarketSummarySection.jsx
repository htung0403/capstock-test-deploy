/*
  File: frontend/src/components/MarketSummarySection.jsx
  Purpose: Fetches and displays market summary data (Top Gainers, Top Losers, Most Active) in mini boards.
  Date: 2025-11-17
*/

import React, { useState, useEffect } from 'react';
import marketService from '../services/marketService';
import SingleMarketOverviewTable from './SingleMarketOverviewTable'; // Import new component
import { useTheme } from '../contexts/ThemeContext';

const MarketSummarySection = () => {
  const [marketStocks, setMarketStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchMarketSummaries = async () => {
      try {
        setLoading(true);
        setError(null);
        const stocks = await marketService.getMarketOverview(10); // Fetch top 10 stocks
        setMarketStocks(stocks);
      } catch (err) {
        console.error('Error fetching market summaries:', err);
        setError('Failed to load market data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketSummaries();
  }, []);

  return (
    <div className={`market-summary-section my-6 p-4 rounded-lg
      ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}
    `}>
      <h2 className="text-3xl font-bold mb-6 text-center">Market Overview</h2>

      {loading && <p className="text-center text-lg">Loading market data...</p>}
      {error && <p className="text-center text-red-500 text-lg">Error: {error}</p>}

      <SingleMarketOverviewTable stocks={marketStocks} loading={loading} error={error} />
    </div>
  );
};

export default MarketSummarySection;