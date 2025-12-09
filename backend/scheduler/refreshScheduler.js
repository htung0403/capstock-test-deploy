/*
  File: scheduler/refreshScheduler.js
  Purpose: Schedule periodic stock refresh tasks based on environment flags.
*/
const cron = require('node-cron');
const stockService = require('../services/stockService'); // Import the new stockService

function startScheduler(baseUrl) {
  const enabled = (process.env.REFRESH_CRON_ENABLED || 'false').toLowerCase() === 'true';
  // Default to every hour (0 * * * *) instead of every 5 minutes
  // This helps avoid hitting Alpha Vantage's 25 requests/day limit
  // You can override with REFRESH_CRON_SCHEDULE env variable
  const interval = process.env.REFRESH_CRON_SCHEDULE || '0 * * * *'; // every hour at minute 0
  if (!enabled) {
    return { stop: () => {} };
  }

  // eslint-disable-next-line no-console
  console.log(`Refresh scheduler enabled. Cron: ${interval} (Note: Alpha Vantage free tier allows 25 requests/day)`);

  const task = cron.schedule(interval, async () => {
    try {
      // Directly call the service function to refresh stocks
      // The service will only refresh stocks that need it (older than 1 hour)
      await stockService.refreshAllStocksData();
      // eslint-disable-next-line no-console
      console.log('Cron: stocks refreshed');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Cron refresh failed:', err.message);
    }
  });

  task.start();
  return {
    stop: () => task.stop(),
  };
}

module.exports = { startScheduler };


