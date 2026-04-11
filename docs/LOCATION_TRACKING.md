# Location Tracking System — Architecture & Battery Optimization

## System Overview

An ultra battery-efficient, event-driven location tracking system for the MomKidCare nanny service app with built-in fraud detection.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native JS Layer                        │
│                                                                 │
│  useLocationTracking()  ←→  LocationTrackingEngine (State Machine) │
│                                  │                               │
│              ┌───────────────────┼───────────────────┐          │
│              │                   │                   │          │
│    LocationBatchManager    FraudDetection      locationApi      │
│     (buffer + flush)       (client-side)      (upload)         │
└──────────────┬───────────────────┬───────────────────┬──────────┘
               │                   │                   │
┌──────────────┴───────────────────┴───────────────────┴──────────┐
│                   NannyLocationModule (Bridge)                   │
└──────────────┬───────────────────────────────────┬──────────────┘
               │                                   │
┌──────────────┴──────────┐         ┌──────────────┴──────────┐
│     Android Native       │         │       iOS Native         │
│                          │         │                          │
│ • FusedLocationProvider  │         │ • CLLocationManager      │
│ • GeofencingClient       │         │   (Significant Change)   │
│ • ActivityRecognition    │         │ • CLCircularRegion       │
│ • ForegroundService      │         │   (Region Monitoring)    │
│ • WorkManager (boot)     │         │ • CMMotionActivityMgr    │
│ • BootReceiver           │         │                          │
└──────────────────────────┘         └──────────────────────────┘

                          ↓ Batch Upload (every 15-30 min)

┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js)                            │
│                                                                 │
│  POST /api/location/batch  →  MongoDB  →  Fraud Detection       │
│  GET  /api/shifts/active                                        │
│  GET  /api/location/config                                      │
│  POST /api/fraud/alert                                          │
│                                                                 │
│  Cron: checkTrackingSilence(), checkDoubleJob()                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tracking State Machine

```
                    ┌──────────┐
         App Start  │  PASSIVE │ ← Significant Location Change only
                    └────┬─────┘
                         │ Shift starts
                         ▼
                    ┌──────────┐
            Moving  │  ACTIVE  │ ← Periodic updates + activity tracking
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
        ┌──────────┐ ┌────────┐ ┌───────────────┐
 Still  │   IDLE   │ │ BURST  │ │GEOFENCE_MONITOR│
        └──────────┘ │(30-60s)│ │ (inside fence) │
                     └────────┘ └───────────────┘
                                      │
                              Fraud concern?
                                      ▼
                              ┌──────────────┐
                              │  SUSPICIOUS  │ ← Elevated frequency
                              └──────────────┘
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| PASSIVE | ACTIVE | Shift starts + user moving |
| ACTIVE | IDLE | User becomes STILL |
| ACTIVE | GEOFENCE_MONITOR | Entered client geofence |
| ACTIVE | BURST | Near client (≤500m) or shift check interval |
| GEOFENCE_MONITOR | ACTIVE | Exited geofence |
| ANY | SUSPICIOUS | Suspicious score ≥ 60 |
| ACTIVE | PASSIVE | Shift ends |

---

## Battery Optimization Design

### Why This System is Ultra Battery-Efficient

| Technique | Battery Impact | What We Use |
|-----------|---------------|-------------|
| Continuous GPS | **VERY HIGH** (10-15%/hr) | ❌ NEVER used |
| Significant Location Change | **NEGLIGIBLE** (<1%/hr) | ✅ Primary method |
| Geofence Monitoring | **NEGLIGIBLE** (OS-managed) | ✅ Core feature |
| Activity Recognition | **VERY LOW** (<0.5%/hr) | ✅ During shifts |
| GPS Burst (30-60s) | **LOW** (~0.5% per burst) | ✅ Occasional only |
| Network Location | **VERY LOW** | ✅ Preferred default |

### Rules That Save Battery

1. **STILL = No Tracking**: When activity recognition detects the user is still, all active tracking stops.

2. **Inside Geofence = GPS Off**: Once inside the client's geofence, GPS is completely off. Only the OS-level geofence exit monitor runs (near zero battery).

3. **GPS Bursts, Not Streams**: We never run GPS continuously. When a precise location is needed, we enable high-accuracy GPS for 30-60 seconds, capture 1-3 points, then shut it off.

4. **OS-Triggered Events**: Significant location change and geofencing are managed by the OS at the hardware level. The app doesn't poll or use timers for location.

5. **Batch Upload**: Location data is buffered in memory and uploaded every 15-30 minutes in a single HTTP request, avoiding constant network usage.

6. **Displacement Filter**: Points closer than 100m to the last accepted point are discarded, reducing unnecessary processing and uploads.

7. **Accuracy Filter**: Readings worse than 50m accuracy are dropped, preventing low-quality data from triggering unnecessary follow-up requests.

### Estimated Battery Usage

| Scenario | Est. Battery/Hour |
|----------|------------------|
| Off shift (passive only) | <0.5% |
| On shift, inside geofence | <1% |
| On shift, moving | ~2-3% |
| GPS burst (15-min intervals) | ~0.5% per burst |
| **Worst case (suspicious mode)** | ~4-5% |

---

## File Structure

```
src/
  services/
    location/
      types.ts                    # All TypeScript types & interfaces
      geoUtils.ts                 # Haversine distance, proximity checks
      LocationTrackingEngine.ts   # Core state machine
      LocationBatchManager.ts     # Buffer + batch upload
      FraudDetection.ts           # Client-side fraud heuristics
      locationApi.ts              # Backend API client
      index.ts                    # Barrel exports
  hooks/
    useLocationTracking.ts        # React hook for components

