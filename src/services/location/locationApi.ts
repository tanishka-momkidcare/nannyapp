/**
 * Location API Client
 *
 * Handles communication with the backend for:
 * - Uploading location batches
 * - Fetching shift assignments
 * - Reporting fraud alerts
 * - Fetching tracking config from server
 */

import Config from 'react-native-config';
import type { LocationBatch, ShiftAssignment, FraudAlert, TrackingConfig } from './types';

const API_BASE = Config.API_BASE_URL || 'https://api.momkidcare.com';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Auth token should be injected by the caller or an interceptor
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ─── Location Batch Upload ───────────────────────────────────────────────────

export async function uploadLocationBatch(
  batch: LocationBatch,
  authToken: string,
): Promise<boolean> {
  try {
    await request('/api/v1/location/batch', {
      method: 'POST',
      body: JSON.stringify(batch),
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Shift Assignments ───────────────────────────────────────────────────────

export async function fetchActiveShift(
  nannyId: string,
  authToken: string,
): Promise<ShiftAssignment | null> {
  try {
    const data = await request<{ shift: ShiftAssignment | null }>(
      `/api/v1/location/shifts/active?nannyId=${encodeURIComponent(nannyId)}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    return data.shift;
  } catch {
    return null;
  }
}

// ─── Fraud Alerts ────────────────────────────────────────────────────────────

export async function reportFraudAlert(
  alert: Omit<FraudAlert, 'id' | 'resolved'>,
  authToken: string,
): Promise<void> {
  await request('/api/v1/location/fraud/alert', {
    method: 'POST',
    body: JSON.stringify(alert),
    headers: { Authorization: `Bearer ${authToken}` },
  });
}

// ─── Server Config ───────────────────────────────────────────────────────────

export async function fetchTrackingConfig(
  authToken: string,
): Promise<Partial<TrackingConfig> | null> {
  try {
    return await request<Partial<TrackingConfig>>(
      '/api/v1/location/config',
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
  } catch {
    return null;
  }
}
