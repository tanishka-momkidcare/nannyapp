/**
 * MongoDB Schemas for Location Tracking System
 *
 * Collections:
 *  - locationUpdates: Individual location data points
 *  - geofenceEvents: Geofence enter/exit events
 *  - shifts: Nanny shift assignments
 *  - fraudAlerts: Fraud detection alerts
 *  - nannyTrackingConfig: Per-nanny tracking configuration overrides
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Location Update ─────────────────────────────────────────────────────────

const locationUpdateSchema = new Schema(
  {
    nannyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    timestamp: { type: Date, required: true, index: true },
    isInsideGeofence: { type: Boolean, default: false },
    activityType: {
      type: String,
      enum: ['STILL', 'WALKING', 'RUNNING', 'IN_VEHICLE', 'ON_BICYCLE', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    provider: { type: String },
    geofenceEvent: {
      type: String,
      enum: ['ENTER', 'EXIT', 'DWELL', null],
      default: null,
    },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', index: true },
    isMock: { type: Boolean, default: false },
    batteryLevel: { type: Number },
    isCharging: { type: Boolean },
    platform: { type: String, enum: ['ios', 'android'] },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
locationUpdateSchema.index({ nannyId: 1, timestamp: -1 });
// Geospatial index for proximity queries
locationUpdateSchema.index({ latitude: 1, longitude: 1 });
// TTL: auto-delete after 90 days
locationUpdateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const LocationUpdate = mongoose.model('LocationUpdate', locationUpdateSchema);

// ─── Geofence Event ──────────────────────────────────────────────────────────

const geofenceEventSchema = new Schema(
  {
    nannyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: String, enum: ['ENTER', 'EXIT'], required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    timestamp: { type: Date, required: true, index: true },
    geofenceId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

geofenceEventSchema.index({ nannyId: 1, shiftId: 1, timestamp: -1 });

const GeofenceEvent = mongoose.model('GeofenceEvent', geofenceEventSchema);

// ─── Shift ───────────────────────────────────────────────────────────────────

const shiftSchema = new Schema(
  {
    nannyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String },
    },
    geofenceRadius: { type: Number, default: 150 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    actualArrival: { type: Date },
    actualDeparture: { type: Date },
    totalTimeInsideGeofence: { type: Number, default: 0 }, // minutes
  },
  {
    timestamps: true,
  }
);

shiftSchema.index({ nannyId: 1, status: 1, startTime: -1 });

const Shift = mongoose.model('Shift', shiftSchema);

// ─── Fraud Alert ─────────────────────────────────────────────────────────────

const fraudAlertSchema = new Schema(
  {
    nannyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'FAKE_LEAVE',
        'DOUBLE_JOB',
        'TRACKING_STOPPED',
        'LOCATION_SPOOFING',
        'GEOFENCE_VIOLATION',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    details: { type: String, required: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
    latitude: { type: Number },
    longitude: { type: Number },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolvedNote: { type: String },
  },
  {
    timestamps: true,
  }
);

fraudAlertSchema.index({ nannyId: 1, resolved: 1, createdAt: -1 });
fraudAlertSchema.index({ type: 1, severity: 1 });

const FraudAlert = mongoose.model('FraudAlert', fraudAlertSchema);

// ─── Nanny Tracking Config (per-nanny overrides) ────────────────────────────

const trackingConfigSchema = new Schema({
  nannyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  significantDisplacement: { type: Number },
  geofenceRadius: { type: Number },
  batchInterval: { type: Number },
  maxSilenceBeforeAlert: { type: Number },
  minAccuracyThreshold: { type: Number },
  suspiciousThreshold: { type: Number },
});

const TrackingConfig = mongoose.model('TrackingConfig', trackingConfigSchema);

module.exports = {
  LocationUpdate,
  GeofenceEvent,
  Shift,
  FraudAlert,
  TrackingConfig,
};
