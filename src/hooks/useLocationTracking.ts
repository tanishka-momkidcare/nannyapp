/**
 * useLocationTracking — Convenience re-export of LocationTrackingContext.
 *
 * All location tracking is managed by LocationTrackingProvider (context).
 * This hook exists for backward compatibility. Prefer useLocationTrackingContext directly.
 */

export { useLocationTrackingContext as useLocationTracking } from '../context/LocationTrackingContext';
