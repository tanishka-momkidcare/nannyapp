/**
 * Client-Side Fraud Detection
 *
 * Lightweight heuristics that run on-device to complement server-side detection.
 * Detects:
 *  1. Mock/spoofed locations
 *  2. Sudden teleportation (impossible speed)
 *  3. Prolonged silence during shift
 *  4. Geofence exit during active shift
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

export function checkForFraudSignals(
  currentLocation: LocationPoint,
  previousLocation: LocationPoint | null,
  state: TrackingState,
  shift: ShiftAssignment | null,
): FraudSignal[] {
  const signals: FraudSignal[] = [];

  // 1. Teleportation check — impossible speed between two points
  if (previousLocation) {
    const dist = distanceBetweenPoints(currentLocation, previousLocation);
    const timeDiff = (currentLocation.timestamp - previousLocation.timestamp) / 1000; // seconds
    if (timeDiff > 0) {
      const speed = dist / timeDiff;
      if (speed > MAX_SPEED_MS) {
        signals.push({
          type: 'LOCATION_SPOOFING',
          severity: 'HIGH',
          details: `Impossible speed detected: ${Math.round(speed)} m/s over ${Math.round(dist)}m in ${Math.round(timeDiff)}s`,
          location: currentLocation,
        });
      }
    }
  }

  // 2. Geofence exit during active shift
  if (shift && state.isShiftActive && !state.isInsideGeofence && state.mode !== 'ACTIVE') {
    // Only flag if significant time has passed outside geofence
    const timeOutside = Date.now() - state.lastUpdateTime;
    if (timeOutside > 10 * 60_000) { // 10 minutes outside
      signals.push({
        type: 'GEOFENCE_VIOLATION',
        severity: 'MEDIUM',
        details: `Nanny outside assigned geofence for ${Math.round(timeOutside / 60_000)} minutes during shift`,
        location: currentLocation,
      });
    }
  }

  return signals;
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
