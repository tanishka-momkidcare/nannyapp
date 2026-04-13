# Location Tracking, Geofencing & Fraud Detection — Complete System Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [Tracking State Machine](#tracking-state-machine)
5. [Geofencing](#geofencing)
6. [Fraud Detection Pipeline](#fraud-detection-pipeline)
7. [Battery Optimization](#battery-optimization)
8. [File Map](#file-map)
9. [API Reference](#api-reference)
10. [Integration Guide](#integration-guide)
11. [Platform Setup](#platform-setup)

---

## System Overview

An ultra battery-efficient, event-driven location tracking system for the MomKidCare nanny service app. Key capabilities:

- **Real-time geofencing** — automatically detects when a nanny arrives at or departs from a client's home
- **Shift tracking** — records arrival/departure times, time inside geofence
- **Two-layer fraud detection** — client-side real-time heuristics + server-side analysis (via backend API)
- **Battery-first design** — never uses continuous GPS; relies on OS-level significant change + geofence APIs

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         React Native (JS Layer)                       │
│                                                                       │
│  LocationTrackingContext (Provider)                                    │
│    ├── LocationTrackingEngine (State Machine)                         │
│    │      ├── FraudDetection (client-side heuristics) ◄── INTEGRATED │
│    │      ├── LocationBatchManager (buffer + flush + retry)           │
│    │      └── geoUtils (haversine, proximity)                        │
│    ├── locationApi (HTTP client)                                      │
│    ├── permissions (Android/iOS permission flow)                      │
│    └── JS Fallback (Geolocation polling — dev/emulator)              │
│                                                                       │
│  useLocationTrackingContext() ← single hook for all components        │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ NativeEventEmitter
┌───────────────────────────┴────────────────────────────────────────────┐
│                     NannyLocationModule (Bridge)                       │
└──────────┬─────────────────────────────────┬───────────────────────────┘
           │                                 │
┌──────────┴────────────┐     ┌──────────────┴────────────┐
│    Android Native      │     │       iOS Native           │
│                        │     │                            │
│ • FusedLocationProvider│     │ • CLLocationManager        │
│ • GeofencingClient     │     │   (Significant Change)     │
│ • ActivityRecognition  │     │ • CLCircularRegion         │
│ • ForegroundService    │     │   (Region Monitoring)      │
│ • WorkManager (boot)   │     │ • CMMotionActivityManager  │
│ • BootReceiver         │     │                            │
└────────────────────────┘     └────────────────────────────┘

                      ↓ Batch Upload (every 15-30 min)

┌────────────────────────────────────────────────────────────────────────┐
│                        Backend API (external)                          │
│                                                                       │
│  POST /api/v1/location/batch   — Ingest location points               │
│  GET  /api/v1/location/config  — Tracking config                      │
│  GET  /api/v1/shifts/active    — Active shift lookup                  │
│  POST /api/v1/fraud/alert      — Fraud signal report                  │
│                                                                       │
│  Server-side fraud detection + cron jobs run on the backend service.   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Complete Request Lifecycle

```
1. OS detects location change
   └── NannyLocationModule emits 'onSignificantLocationChange'

2. LocationTrackingEngine.onSignificantLocationChange()
   ├── Updates state (lastLocation, lastUpdateTime)
   ├── Resets silence timer
   ├── Runs FraudDetection.checkForFraudSignals() ◄── CLIENT-SIDE FRAUD CHECK
   │     ├── Teleportation check (>42 m/s)
   │     └── Geofence violation tracker (>10 min outside)
   ├── Checks proximity to client (within 500m → GPS burst)
   └── Calls LocationBatchManager.addPoint()

3. LocationBatchManager.addPoint()
   ├── Filter: accuracy > 50m → REJECT
   ├── Filter: displacement < 100m from last accepted → SKIP
   └── Buffer point (up to 50 points)

4. LocationBatchManager.flush() (every 15-30 min, or buffer full)
   ├── Calls uploadLocationBatch() → POST /api/v1/location/batch
   ├── On success → retryAttempt = 0
   └── On failure → saveBatchToDisk() → exponential backoff retry

5. Backend API processes the batch (server-side, external)
   └── Return: { pointsSaved, fraudAlerts }
```

### Geofence Event Flow

```
Nanny approaches client home (within 500m)
  └── Engine triggers GPS burst (30-60s, 1-3 high-accuracy points)

Nanny enters geofence (OS-level CLCircularRegion / GeofencingClient)
  └── onGeofenceTransition(ENTER)
       ├── state.isInsideGeofence = true
       ├── GPS burst → accurate arrival timestamp
       ├── BatchManager.addGeofenceEvent(ENTER)
       └── Engine → GEOFENCE_MONITOR mode (GPS off, monitor exit only)

Nanny inside geofence
  └── No GPS polling. Zero battery usage. Only OS-level exit monitoring.

Nanny exits geofence
  └── onGeofenceTransition(EXIT)
       ├── state.isInsideGeofence = false
       ├── GPS burst → accurate departure timestamp
       ├── BatchManager.addGeofenceEvent(EXIT)
       └── Engine → ACTIVE mode

Backend API receives batch with geofence events
  └── Records arrival/departure timestamps from ENTER/EXIT events
```

---

## Tracking State Machine

```
                    ┌──────────┐
         App Start  │  PASSIVE │ ← Significant Location Change only (near-zero battery)
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
 Still  │   IDLE   │ │ BURST  │ │GEOFENCE_MONITOR│ ← GPS off, exit-only
        └──────────┘ │(30-60s)│ └───────────────┘
                     └────────┘          │
                                 Fraud concern?
                                         ▼
                                 ┌──────────────┐
                                 │  SUSPICIOUS  │ ← Elevated frequency
                                 └──────────────┘
```

### Transition Rules

| From | To | Trigger | Battery Impact |
|------|----|---------|---------------|
| PASSIVE | ACTIVE | Shift starts + user moving | Low |
| ACTIVE | IDLE | User STILL (activity recognition) | Negligible |
| ACTIVE | GEOFENCE_MONITOR | Entered client geofence | Negligible |
| ACTIVE | BURST | Near client (≤500m) or every 15-20 min | Brief spike |
| GEOFENCE_MONITOR | ACTIVE | Exited geofence | Low |
| ANY | SUSPICIOUS | Suspicious score ≥ 60 | Moderate |
| ACTIVE | PASSIVE | Shift ends | Negligible |

### evaluateMode() Decision Logic

```
1. suspiciousScore ≥ threshold? → SUSPICIOUS (overrides all)
2. Not on shift? → PASSIVE
3. Inside geofence? → GEOFENCE_MONITOR
4. Activity = STILL? → IDLE
5. Default → ACTIVE
```

---

## Geofencing

### How It Works

- Geofence is a circular region around the client's address (default: 150m radius)
- Created when `startShift()` is called, removed on `endShift()`
- Uses **OS-level** geofence APIs: `CLCircularRegion` (iOS), `GeofencingClient` (Android)
- The OS monitors the region at hardware level — zero app battery usage

### Configuration

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `geofenceRadius` | 150m | Fence size around client |
| `nearClientRadius` | 500m | Triggers GPS burst for precise positioning |
| `gpsBurstDuration` | 45s | Duration of high-accuracy GPS burst |
| `gpsBurstMaxPoints` | 3 | Max GPS readings per burst |

### Precision Strategy

When a nanny gets within 500m of client, the engine fires a GPS burst to get a precise fix before the geofence transition. This ensures:
- Accurate arrival timestamps (within seconds)
- Correct geofence ENTER/EXIT determination
- High-quality data for attendance records

---

## Fraud Detection Pipeline

### Two-Layer Design

```
Layer 1: CLIENT-SIDE (real-time, on-device)
├── Runs on every location update during active shift
├── Integrated directly into LocationTrackingEngine
├── Detects:
│   ├── LOCATION_SPOOFING: Teleportation (>150 km/h between points)
│   ├── LOCATION_SPOOFING: Mock location flag (Android checkMockLocation)
│   └── GEOFENCE_VIOLATION: Outside fence >10 min (with proper time tracking)
├── Actions:
│   ├── Auto-escalates tracking mode (severity → suspicious score increase)
│   └── Reports to backend via fraudAlertCallback
└── Min time gap: 3s between points (avoids GPS jitter false positives)

Layer 2: SERVER-SIDE (handled by backend API — external to this repo)
├── Real-time: analyzes each batch upload for spoofing/speed anomalies
├── Periodic: cron checks for tracking silence, double-job patterns, fake leave
└── Deduplication: prevents duplicate alerts within a time window
```

### Severity → Suspicious Score Mapping (Client-Side)

| Severity | Score Increase | Effect |
|----------|---------------|--------|
| CRITICAL | +50 | Immediate SUSPICIOUS mode if score ≥ 60 |
| HIGH | +30 | Likely triggers SUSPICIOUS mode |
| MEDIUM | +15 | Builds toward threshold |
| LOW | +5 | Recorded but minimal impact |

---

## Battery Optimization

### Core Principles

1. **NEVER continuous GPS** — only significant-change + geofence + rare bursts
2. **STILL = No tracking** — activity recognition stops GPS when stationary
3. **Inside geofence = GPS off** — OS-level exit monitoring only
4. **Batch uploads** — 1 HTTP call every 15-30 min, not per-point

### Battery Impact Estimates

| Scenario | Est. Battery/Hour | Tracking Method |
|----------|--------------------|-----------------|
| Off shift (PASSIVE) | <0.5% | Significant change only |
| On shift, inside geofence | <1% | OS-level exit monitoring |
| On shift, moving | ~2-3% | Significant change + periodic burst |
| GPS burst (per burst) | ~0.5% | 30-60s high-accuracy GPS |
| Suspicious mode | ~4-5% | Elevated burst frequency |

### What Saves Battery

| Technique | Battery Impact | Status |
|-----------|---------------|--------|
| Continuous GPS | VERY HIGH (10-15%/hr) | ❌ NEVER used |
| Significant Location Change | NEGLIGIBLE (<1%/hr) | ✅ Primary |
| Geofence Monitoring | NEGLIGIBLE (OS-managed) | ✅ Core |
| Activity Recognition | VERY LOW (<0.5%/hr) | ✅ Shifts |
| GPS Burst (30-60s) | LOW (~0.5% per burst) | ✅ Occasional |
| Network Location | VERY LOW | ✅ Preferred |

---

## File Map

### Frontend (React Native)

| File | Purpose | Connects To |
|------|---------|-------------|
| `src/services/location/types.ts` | All TypeScript types, interfaces, config defaults | Every location file |
| `src/services/location/geoUtils.ts` | Haversine, proximity checks, accuracy filter | Engine, BatchManager |
| `src/services/location/LocationTrackingEngine.ts` | Core state machine + fraud integration | FraudDetection, BatchManager, NativeModule |
| `src/services/location/LocationBatchManager.ts` | Buffer, flush, exponential backoff retry | Engine, locationApi |
| `src/services/location/FraudDetection.ts` | Client-side teleportation + geofence violation | Engine (called on every location update) |
| `src/services/location/locationApi.ts` | HTTP client for batch upload, shift fetch, fraud report | BatchManager, Context |
| `src/services/location/permissions.ts` | Android/iOS permission flow | Engine (shift start) |
| `src/services/location/index.ts` | Barrel exports | All consumers |
| `src/context/LocationTrackingContext.tsx` | Provider: engine init, JS fallback, AppState handling | useLocationTrackingContext |
| `src/hooks/useLocationTracking.ts` | Thin re-export of context hook (backward compat) | Components |

### Native Modules

| File | Purpose | Connects To |
|------|---------|-------------|
| `ios/nannyApp/NannyLocationModule.swift` | CLLocationManager, CMMotionActivityManager, CLCircularRegion | Engine (via NativeEventEmitter) |
| `ios/nannyApp/NannyLocationModule.m` | Objective-C bridge declarations | Swift module |

### Dependency Graph

```
LocationTrackingContext (Provider)
├── LocationTrackingEngine
│   ├── FraudDetection.checkForFraudSignals() ← called on every location update
│   ├── FraudDetection.checkMockLocation() ← async, on GPS bursts
│   ├── LocationBatchManager
│   │   └── locationApi.uploadLocationBatch()
│   ├── geoUtils (distanceBetween, isInsideRadius)
│   └── permissions (checkShiftReadiness)
├── locationApi (uploadLocationBatch, fetchActiveShift, reportFraudAlert)
└── JS Fallback (Geolocation.getCurrentPosition → uploadLocationBatch)

→ All data sent to external Backend API via locationApi.ts
```

---

## API Reference

### POST `/api/v1/location/batch`
Upload a batch of location points from the mobile app.

**Request:**
```json
{
  "nannyId": "string",
  "batchTimestamp": 1234567890,
  "deviceInfo": { "platform": "ios|android", "batteryLevel": 0.85 },
  "points": [
    {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": 10,
      "timestamp": 1234567890,
      "isInsideGeofence": true,
      "activityType": "WALKING",
      "provider": "gps",
      "geofenceEvent": "ENTER"
    }
  ]
}
```
**Limit:** Max 100 points per batch.

**Response:** `{ success: true, pointsSaved: 5, fraudAlerts: 0 }`

### GET `/api/v1/location/config?nannyId=...`
Get tracking configuration (per-nanny overrides or defaults).

### GET `/api/v1/shifts/active?nannyId=...`
Get the currently active shift. Auto-transitions SCHEDULED → ACTIVE.

### POST `/api/v1/fraud/alert`
Report a client-detected fraud signal.

### GET `/api/v1/fraud/alerts?nannyId=...&type=...&resolved=false`
List fraud alerts (admin). Paginated with `limit` and `page`.

### PUT `/api/v1/fraud/alerts/:id/resolve`
Mark a fraud alert as resolved.

---

## Integration Guide

### Using the Context in a Component

```tsx
import { useLocationTrackingContext } from '../context';

function HomeScreen() {
  const {
    trackingState,     // { mode, isShiftActive, isInsideGeofence, currentActivity, ... }
    activeShift,       // ShiftAssignment | null
    isInitialized,     // boolean
    lastSentAt,        // Date | null (JS fallback)
    sendCount,         // number (JS fallback)
    startShift,        // (shift: ShiftAssignment) => Promise<void>
    endShift,          // () => Promise<void>
  } = useLocationTrackingContext();
}
```

### Starting a Shift

```tsx
const handleStartShift = async () => {
  try {
    await startShift({
      shiftId: 'shift_123',
      nannyId: 'nanny_456',
      clientId: 'client_789',
      clientLocation: { latitude: 28.6139, longitude: 77.2090 },
      geofenceRadius: 150,
      startTime: Date.now(),
      endTime: Date.now() + 8 * 60 * 60 * 1000,
    });
  } catch (err) {
    // Handle missing permissions
  }
};
```

---

## Platform Setup

### Android
- `play-services-location:21.3.0` in dependencies
- Permissions: `FINE_LOCATION`, `BACKGROUND_LOCATION`, `ACTIVITY_RECOGNITION`, `FOREGROUND_SERVICE`, `BOOT_COMPLETED`
- Register `NannyLocationPackage` in `MainApplication.kt`
- Register receivers and services in `AndroidManifest.xml`

### iOS
- `NSLocationAlwaysAndWhenInUseUsageDescription` in Info.plist
- `NSMotionUsageDescription` in Info.plist
- `location` in `UIBackgroundModes`
- `CLLocationManager` significant change API
- `CLCircularRegion` for geofencing
- `CMMotionActivityManager` for activity recognition
