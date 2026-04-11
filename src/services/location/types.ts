/**
 * Location Tracking System — Type Definitions
 * Ultra battery-efficient, event-driven location tracking for nanny service app.
 */

// ─── Core Location Types ─────────────────────────────────────────────────────

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: number; // unix ms
  provider?: 'gps' | 'network' | 'fused' | 'significant-change';
}

export interface GeofenceRegion {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // meters (100–200m)
  clientId: string;
  clientName?: string;
}

export type GeofenceEvent = 'ENTER' | 'EXIT' | 'DWELL';

export interface GeofenceTransition {
  regionId: string;
  event: GeofenceEvent;
  location: LocationPoint;
  timestamp: number;
}

// ─── Activity Recognition ────────────────────────────────────────────────────

export type ActivityType = 'STILL' | 'WALKING' | 'RUNNING' | 'IN_VEHICLE' | 'ON_BICYCLE' | 'UNKNOWN';

export interface ActivityUpdate {
  type: ActivityType;
  confidence: number; // 0–100
  timestamp: number;
}

// ─── Tracking State Machine ──────────────────────────────────────────────────

export type TrackingMode =
  | 'IDLE'             // No tracking, user is still or off-shift
  | 'PASSIVE'          // Significant location change only
  | 'GEOFENCE_MONITOR' // Inside geofence, monitor exit only
  | 'ACTIVE'           // Moving, periodic updates
  | 'BURST'            // High accuracy GPS burst (30–60s)
  | 'SUSPICIOUS';      // Elevated tracking due to fraud concern

export interface TrackingState {
  mode: TrackingMode;
  isShiftActive: boolean;
  isInsideGeofence: boolean;
  currentActivity: ActivityType;
  currentGeofence: GeofenceRegion | null;
  lastLocation: LocationPoint | null;
  lastUpdateTime: number;
  suspiciousScore: number; // 0–100
  gpsBurstEndTime: number | null;
}

// ─── Shift / Assignment ──────────────────────────────────────────────────────

export interface ShiftAssignment {
  shiftId: string;
  nannyId: string;
  clientId: string;
  clientLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  geofenceRadius: number; // meters
  startTime: number; // unix ms
  endTime: number;   // unix ms
}

// ─── Batch & Upload ──────────────────────────────────────────────────────────

export interface LocationBatch {
  nannyId: string;
  points: LocationDataPoint[];
  batchTimestamp: number;
  deviceInfo: {
    platform: 'ios' | 'android';
    batteryLevel?: number;
    isCharging?: boolean;
  };
}

export interface LocationDataPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isInsideGeofence: boolean;
  activityType: ActivityType;
  provider?: string;
  geofenceEvent?: GeofenceEvent;
}

// ─── Fraud Detection ─────────────────────────────────────────────────────────

export type FraudAlertType =
  | 'FAKE_LEAVE'            // Leave applied but no movement detected
  | 'DOUBLE_JOB'            // Repeated stays at unknown location
  | 'TRACKING_STOPPED'      // No updates for >30 min
  | 'LOCATION_SPOOFING'     // Mock location detected
  | 'GEOFENCE_VIOLATION';   // Left geofence during shift

export interface FraudAlert {
  id: string;
  nannyId: string;
  type: FraudAlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  timestamp: number;
  location?: LocationPoint;
  resolved: boolean;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface TrackingConfig {
  // Displacement thresholds (meters)
  significantDisplacement: number;    // 100–500m — trigger for significant change
  geofenceRadius: number;            // 100–200m — default geofence radius
  nearClientRadius: number;          // 500m — proximity threshold

  // Timing
  gpsBurstDuration: number;          // 30–60 seconds
  batchInterval: number;             // 15–30 minutes (ms)
  shiftCheckInterval: number;        // 15–20 minutes (ms)
  maxSilenceBeforeAlert: number;     // 30–60 minutes (ms)

  // Accuracy
  minAccuracyThreshold: number;      // 50m — ignore readings worse than this

  // GPS burst
  gpsBurstMaxPoints: number;         // 1–3 points per burst

  // Fraud
  suspiciousThreshold: number;       // Score above which tracking escalates
}

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  significantDisplacement: 100,
  geofenceRadius: 150,
  nearClientRadius: 500,
  gpsBurstDuration: 45_000,          // 45 seconds
  batchInterval: __DEV__ ? 60_000 : 20 * 60_000, // 1 min in dev, 20 min in prod
  shiftCheckInterval: __DEV__ ? 2 * 60_000 : 15 * 60_000, // 2 min in dev, 15 min in prod
  maxSilenceBeforeAlert: __DEV__ ? 5 * 60_000 : 45 * 60_000, // 5 min in dev, 45 min in prod
  minAccuracyThreshold: 50,
  gpsBurstMaxPoints: 3,
  suspiciousThreshold: 60,
};

// ─── Native Module Interface ─────────────────────────────────────────────────

export interface NativeLocationModule {
  // Lifecycle
  startSignificantLocationChanges(): Promise<void>;
  stopSignificantLocationChanges(): Promise<void>;

  // Geofencing
  addGeofence(region: GeofenceRegion): Promise<void>;
  removeGeofence(regionId: string): Promise<void>;
  removeAllGeofences(): Promise<void>;

  // GPS Burst
  requestGPSBurst(durationMs: number, maxPoints: number): Promise<LocationPoint[]>;

  // Activity Recognition
  startActivityRecognition(): Promise<void>;
  stopActivityRecognition(): Promise<void>;

  // Android-specific
  startForegroundService?(title: string, body: string): Promise<void>;
  stopForegroundService?(): Promise<void>;

  // Utility
  checkMockLocation?(location: LocationPoint): Promise<boolean>;
  getBatteryInfo?(): Promise<{ level: number; isCharging: boolean }>;
}

// ─── Event Names ─────────────────────────────────────────────────────────────

export const LOCATION_EVENTS = {
  SIGNIFICANT_CHANGE: 'onSignificantLocationChange',
  GEOFENCE_TRANSITION: 'onGeofenceTransition',
  ACTIVITY_CHANGE: 'onActivityChange',
  GPS_BURST_RESULT: 'onGPSBurstResult',
  TRACKING_ERROR: 'onTrackingError',
} as const;
