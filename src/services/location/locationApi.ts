/**
 * Location API Client
 *
 * All endpoints here are authenticated — the Axios interceptor
 * attaches the Bearer token automatically from AsyncStorage.
 *
 * Handles communication with the backend for:
 * - Uploading location batches
 * - Fetching shift assignments
 * - Reporting fraud alerts
 * - Fetching tracking config from server
 */

import type { LocationBatch, ShiftAssignment, FraudAlert, TrackingConfig } from './types';
import Axios from '../Axios';
import {config1} from '../../constants/config';

// ─── Location Batch Upload ───────────────────────────────────────────────────

export async function uploadLocationBatch(batch: LocationBatch): Promise<boolean> {
  try {
    await Axios.post(`${config1.API_HOST}/api/v1/location/batch`, batch);
    return true;
  } catch {
    return false;
  }
}

// ─── Shift Assignments ───────────────────────────────────────────────────────

export async function fetchActiveShift(
  nannyId: string,
): Promise<ShiftAssignment | null> {
  try {
    const { data } = await Axios.get<{ shift: ShiftAssignment | null }>(
      `${config1.API_HOST}/api/v1/location/shifts/active`,
      { params: { nannyId } },
    );
    return data.shift;
  } catch {
    return null;
  }
}

// ─── Fraud Alerts ────────────────────────────────────────────────────────────

export async function reportFraudAlert(
  alert: Omit<FraudAlert, 'id' | 'resolved'>,
): Promise<void> {
  await Axios.post(`${config1.API_HOST}/api/v1/location/fraud/alert`, alert);
}

// ─── Server Config ───────────────────────────────────────────────────────────

export async function fetchTrackingConfig(): Promise<Partial<TrackingConfig> | null> {
  try {
    const { data } = await Axios.get<Partial<TrackingConfig>>(
      `${config1.API_HOST}/api/v1/location/config`,
    );
    return data;
  } catch {
    return null;
  }
}
