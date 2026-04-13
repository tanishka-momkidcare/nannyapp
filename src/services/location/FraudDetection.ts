/**
 * Client-Side Fraud Detection
 *
 * Lightweight heuristics that run on-device for real-time fraud detection.
 * Called by LocationTrackingEngine on every location update during active shifts.
 *
 * Detects:
 *  1. Teleportation — impossible speed between consecutive points
 *  2. Geofence violation — outside assigned area too long during shift
 *
 * Mock location detection is handled separately via async native call
 * in LocationTrackingEngine.checkMockLocationAsync().
 */

import { NativeModules } from 'react-native';
import type {
  LocationPoint,
  TrackingState,
  FraudAlertType,
  ShiftAssignment,
} from './types';
import { distanceBetweenPoints } from './geoUtils';

const NativeTracking = NativeModules.NannyLocationModule;

interface FraudSignal {
  type: FraudAlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  location?: LocationPoint;
}

// Max realistic speed: 150 km/h ≈ 42 m/s
const MAX_SPEED_MS = 42;
// Minimum time gap to consider for teleportation (avoid false positives from GPS jitter)
const MIN_TIME_GAP_MS = 3_000;
// Time outside geofence before flagging (10 minutes)
const GEOFENCE_VIOLATION_THRESHOLD_MS = 10 * 60_000;

// Track when nanny last exited geofence (module-level for persistence across calls)
let geofenceExitTimestamp: number | null = null;

export function checkForFraudSignals(
  currentLocation: LocationPoint,
  previousLocation: LocationPoint | null,
  state: TrackingState,
  shift: ShiftAssignment | null,
): FraudSignal[] {
  const signals: FraudSignal[] = [];

  // 1. Teleportation check — impossible speed between two points
  if (previousLocation) {
    const timeDiff = currentLocation.timestamp - previousLocation.timestamp;
    // Only check if enough time has passed (avoid GPS jitter false positives)
    if (timeDiff > MIN_TIME_GAP_MS) {
      const dist = distanceBetweenPoints(currentLocation, previousLocation);
      const speed = dist / (timeDiff / 1000);
      if (speed > MAX_SPEED_MS) {
        signals.push({
          type: 'LOCATION_SPOOFING',
          severity: 'HIGH',
          details: `Impossible speed: ${Math.round(speed)} m/s (${Math.round(dist)}m in ${Math.round(timeDiff / 1000)}s)`,
          location: currentLocation,
        });
      }
    }
  }

  // 2. Geofence violation — track duration outside geofence during active shift
  if (shift && state.isShiftActive) {
    if (!state.isInsideGeofence) {
      // Start tracking exit time if not already
      if (geofenceExitTimestamp === null) {
        geofenceExitTimestamp = Date.now();
      }

      const timeOutside = Date.now() - geofenceExitTimestamp;
      if (timeOutside > GEOFENCE_VIOLATION_THRESHOLD_MS) {
        signals.push({
          type: 'GEOFENCE_VIOLATION',
          severity: 'MEDIUM',
          details: `Outside assigned geofence for ${Math.round(timeOutside / 60_000)} minutes during shift`,
          location: currentLocation,
        });
        // Reset to avoid repeated alerts every location update
        geofenceExitTimestamp = Date.now();
      }
    } else {
      // Back inside geofence — reset exit tracker
      geofenceExitTimestamp = null;
    }
  }

  return signals;
}

/** Reset geofence exit tracking (call on shift start/end). */
export function resetFraudState() {
  geofenceExitTimestamp = null;
}

/** Check if the current location is a mock/spoofed location (Android only). */
export async function checkMockLocation(location: LocationPoint): Promise<boolean> {
  if (NativeTracking?.checkMockLocation) {
    try {
      return await NativeTracking.checkMockLocation(location);
    } catch {
      return false;
    }
  }
  return false;
}
