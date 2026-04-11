/**
 * Fraud Detection Cron Jobs
 *
 * Scheduled tasks that run periodically to detect fraud patterns.
 * Uses node-cron or can be triggered by external scheduler.
 */

const { checkTrackingSilence, checkDoubleJob } = require('../services/fraudDetectionService');
const { Shift } = require('../models/locationModels');

/** Run all periodic fraud checks. Call from cron (every 15 minutes). */
async function runPeriodicFraudChecks() {
  console.log('[FraudCron] Starting periodic fraud checks...');

  try {
    // 1. Check for tracking silence during active shifts
    await checkTrackingSilence();

    // 2. Check for double-job patterns (all active nannies)
    const activeShifts = await Shift.find({ status: 'ACTIVE' }).distinct('nannyId');
    for (const nannyId of activeShifts) {
      await checkDoubleJob(nannyId, 7);
    }

    console.log('[FraudCron] Periodic fraud checks completed.');
  } catch (err) {
    console.error('[FraudCron] Error:', err);
  }
}

module.exports = { runPeriodicFraudChecks };
