/**
 * Location Tracking Engine — Core State Machine
 *
 * Manages the adaptive tracking strategy:
 *  IDLE → PASSIVE → ACTIVE → BURST → GEOFENCE_MONITOR → SUSPICIOUS
 *
 * Integrates client-side fraud detection directly into the location pipeline:
 *  - Every significant location change runs fraud heuristics
 *  - Mock location checks fire on GPS bursts
 *  - Fraud signals auto-escalate tracking mode + report to backend
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
import { checkForFraudSignals, checkMockLocation } from './FraudDetection';
import { checkShiftReadiness, requestActivityRecognitionPermission } from './permissions';

// Native module bridge
const NativeTracking: NativeLocationModule =
  NativeModules.NannyLocationModule || {};

const eventEmitter = NativeModules.NannyLocationModule
  ? new NativeEventEmitter(NativeModules.NannyLocationModule)
  : null;

type StateChangeListener = (state: TrackingState) => void;
type FraudAlertCallback = (alert: {
  type: string;
  severity: string;
  details: string;
  location?: LocationPoint;
}) => void;

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
  private onFraudAlert: FraudAlertCallback | null = null;

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Initialize the tracking engine. Call once on app start. */
  async init(
    nannyId: string,
    uploadFn: (batch: any) => Promise<boolean>,
    fraudAlertFn?: FraudAlertCallback,
  ) {
    this.onFraudAlert = fraudAlertFn ?? null;
    locationBatchManager.init(nannyId, uploadFn);
    this.subscribeToNativeEvents();
    await this.startPassiveTracking();
  }

  /** Begin a shift — sets up geofences and activates tracking. */
  async startShift(shift: ShiftAssignment) {
    const { ready, missing } = await checkShiftReadiness();
    if (!ready) {
      if (missing.length === 1 && missing[0] === 'activityRecognition') {
        const status = await requestActivityRecognitionPermission();
        if (status !== 'GRANTED' && __DEV__) {
          console.warn('[LocationEngine] Activity recognition denied, continuing without it');
        }
      } else {
        throw new Error(`Missing permissions: ${missing.join(', ')}. Grant location permissions first.`);
      }
    }

    this.currentShift = shift;
    this.state.isShiftActive = true;

    const geofence: GeofenceRegion = {
      id: `shift_${shift.shiftId}`,
      latitude: shift.clientLocation.latitude,
      longitude: shift.clientLocation.longitude,
      radius: shift.geofenceRadius || this.config.geofenceRadius,
      clientId: shift.clientId,
    };

    await NativeTracking.addGeofence(geofence);
    await NativeTracking.startActivityRecognition();

    this.startShiftBurstTimer();
    this.resetSilenceTimer();

    // Adapt batch interval for active shift (flush more frequently)
    locationBatchManager.updateConfig({
      batchInterval: this.config.batchInterval,
    });

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
    // Flush any remaining buffered points before teardown
    await locationBatchManager.flush();

    if (this.currentShift) {
      await NativeTracking.removeGeofence(`shift_${this.currentShift.shiftId}`);
    }

    this.currentShift = null;
    this.state.isShiftActive = false;
    this.state.isInsideGeofence = false;
    this.state.currentGeofence = null;
    this.state.suspiciousScore = 0;

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
    const previousLocation = this.state.lastLocation;
    this.state.lastLocation = location;
    this.state.lastUpdateTime = Date.now();
    this.resetSilenceTimer();

    // ── Fraud check on every significant location change ──
    this.runFraudChecks(location, previousLocation);

    // Check proximity to client
    if (this.currentShift) {
      const dist = distanceBetween(
        location.latitude,
        location.longitude,
        this.currentShift.clientLocation.latitude,
        this.currentShift.clientLocation.longitude,
      );

      if (dist <= this.config.nearClientRadius && !this.state.isInsideGeofence) {
        this.triggerGPSBurst();
      }
    }

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
        const previousLocation = this.state.lastLocation;
        this.state.lastLocation = point;
        this.state.lastUpdateTime = Date.now();

        const insideGeofence = this.checkInsideGeofence(point);
        this.state.isInsideGeofence = insideGeofence;

        // Fraud check on GPS burst points (high accuracy = best for detection)
        this.runFraudChecks(point, previousLocation);

        locationBatchManager.addPoint(
          point,
          insideGeofence,
          this.state.currentActivity,
        );
      }

      // Check for mock locations on burst points (Android)
      if (points.length > 0) {
        this.checkMockLocationAsync(points[0]);
      }
    } catch (err) {
      if (__DEV__) console.warn('[LocationEngine] GPS burst failed:', err);
    } finally {
      this.state.gpsBurstEndTime = null;
      this.evaluateMode();
    }
  }

  /** Reusable geofence check against current shift. */
  private checkInsideGeofence(point: LocationPoint): boolean {
    if (!this.currentShift) return false;
    return isInsideRadius(
      point,
      this.currentShift.clientLocation.latitude,
      this.currentShift.clientLocation.longitude,
      this.currentShift.geofenceRadius || this.config.geofenceRadius,
    );
  }

  // ─── Fraud Detection Integration ──────────────────────────────────────────

  private runFraudChecks(current: LocationPoint, previous: LocationPoint | null) {
    if (!this.state.isShiftActive) return;

    const signals = checkForFraudSignals(current, previous, this.state, this.currentShift);

    for (const signal of signals) {
      // Escalate tracking mode based on severity
      const scoreIncrease = signal.severity === 'CRITICAL' ? 50
        : signal.severity === 'HIGH' ? 30
        : signal.severity === 'MEDIUM' ? 15
        : 5;
      this.flagSuspicious(this.state.suspiciousScore + scoreIncrease);

      // Report to backend via callback
      this.onFraudAlert?.(signal);
    }
  }

  /** Async mock location check — doesn't block the main flow. */
  private async checkMockLocationAsync(location: LocationPoint) {
    const isMock = await checkMockLocation(location);
    if (isMock) {
      this.flagSuspicious(this.state.suspiciousScore + 50);
      this.onFraudAlert?.({
        type: 'LOCATION_SPOOFING',
        severity: 'CRITICAL',
        details: 'Mock/spoofed location detected on device',
        location,
      });
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
