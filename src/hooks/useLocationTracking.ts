/**
 * useLocationTracking — React hook for the location tracking system.
 *
 * Provides a clean API for screens to:
 *  - Start/stop shifts
 *  - Read current tracking state
 *  - Monitor geofence status
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  locationTrackingEngine,
  uploadLocationBatch,
  fetchActiveShift,
  type TrackingState,
  type ShiftAssignment,
  type LocationBatch,
} from '../services/location';

const AUTH_TOKEN_KEY = '@nannyapp_auth_token';

export function useLocationTracking(nannyId: string) {
  const [trackingState, setTrackingState] = useState<TrackingState>(
    locationTrackingEngine.getState(),
  );
  const [activeShift, setActiveShift] = useState<ShiftAssignment | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false);

  // Initialize engine once
  useEffect(() => {
    if (initRef.current || !nannyId) return;
    initRef.current = true;

    (async () => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      await locationTrackingEngine.init(nannyId, async (batch: LocationBatch) => {
        if (!token) return false;
        return uploadLocationBatch(batch, token);
      });

      // Check for active shift
      if (token) {
        const shift = await fetchActiveShift(nannyId, token);
        if (shift) {
          await locationTrackingEngine.startShift(shift);
          setActiveShift(shift);
        }
      }

      setIsInitialized(true);
    })();

    return () => {
      locationTrackingEngine.destroy();
    };
  }, [nannyId]);

  // Subscribe to state changes
  useEffect(() => {
    const unsub = locationTrackingEngine.subscribe(setTrackingState);
    return unsub;
  }, []);

  const startShift = useCallback(async (shift: ShiftAssignment) => {
    await locationTrackingEngine.startShift(shift);
    setActiveShift(shift);
  }, []);

  const endShift = useCallback(async () => {
    await locationTrackingEngine.endShift();
    setActiveShift(null);
  }, []);

  return {
    trackingState,
    activeShift,
    isInitialized,
    startShift,
    endShift,
    isInsideGeofence: trackingState.isInsideGeofence,
    currentMode: trackingState.mode,
    lastLocation: trackingState.lastLocation,
  };
}
