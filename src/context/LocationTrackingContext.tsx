/**
 * LocationTrackingProvider — Auto-sends location to backend.
 *
 * Three layers:
 *  1. Native engine (if NannyLocationModule is linked) — event-driven, battery-efficient
 *  2. Android foreground service — self-sufficient, works even when app is killed
 *  3. JS fallback (always works) — uses Geolocation.getCurrentPosition periodically
 *
 * The JS fallback guarantees data flows even in dev / emulator / before native build.
 * AppState handling ensures a final location is sent before going to background.
 */

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus, NativeModules, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import {
  locationTrackingEngine,
  uploadLocationBatch,
  fetchActiveShift,
  reportFraudAlert,
  type TrackingState,
  type ShiftAssignment,
  type LocationBatch,
} from '../services/location';
import {useAuth} from './AuthContext';

const AUTH_TOKEN_KEY = '@nannyapp_auth_token';
const API_BASE = Config.API_BASE_URL || 'http://localhost:3000';
const SEND_INTERVAL = __DEV__ ? 60_000 : 20 * 60_000; // 1 min dev, 20 min prod

interface LocationTrackingContextType {
  trackingState: TrackingState;
  activeShift: ShiftAssignment | null;
  isInitialized: boolean;
  lastSentAt: Date | null;
  sendCount: number;
  startShift: (shift: ShiftAssignment) => Promise<void>;
  endShift: () => Promise<void>;
}

const LocationTrackingContext = createContext<LocationTrackingContextType>({
  trackingState: locationTrackingEngine.getState(),
  activeShift: null,
  isInitialized: false,
  lastSentAt: null,
  sendCount: 0,
  startShift: async () => {},
  endShift: async () => {},
});

/** Build a minimal location batch from a Geolocation position. */
function buildFallbackBatch(
  vendorId: string,
  position: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number },
  provider: string,
): LocationBatch {
  const {latitude, longitude, accuracy} = position.coords;
  return {
    nannyId: vendorId,
    batchTimestamp: Date.now(),
    deviceInfo: {
      platform: Platform.OS as 'ios' | 'android',
    },
    points: [
      {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp || Date.now(),
        activityType: 'UNKNOWN',
        provider,
        isInsideGeofence: false,
      },
    ],
  };
}

/** Get current position as a promise. */
function getCurrentPosition(highAccuracy: boolean, timeout: number): Promise<{
  coords: { latitude: number; longitude: number; accuracy: number };
  timestamp: number;
}> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve(pos),
      err => reject(err),
      {enableHighAccuracy: highAccuracy, timeout, maximumAge: 30000},
    );
  });
}

