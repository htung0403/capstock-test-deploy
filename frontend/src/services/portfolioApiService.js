import api from './api'; // Assuming you have a base API utility

const portfolioApiService = {
  /**
   * @desc Fetches the user's watchlist.
   * @returns {Promise<Array>} An array of stock symbols in the watchlist.
   */
  getWatchlist: async () => {
    try {
      const response = await api.get('/watchlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      throw error;
    }
  },

  /**
   * @desc Add a stock to user's watchlist.
   * @param {string} symbol - Stock symbol to add
   * @returns {Promise<Array>} Updated watchlist array
   */
  addToWatchlist: async (symbol) => {
    try {
      const response = await api.post('/watchlist', { symbol });
      return response.data;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  },

  /**
   * @desc Remove a stock from user's watchlist.
   * @param {string} symbol - Stock symbol to remove
   * @returns {Promise<Array>} Updated watchlist array
   */
  removeFromWatchlist: async (symbol) => {
    try {
      const response = await api.delete(`/watchlist/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  },

  /**
   * @desc Fetches portfolio distribution data by stock.
   * @returns {Promise<Array>} An array of objects: [{ name: 'AAPL', value: 1000 }, ...]
   */
  getPortfolioDistributionByStock: async () => {
    try {
      const response = await api.get('/portfolio/distribution/stock');
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio distribution by stock:', error);
      throw error;
    }
  },

  /**
   * @desc Fetches portfolio distribution data by sector.
   * @returns {Promise<Array>} An array of objects: [{ name: 'Technology', value: 5000 }, ...]
   */
  getPortfolioDistributionBySector: async () => {
    try {
      const response = await api.get('/portfolio/distribution/sector');
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio distribution by sector:', error);
      throw error;
    }
  },

  /**
   * @desc Fetches portfolio growth data over time.
   * @param {string} period - e.g., '7d', '1m', '3m', '1y'
   * @returns {Promise<Array>} An array of objects: [{ date: '2023-01-01', value: 10000 }, ...]
   */
  getPortfolioGrowthOverTime: async (period = '1m') => {
    try {
      const response = await api.get(`/portfolio/growth?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio growth over time:', error);
      throw error;
    }
  },
};

export default portfolioApiService;
