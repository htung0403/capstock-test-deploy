import api from './api'; // Assuming you have a base API utility

const marketApiService = {
  /**
   * @desc Fetches all data required for the Market Heatmap page, including heatmap data,
   *       market indices, and top gainers/losers.
   * @returns {Promise<Object>} An object containing heatmapData, marketIndices, topGainers, and topLosers.
   */
  getMarketHeatmapPageData: async () => {
    try {
      const response = await api.get('/market-heatmap');
      return response.data;
    } catch (error) {
      console.error('Error fetching market heatmap page data:', error);
      throw error;
    }
  },
};

export default marketApiService;
