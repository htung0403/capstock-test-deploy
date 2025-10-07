/*
  File: scheduler/refreshScheduler.js
  Purpose: Schedule periodic stock refresh tasks based on environment flags.
*/
const cron = require('node-cron');
const axios = require('axios');

function startScheduler(baseUrl) {
  const enabled = (process.env.REFRESH_CRON_ENABLED || 'false').toLowerCase() === 'true';
  const interval = process.env.REFRESH_CRON_SCHEDULE || '*/5 * * * *'; // every 5 min
  if (!enabled) {
    return { stop: () => {} };
  }

  // eslint-disable-next-line no-console
  console.log(`Refresh scheduler enabled. Cron: ${interval}`);

  const task = cron.schedule(interval, async () => {
    try {
      // Call internal endpoint; assumes no auth for internal call. If protected, you can switch to direct controller invocation instead.
      await axios.post(`${baseUrl}/api/stocks/refresh`, {}, {
        timeout: 20000,
        // Optionally include internal token header if needed
      });
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


