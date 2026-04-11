/**
 * Location Batch Manager
 *
 * Buffers location data points and flushes them in batches to the backend.
 * - Filters out low-accuracy readings (>50m)
 * - Deduplicates points that haven't moved significantly (>100m)
 * - Batches every 15–30 minutes
 * - Persists unsent batches to AsyncStorage for retry
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  LocationDataPoint,
  LocationBatch,
  TrackingConfig,
  LocationPoint,
  ActivityType,
  GeofenceEvent,
} from './types';
import { DEFAULT_TRACKING_CONFIG } from './types';
import { distanceBetweenPoints, isAccuracyAcceptable } from './geoUtils';

const STORAGE_KEY = '@nannyapp_location_batch';
const MAX_BUFFER_SIZE = 50;

type BatchFlushCallback = (batch: LocationBatch) => Promise<boolean>;

class LocationBatchManager {
  private buffer: LocationDataPoint[] = [];
  private lastAcceptedPoint: LocationPoint | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private config: TrackingConfig;
  private nannyId: string = '';
  private onFlush: BatchFlushCallback | null = null;

  constructor(config: TrackingConfig = DEFAULT_TRACKING_CONFIG) {
    this.config = config;
  }

  /** Initialize with nanny ID and flush callback. */
  init(nannyId: string, onFlush: BatchFlushCallback) {
    this.nannyId = nannyId;
    this.onFlush = onFlush;
    this.startFlushTimer();
    this.retrySavedBatches();
  }

  /** Add a location point to the buffer. Applies filters before accepting. */
  addPoint(
    location: LocationPoint,
    isInsideGeofence: boolean,
    activityType: ActivityType,
    geofenceEvent?: GeofenceEvent,
  ) {
    // Filter 1: Reject low accuracy
    if (!isAccuracyAcceptable(location, this.config.minAccuracyThreshold)) {
      return;
    }

    // Filter 2: Skip if not moved significantly (unless geofence event)
    if (
      !geofenceEvent &&
      this.lastAcceptedPoint &&
      distanceBetweenPoints(location, this.lastAcceptedPoint) < this.config.significantDisplacement
    ) {
      return;
    }

    const point: LocationDataPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
      isInsideGeofence,
      activityType,
      provider: location.provider,
      geofenceEvent,
    };

    this.buffer.push(point);
    this.lastAcceptedPoint = location;

    // Force flush if buffer is getting large
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  /** Force an immediate flush of buffered points. */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.nannyId) return;

    const batch: LocationBatch = {
      nannyId: this.nannyId,
      points: [...this.buffer],
      batchTimestamp: Date.now(),
      deviceInfo: {
        platform: Platform.OS as 'ios' | 'android',
      },
    };

    this.buffer = [];

    if (this.onFlush) {
      const success = await this.onFlush(batch).catch(() => false);
      if (!success) {
        // Save to disk for retry
        await this.saveBatchToDisk(batch);
      }
    }
  }

  /** Add a geofence event point (always accepted, bypasses displacement filter). */
  addGeofenceEvent(
    location: LocationPoint,
    event: GeofenceEvent,
    activityType: ActivityType,
  ) {
    this.addPoint(location, event === 'ENTER', activityType, event);
  }

  /** Stop the batch timer and flush remaining data. */
  async destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /** Update configuration (e.g., when tracking mode changes). */
  updateConfig(config: Partial<TrackingConfig>) {
    this.config = { ...this.config, ...config };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.config.batchInterval);
  }

  private async saveBatchToDisk(batch: LocationBatch) {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const batches: LocationBatch[] = existing ? JSON.parse(existing) : [];
      batches.push(batch);
      // Keep max 10 failed batches to avoid storage bloat
      const trimmed = batches.slice(-10);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Silent fail — best effort persistence
    }
  }

  private async retrySavedBatches() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const batches: LocationBatch[] = JSON.parse(stored);
      await AsyncStorage.removeItem(STORAGE_KEY);

      for (const batch of batches) {
        if (this.onFlush) {
          const success = await this.onFlush(batch).catch(() => false);
          if (!success) {
            await this.saveBatchToDisk(batch);
            break; // Stop retrying if one fails
          }
        }
      }
    } catch {
      // Silent fail
    }
  }
}

export const locationBatchManager = new LocationBatchManager();
