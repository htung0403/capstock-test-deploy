/*
  File: scheduler/modelRetrainScheduler.js
  Purpose: Schedule automatic model retraining (weekly)
  Date: 2025-01-15
*/
const cron = require('node-cron');
const { retrainModels } = require('../scripts/retrainModels');

function startModelRetrainScheduler() {
  const enabled = (process.env.MODEL_RETRAIN_ENABLED || 'false').toLowerCase() === 'true';
  // Default: Every Sunday at 2 AM
  const schedule = process.env.MODEL_RETRAIN_SCHEDULE || '0 2 * * 0';
  
  if (!enabled) {
    console.log('Model retraining scheduler is disabled');
    return { stop: () => {} };
  }

  console.log(`🔄 Model retraining scheduler enabled. Cron: ${schedule}`);

  const task = cron.schedule(schedule, async () => {
    try {
      console.log('🔄 Starting scheduled model retraining...');
      await retrainModels('all');
      console.log('✅ Scheduled model retraining completed');
    } catch (err) {
      console.error('❌ Scheduled model retraining failed:', err.message);
    }
  });

  task.start();
  
  return {
    stop: () => task.stop(),
  };
}

module.exports = { startModelRetrainScheduler };

