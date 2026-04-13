export { locationTrackingEngine } from './LocationTrackingEngine';
export { locationBatchManager } from './LocationBatchManager';
export { uploadLocationBatch, fetchActiveShift, reportFraudAlert, fetchTrackingConfig } from './locationApi';
export { checkForFraudSignals, checkMockLocation, resetFraudState } from './FraudDetection';
export { distanceBetween, distanceBetweenPoints, isInsideRadius, hasMovedSignificantly } from './geoUtils';
export { checkAllPermissions, checkShiftReadiness, requestActivityRecognitionPermission, checkBackgroundLocationReady } from './permissions';
export type { PermissionStatus, LocationPermissions } from './permissions';
export type {
  LocationPoint,
  GeofenceRegion,
  GeofenceEvent,
  GeofenceTransition,
  ActivityType,
  ActivityUpdate,
  TrackingMode,
  TrackingState,
  TrackingConfig,
  ShiftAssignment,
  LocationBatch,
  LocationDataPoint,
  FraudAlertType,
  FraudAlert,
  NativeLocationModule,
} from './types';
export { DEFAULT_TRACKING_CONFIG, LOCATION_EVENTS } from './types';