android/app/src/main/java/com/nannyapp/location/
  NannyLocationModule.kt          # React Native bridge module
  NannyLocationPackage.kt         # Package registration
  GeofenceBroadcastReceiver.kt    # Geofence event receiver
  ActivityRecognitionReceiver.kt  # Activity change receiver
  LocationForegroundService.kt    # Foreground service (shifts)
  BootReceiver.kt                 # Re-register tracking on boot
  LocationBootWorker.kt           # WorkManager fallback

ios/nannyApp/
  NannyLocationModule.swift       # iOS native module
  NannyLocationModule.m           # Objective-C bridge

backend/
  models/
    locationModels.js             # MongoDB schemas
  routes/
    locationRoutes.js             # Express API routes
  services/
    fraudDetectionService.js      # Server-side fraud detection
  jobs/
    fraudCron.js                  # Periodic fraud check scheduler
```

---

## Fraud Detection Summary

### Client-Side (Real-Time)
- **Teleportation**: Impossible speed between consecutive points (>150 km/h)
- **Mock Location**: Android `isMock` flag detection
- **Geofence Exit**: Alert when outside assigned area >10 min during shift

### Server-Side (Batch + Periodic)
- **FAKE LEAVE**: Leave applied but max displacement <500m all day
- **DOUBLE JOB**: 3+ extended stays (>1hr) at unknown locations in 7 days
- **TRACKING STOPPED**: No updates for >45 min during active shift
- **LOCATION SPOOFING**: Mock flag or impossible speed in batch data

---

## Integration

### Using the Hook in a Component

```tsx
import { useLocationTracking } from '../hooks/useLocationTracking';

function HomeScreen() {
  const {
    trackingState,
    activeShift,
    isInsideGeofence,
    currentMode,
    startShift,
    endShift,
  } = useLocationTracking('nanny_123');

  // trackingState.mode: IDLE | PASSIVE | ACTIVE | BURST | GEOFENCE_MONITOR | SUSPICIOUS
  // isInsideGeofence: boolean
  // currentMode: same as trackingState.mode
}
```

### Android Setup Notes
- Add `play-services-location:21.3.0` to dependencies ✅
- Register `NannyLocationPackage` in `MainApplication.kt` ✅
- Add permissions: `FOREGROUND_SERVICE`, `ACTIVITY_RECOGNITION`, `BOOT_COMPLETED` ✅
- Register receivers and services in AndroidManifest.xml ✅

### iOS Setup Notes
- Add `NSLocationAlwaysAndWhenInUseUsageDescription` to Info.plist ✅
- Add `NSMotionUsageDescription` to Info.plist ✅
- Add `location` to `UIBackgroundModes` ✅
- Uses `CLLocationManager` significant change API ✅
- Uses `CLCircularRegion` for geofencing ✅
- Uses `CMMotionActivityManager` for activity recognition ✅
