/*
  File: frontend/src/services/marketService.js
  Purpose: Service to interact with market summary APIs on the backend.
  Date: 2025-11-17
*/

import api from './api';

const getMarketOverview = async (limit = 10) => {
  try {
    const response = await api.get(`/market/overview?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching market overview:', error);
    throw error;
  }
};

export default {
  getMarketOverview,
};