export function LocationTrackingProvider({children}: {children: React.ReactNode}) {
  const {vendorId} = useAuth();
  const [trackingState, setTrackingState] = useState<TrackingState>(
    locationTrackingEngine.getState(),
  );
  const [activeShift, setActiveShift] = useState<ShiftAssignment | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const initRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const hasNativeModule = !!NativeModules.NannyLocationModule;

  // ─── Try native engine init ────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current || !vendorId) return;
    initRef.current = true;

    (async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        tokenRef.current = token;

        // Save config for Android foreground service
        if (hasNativeModule && Platform.OS === 'android' && token) {
          try {
            await NativeModules.NannyLocationModule.saveTrackingConfig(
              vendorId,
              API_BASE,
              token,
            );
            if (__DEV__) console.log('[LocationTracking] Saved config for foreground service');
          } catch (e) {
            if (__DEV__) console.warn('[LocationTracking] Failed to save config:', e);
          }
        }

        if (hasNativeModule) {
          await locationTrackingEngine.init(
            vendorId,
            async (batch: LocationBatch) => {
              if (!token) return false;
              return uploadLocationBatch(batch, token);
            },
            // Fraud alert callback — report to backend
            async (alert) => {
              if (!token) return;
              try {
                await reportFraudAlert(
                  {
                    nannyId: vendorId,
                    type: alert.type as any,
                    severity: alert.severity as any,
                    details: alert.details,
                    timestamp: Date.now(),
                  },
                  token,
                );
              } catch {
                if (__DEV__) console.warn('[LocationTracking] Failed to report fraud alert');
              }
            },
          );

          if (token) {
            const shift = await fetchActiveShift(vendorId, token);
            if (shift) {
              await locationTrackingEngine.startShift(shift);
              setActiveShift(shift);
            }
          }

          if (__DEV__) {
            console.log('[LocationTracking] Native engine initialized');
          }
        } else if (__DEV__) {
          console.log('[LocationTracking] No native module — using JS fallback');
        }

        setIsInitialized(true);
      } catch (err) {
        if (__DEV__) console.warn('[LocationTracking] Init error:', err);
        setIsInitialized(true);
      }
    })();

    return () => {
      if (hasNativeModule) locationTrackingEngine.destroy();
      initRef.current = false;
    };
  }, [vendorId, hasNativeModule]);

  // ─── JS Fallback: auto-send location every interval ────────────────────────
  useEffect(() => {
    if (!vendorId) return;

    async function captureAndSend() {
      try {
        const position = await getCurrentPosition(false, 15000);
        const batch = buildFallbackBatch(vendorId!, position, 'js-fallback');
        const token = tokenRef.current;

        if (token) {
          const success = await uploadLocationBatch(batch, token);
          if (success) {
            setLastSentAt(new Date());
            setSendCount(c => c + 1);
            if (__DEV__) {
              const {latitude, longitude, accuracy} = position.coords;
              console.log(
                `[LocationTracking] Sent (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) acc=${accuracy.toFixed(0)}m`,
              );
            }
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('[LocationTracking] Send failed:', err);
      }
    }

    captureAndSend();
    intervalRef.current = setInterval(captureAndSend, SEND_INTERVAL);

    if (__DEV__) {
      console.log(`[LocationTracking] Auto-send started: every ${SEND_INTERVAL / 1000}s`);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [vendorId]);

  // ─── AppState: send final location when going to background ────────────────
  useEffect(() => {
    if (!vendorId) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        getCurrentPosition(false, 5000)
          .then(pos => {
            const batch = buildFallbackBatch(vendorId!, pos, 'app-background');
            const token = tokenRef.current;
            if (token) {
              // Fire-and-forget — app may suspend soon
              uploadLocationBatch(batch, token).catch(() => {});
            }
            if (__DEV__) {
              console.log(`[LocationTracking] Sent background snapshot (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
            }
          })
          .catch(() => {}); // ignore errors on background transition
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [vendorId]);

  // ─── Subscribe to native engine state changes ──────────────────────────────
  useEffect(() => {
    const unsub = locationTrackingEngine.subscribe(state => {
      setTrackingState(state);
    });
    return unsub;
  }, []);

  const startShift = useCallback(async (shift: ShiftAssignment) => {
    if (hasNativeModule) {
      // Persist config so foreground service survives app kill
      if (Platform.OS === 'android') {
        try {
          const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
          if (token && vendorId) {
            await NativeModules.NannyLocationModule.saveTrackingConfig(vendorId, API_BASE, token);
          }
        } catch (e) {
          if (__DEV__) console.warn('[LocationTracking] Failed to save config:', e);
        }
      }
      await locationTrackingEngine.startShift(shift);
    }
    setActiveShift(shift);
  }, [hasNativeModule, vendorId]);

  const endShift = useCallback(async () => {
    if (hasNativeModule) {
      await locationTrackingEngine.endShift();
      // Clear persisted config when shift ends
      if (Platform.OS === 'android') {
        try {
          await NativeModules.NannyLocationModule.clearTrackingConfig();
        } catch (e) {
          if (__DEV__) console.warn('[LocationTracking] Failed to clear config:', e);
        }
      }
    }
    setActiveShift(null);
  }, [hasNativeModule]);

  return (
    <LocationTrackingContext.Provider
      value={{trackingState, activeShift, isInitialized, lastSentAt, sendCount, startShift, endShift}}>
      {children}
    </LocationTrackingContext.Provider>
  );
}

export function useLocationTrackingContext() {
  return useContext(LocationTrackingContext);
}
