/**
 * Location Tracking Engine — Core State Machine
 *
 * Manages the adaptive tracking strategy:
 *  IDLE → PASSIVE → ACTIVE → BURST → GEOFENCE_MONITOR → SUSPICIOUS
 *
 * Rules:
 *  - STILL → IDLE (no tracking)
 *  - MOVING → ACTIVE (periodic updates)
 *  - Near client (≤500m) → enable GPS burst
 *  - Inside geofence → GEOFENCE_MONITOR (stop GPS, monitor exit only)
 *  - Shift active → allow occasional GPS burst every 15–20 min
 *  - Suspicious → SUSPICIOUS mode (increased frequency)
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type {
  TrackingState,
  TrackingMode,
  TrackingConfig,
  LocationPoint,
  ActivityType,
  GeofenceRegion,
  GeofenceTransition,
  ActivityUpdate,
  ShiftAssignment,
  NativeLocationModule,
} from './types';
import { DEFAULT_TRACKING_CONFIG, LOCATION_EVENTS } from './types';
import { distanceBetween, isInsideRadius } from './geoUtils';
import { locationBatchManager } from './LocationBatchManager';
import { checkShiftReadiness, requestActivityRecognitionPermission } from './permissions';

// Native module bridge
const NativeTracking: NativeLocationModule =
  NativeModules.NannyLocationModule || {};

const eventEmitter = NativeModules.NannyLocationModule
  ? new NativeEventEmitter(NativeModules.NannyLocationModule)
  : null;

type StateChangeListener = (state: TrackingState) => void;

class LocationTrackingEngine {
  private state: TrackingState = {
    mode: 'IDLE',
    isShiftActive: false,
    isInsideGeofence: false,
    currentActivity: 'UNKNOWN',
    currentGeofence: null,
    lastLocation: null,
    lastUpdateTime: 0,
    suspiciousScore: 0,
    gpsBurstEndTime: null,
  };

  private config: TrackingConfig = DEFAULT_TRACKING_CONFIG;
  private currentShift: ShiftAssignment | null = null;
  private shiftBurstTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<StateChangeListener> = new Set();
  private eventSubscriptions: Array<{ remove: () => void }> = [];
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Initialize the tracking engine. Call once on app start. */
  async init(nannyId: string, uploadFn: (batch: any) => Promise<boolean>) {
    locationBatchManager.init(nannyId, uploadFn);
    this.subscribeToNativeEvents();
    await this.startPassiveTracking();
  }

  /** Begin a shift — sets up geofences and activates tracking. */
  async startShift(shift: ShiftAssignment) {
    // Verify all permissions before starting
    const { ready, missing } = await checkShiftReadiness();
    if (!ready) {
      // Try to get activity recognition if that's the only missing one
      if (missing.length === 1 && missing[0] === 'activityRecognition') {
        const status = await requestActivityRecognitionPermission();
        if (status !== 'GRANTED') {
          if (__DEV__) console.warn('[LocationEngine] Activity recognition permission denied, continuing without it');
        }
      } else {
        throw new Error(`Missing permissions: ${missing.join(', ')}. Grant location permissions first.`);
      }
    }

    this.currentShift = shift;
    this.state.isShiftActive = true;

    // Create geofence around client location
    const geofence: GeofenceRegion = {
      id: `shift_${shift.shiftId}`,
      latitude: shift.clientLocation.latitude,
      longitude: shift.clientLocation.longitude,
      radius: shift.geofenceRadius || this.config.geofenceRadius,
      clientId: shift.clientId,
    };

    await NativeTracking.addGeofence(geofence);
    await NativeTracking.startActivityRecognition();

    // Start periodic burst timer (every 15–20 min during shift)
    this.startShiftBurstTimer();

    // Start silence detection
    this.resetSilenceTimer();

    // Enable foreground service on Android
    if (Platform.OS === 'android' && NativeTracking.startForegroundService) {
      await NativeTracking.startForegroundService(
        'MomKidCare',
        'शिफ्ट ट्रैकिंग चालू है',
      );
    }

    this.transitionTo('ACTIVE');
  }

  /** End the current shift — tears down geofences and reduces tracking. */
  async endShift() {
    if (this.currentShift) {
      await NativeTracking.removeGeofence(`shift_${this.currentShift.shiftId}`);
    }

    this.currentShift = null;
    this.state.isShiftActive = false;
    this.state.isInsideGeofence = false;
    this.state.currentGeofence = null;

    this.stopShiftBurstTimer();
    this.clearSilenceTimer();

    await NativeTracking.stopActivityRecognition();

    if (Platform.OS === 'android' && NativeTracking.stopForegroundService) {
      await NativeTracking.stopForegroundService();
    }

    this.transitionTo('PASSIVE');
  }

  /** Manually flag suspicious activity (called by backend or local fraud detection). */
  flagSuspicious(score: number) {
    this.state.suspiciousScore = Math.min(100, score);
    if (score >= this.config.suspiciousThreshold) {
      this.transitionTo('SUSPICIOUS');
    }
  }

  /** Clear suspicious flag. */
  clearSuspicious() {
    this.state.suspiciousScore = 0;
    if (this.state.isShiftActive) {
      this.transitionTo(this.state.isInsideGeofence ? 'GEOFENCE_MONITOR' : 'ACTIVE');
    } else {
      this.transitionTo('PASSIVE');
    }
  }

  /** Get current tracking state (read-only copy). */
  getState(): Readonly<TrackingState> {
    return { ...this.state };
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Tear down everything. */
  async destroy() {
    await this.endShift();
    await NativeTracking.stopSignificantLocationChanges();
    await NativeTracking.removeAllGeofences();
    this.eventSubscriptions.forEach(sub => sub.remove());
    this.eventSubscriptions = [];
    await locationBatchManager.destroy();
  }

  // ─── State Machine ────────────────────────────────────────────────────────

  private transitionTo(mode: TrackingMode) {
    const prev = this.state.mode;
    if (prev === mode) return;

    this.state.mode = mode;
    this.notifyListeners();

    // Log for debugging
    if (__DEV__) {
      console.log(`[LocationEngine] ${prev} → ${mode}`);
    }
  }

  /** Core decision logic — evaluates all inputs and picks the right mode. */
  private evaluateMode() {
    const { isShiftActive, isInsideGeofence, currentActivity, suspiciousScore } = this.state;

    // Suspicious overrides everything
    if (suspiciousScore >= this.config.suspiciousThreshold) {
      this.transitionTo('SUSPICIOUS');
      return;
    }

    // Not on shift → passive only
    if (!isShiftActive) {
      this.transitionTo('PASSIVE');
      return;
    }

    // On shift, inside geofence → monitor exit only
    if (isInsideGeofence) {
      this.transitionTo('GEOFENCE_MONITOR');
      return;
    }

    // On shift, user is still → idle (conserve battery)
    if (currentActivity === 'STILL') {
      this.transitionTo('IDLE');
      return;
    }

    // On shift, user is moving → active
    this.transitionTo('ACTIVE');
  }

  // ─── Native Event Handlers ─────────────────────────────────────────────────

  private subscribeToNativeEvents() {
    if (!eventEmitter) return;

    this.eventSubscriptions.push(
      eventEmitter.addListener(
        LOCATION_EVENTS.SIGNIFICANT_CHANGE,
        this.onSignificantLocationChange.bind(this),
      ),
      eventEmitter.addListener(
        LOCATION_EVENTS.GEOFENCE_TRANSITION,
        this.onGeofenceTransition.bind(this),
      ),
      eventEmitter.addListener(
        LOCATION_EVENTS.ACTIVITY_CHANGE,
        this.onActivityChange.bind(this),
      ),
    );
  }

  private onSignificantLocationChange(location: LocationPoint) {
    this.state.lastLocation = location;
    this.state.lastUpdateTime = Date.now();
    this.resetSilenceTimer();

    // Check proximity to client
    if (this.currentShift) {
      const dist = distanceBetween(
        location.latitude,
        location.longitude,
        this.currentShift.clientLocation.latitude,
        this.currentShift.clientLocation.longitude,
      );

      // Near client → trigger GPS burst for accurate position
      if (dist <= this.config.nearClientRadius && !this.state.isInsideGeofence) {
        this.triggerGPSBurst();
      }
    }

    // Buffer the point
    locationBatchManager.addPoint(
      location,
      this.state.isInsideGeofence,
      this.state.currentActivity,
    );

    this.evaluateMode();
  }

  private onGeofenceTransition(transition: GeofenceTransition) {
    this.state.lastLocation = transition.location;
    this.state.lastUpdateTime = Date.now();
    this.resetSilenceTimer();

    if (transition.event === 'ENTER') {
      this.state.isInsideGeofence = true;
      // Trigger a final GPS burst to get accurate arrival time
      this.triggerGPSBurst();
    } else if (transition.event === 'EXIT') {
      this.state.isInsideGeofence = false;
      // Trigger GPS burst to capture departure
      this.triggerGPSBurst();
    }

    locationBatchManager.addGeofenceEvent(
      transition.location,
      transition.event,
      this.state.currentActivity,
    );

    this.evaluateMode();
  }

  private onActivityChange(update: ActivityUpdate) {
    // Only accept high-confidence activity changes
    if (update.confidence < 50) return;

    const prev = this.state.currentActivity;
    this.state.currentActivity = update.type;

    // Transition: STILL → MOVING triggers a location update
    if (prev === 'STILL' && update.type !== 'STILL') {
      this.triggerGPSBurst();
    }

    this.evaluateMode();
  }

  // ─── GPS Burst ─────────────────────────────────────────────────────────────

  private async triggerGPSBurst() {
    // Prevent overlapping bursts
    if (this.state.gpsBurstEndTime && Date.now() < this.state.gpsBurstEndTime) {
      return;
    }

    this.state.gpsBurstEndTime = Date.now() + this.config.gpsBurstDuration;

    try {
      const points = await NativeTracking.requestGPSBurst(
        this.config.gpsBurstDuration,
        this.config.gpsBurstMaxPoints,
      );

      for (const point of points) {
        this.state.lastLocation = point;
        this.state.lastUpdateTime = Date.now();

        // Check if this point lands inside geofence
        let insideGeofence = false;
        if (this.currentShift) {
          insideGeofence = isInsideRadius(
            point,
            this.currentShift.clientLocation.latitude,
            this.currentShift.clientLocation.longitude,
            this.currentShift.geofenceRadius || this.config.geofenceRadius,
          );
          this.state.isInsideGeofence = insideGeofence;
        }

        locationBatchManager.addPoint(
          point,
          insideGeofence,
          this.state.currentActivity,
        );
      }
    } catch (err) {
      if (__DEV__) console.warn('[LocationEngine] GPS burst failed:', err);
    } finally {
      this.state.gpsBurstEndTime = null;
      this.evaluateMode();
    }
  }

  // ─── Shift Burst Timer (every 15–20 min) ───────────────────────────────────

  private startShiftBurstTimer() {
    this.stopShiftBurstTimer();
    this.shiftBurstTimer = setInterval(() => {
      // Only burst if on shift and not inside geofence (inside = already verified)
      if (this.state.isShiftActive && !this.state.isInsideGeofence) {
        this.triggerGPSBurst();
      }
    }, this.config.shiftCheckInterval);
  }

  private stopShiftBurstTimer() {
    if (this.shiftBurstTimer) {
      clearInterval(this.shiftBurstTimer);
      this.shiftBurstTimer = null;
    }
  }

  // ─── Silence Detection ─────────────────────────────────────────────────────

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    if (!this.state.isShiftActive) return;

    this.silenceTimer = setTimeout(() => {
      // No location update for maxSilenceBeforeAlert → flag suspicious
      this.flagSuspicious(Math.min(100, this.state.suspiciousScore + 30));
    }, this.config.maxSilenceBeforeAlert);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // ─── Passive Tracking ──────────────────────────────────────────────────────

  private async startPassiveTracking() {
    try {
      await NativeTracking.startSignificantLocationChanges();
      this.transitionTo('PASSIVE');
    } catch (err) {
      if (__DEV__) console.warn('[LocationEngine] Failed to start passive tracking:', err);
    }
  }

  // ─── Notify ────────────────────────────────────────────────────────────────

  private notifyListeners() {
    const snapshot = { ...this.state };
    this.listeners.forEach(fn => fn(snapshot));
  }
}

export const locationTrackingEngine = new LocationTrackingEngine();
