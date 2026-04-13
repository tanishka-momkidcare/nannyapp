# MomKidCare Location Tracking System — Complete Deep-Dive

> Production-grade architecture documentation.
> Reconstructed from source-code analysis across React Native (TS) and iOS (Swift) layers.
> Backend API is external to this repository.

---

## Table of Contents

1.  [System Overview](#1-system-overview)
2.  [Architecture Diagram](#2-architecture-diagram)
3.  [State Machine — Full Reconstruction](#3-state-machine--full-reconstruction)
4.  [Tracking Strategy](#4-tracking-strategy)
5.  [Battery Optimization Strategy](#5-battery-optimization-strategy)
6.  [Fraud Detection System](#6-fraud-detection-system)
7.  [Data Flow Pipeline](#7-data-flow-pipeline)
8.  [Platform-Specific Behavior (Android vs iOS)](#8-platform-specific-behavior-android-vs-ios)
9.  [Edge Cases & Failure Scenarios](#9-edge-cases--failure-scenarios)
10. [File-to-Responsibility Map](#10-file-to-responsibility-map)
11. [Code Intelligence — Risks, Redundancies & Optimizations](#11-code-intelligence--risks-redundancies--optimizations)
12. [Suggested Improvements](#12-suggested-improvements)

---

## 1. System Overview

The MomKidCare location system tracks nannies during their work shifts with three hard constraints:

| Constraint | Why |
|---|---|
| **No continuous GPS — ever** | Target devices are budget Android phones (₹8k–15k) with 3000–5000 mAh batteries that drain in hours under continuous GPS |
| **Event-driven only** | The OS must be the trigger source (significant-change, geofence, activity change) — the app never polls for location on a timer |
| **Fraud must be detected in real-time** | Nannies are unsupervised; mock locations, teleportation, and leaving the client's home mid-shift must be flagged instantly |

The system spans three codebases in this repo (backend API is external):

| Layer | Language | Responsibility |
|---|---|---|
| React Native JS | TypeScript | State machine, batch management, fraud heuristics, API client, React context |
| iOS Native | Swift + Obj-C bridge | CLLocationManager (significant change), CLCircularRegion (geofence), CMMotionActivityManager (activity), GPS bursts |
| Android Native | Kotlin | FusedLocationProvider, GeofencingClient, ActivityRecognition, ForegroundService, WorkManager, BootReceiver |

---

## 2. Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        REACT NATIVE (JS LAYER)                              ║
║                                                                              ║
║  LocationTrackingContext (React Provider)                                     ║
║  ┌──────────────────────────────────────────────────────────────────────┐     ║
║  │ Layer 1: Native Engine (if NannyLocationModule linked)              │     ║
║  │   LocationTrackingEngine ← singleton state machine                  │     ║
║  │     ├── onSignificantLocationChange()                               │     ║
║  │     │     ├── runFraudChecks()  ← FraudDetection.checkForFraudSignals()  ║
║  │     │     ├── distanceBetween() → proximity check                   │     ║
║  │     │     ├── triggerGPSBurst() → if within 500m of client          │     ║
║  │     │     └── locationBatchManager.addPoint()                       │     ║
║  │     ├── onGeofenceTransition()                                      │     ║
║  │     │     ├── triggerGPSBurst() → accurate arrival/departure time   │     ║
║  │     │     └── locationBatchManager.addGeofenceEvent()               │     ║
║  │     ├── onActivityChange()                                          │     ║
║  │     │     └── STILL→MOVING transition → triggerGPSBurst()           │     ║
║  │     ├── evaluateMode() → picks IDLE/PASSIVE/ACTIVE/GEOFENCE_MONITOR/SUSPICIOUS ║
║  │     ├── Silence Timer → flags suspicious after 45 min no update     │     ║
║  │     └── Shift Burst Timer → GPS burst every 15 min during shift     │     ║
║  │                                                                      │     ║
║  │   LocationBatchManager ← buffers + flushes points                   │     ║
║  │     ├── addPoint() → filter accuracy >50m, displacement <100m       │     ║
║  │     ├── flush() → uploadLocationBatch() every 20 min                │     ║
║  │     ├── saveBatchToDisk() → AsyncStorage on failure                 │     ║
║  │     └── retrySavedBatches() → exponential backoff                   │     ║
║  │                                                                      │     ║
║  │   FraudDetection (client-side, synchronous)                         │     ║
║  │     ├── Teleportation: speed > 42 m/s (150 km/h), gap > 3s         │     ║
║  │     ├── Geofence violation: outside > 10 min during shift           │     ║
║  │     └── checkMockLocation() → async native call on GPS bursts       │     ║
║  └──────────────────────────────────────────────────────────────────────┘     ║
║  ┌──────────────────────────────────────────────────────────────────────┐     ║
║  │ Layer 2: Android Foreground Service (survives app kill)             │     ║
║  │   saveTrackingConfig(nannyId, apiBase, token) → SharedPreferences   │     ║
║  │   ForegroundService reads config and uploads independently          │     ║
║  └──────────────────────────────────────────────────────────────────────┘     ║
║  ┌──────────────────────────────────────────────────────────────────────┐     ║
║  │ Layer 3: JS Fallback (always runs, even without native module)      │     ║
║  │   Geolocation.getCurrentPosition() every 60s (dev) / 20 min (prod) │     ║
║  │   → uploadLocationBatch() via locationApi                           │     ║
║  │   AppState listener → fire-and-forget snapshot on background        │     ║
║  └──────────────────────────────────────────────────────────────────────┘     ║
╚══════════════════════════════════════════════════════════════╤═══════════════╝
                                                               │
                         NativeEventEmitter (bridge)           │
                                                               │
╔═════════════════════════════════╦════════════════════════════╗│
║       ANDROID NATIVE            ║        iOS NATIVE          ║│
║                                 ║                            ║│
║ FusedLocationProvider           ║ CLLocationManager          ║│
║   → significant location change ║   .startMonitoringSignif…  ║│
║ GeofencingClient                ║ CLCircularRegion           ║│
║   → addGeofence/removeGeofence  ║   .startMonitoring(for:)   ║│
║ ActivityRecognitionClient       ║ CMMotionActivityManager    ║│
║   → STILL/WALKING/RUNNING/etc  ║   .startActivityUpdates()  ║│
║ ForegroundService               ║ Background modes (plist)   ║│
║   → persistent notification     ║                            ║│
║ WorkManager + BootReceiver      ║                            ║│
║   → re-register on device boot  ║                            ║│
╚═════════════════════════════════╩══════════════════════════╤═╝│
                                                             │  │
                          HTTP POST (batch every 15–30 min)  │  │
                                                             ▼  ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                    BACKEND API (external — separate repo)                    ║
║                                                                              ║
║  POST /api/v1/location/batch   ← batch upload                               ║
║  GET  /api/v1/location/config  ← tracking config                            ║
║  GET  /api/v1/shifts/active    ← current shift                              ║
║  POST /api/v1/fraud/alert      ← client-detected fraud report               ║
║                                                                              ║
║  Server-side fraud detection, cron jobs, and data storage                    ║
║  are handled entirely by the backend service.                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 3. State Machine — Full Reconstruction

### 3.1 States

| State | GPS Active? | What Runs | When |
|---|---|---|---|
| `IDLE` | No | Nothing active | On shift but user activity = STILL |
| `PASSIVE` | No | Significant location change only (OS-level) | Off shift, or default state |
| `ACTIVE` | No (except periodic bursts) | Significant change + activity recognition + geofence monitoring + burst timer | On shift, user moving, outside geofence |
| `BURST` | Yes (30–60 seconds) | High-accuracy `CLLocationManager` / `FusedLocationProvider` | Triggered by proximity, geofence event, activity change, or 15-min timer |
| `GEOFENCE_MONITOR` | No | OS-level exit monitoring only | Inside client geofence during shift |
| `SUSPICIOUS` | Elevated | All ACTIVE tracking + faster burst interval | Suspicious score ≥ 60 |

### 3.2 Transition Table — Extracted from `evaluateMode()` and Event Handlers

```
Source: LocationTrackingEngine.ts lines 206–233 (evaluateMode)
        lines 263–325 (event handlers)
```

| # | From | To | Trigger | Code Location |
|---|---|---|---|---|
| T1 | `*` (any) | `SUSPICIOUS` | `suspiciousScore >= 60` (config.suspiciousThreshold) | `evaluateMode()` line 213 |
| T2 | `*` | `PASSIVE` | `isShiftActive === false` | `evaluateMode()` line 219 |
| T3 | `ACTIVE` | `GEOFENCE_MONITOR` | `isInsideGeofence === true` (on shift) | `evaluateMode()` line 225 |
| T4 | `ACTIVE` | `IDLE` | `currentActivity === 'STILL'` (on shift, outside geofence) | `evaluateMode()` line 230 |
| T5 | `IDLE`/`PASSIVE`/`GEOFENCE_MONITOR` | `ACTIVE` | On shift + moving + outside geofence | `evaluateMode()` line 233 |
| T6 | `PASSIVE` | `ACTIVE` | `startShift()` called | `startShift()` line 138 |
| T7 | `ACTIVE` | `PASSIVE` | `endShift()` called | `endShift()` line 162 |
| T8 | `*` | `BURST` (implicit) | GPS burst triggered by proximity (≤500m), geofence ENTER/EXIT, STILL→MOVING, or 15-min timer | `triggerGPSBurst()` |

### 3.3 Evaluation Priority (Critical — Order Matters)

The `evaluateMode()` function uses a strict priority chain:

```
1. SUSPICIOUS  ← highest priority, overrides everything
2. PASSIVE     ← if not on shift
3. GEOFENCE_MONITOR ← if inside geofence
4. IDLE        ← if activity = STILL
5. ACTIVE      ← fallback (on shift + moving)
```

This means: a nanny who is STILL but flagged as SUSPICIOUS stays in SUSPICIOUS mode (not IDLE). A nanny inside the geofence but flagged SUSPICIOUS stays in SUSPICIOUS mode (not GEOFENCE_MONITOR).

### 3.4 Visual State Diagram

```
                          App Start
                              │
                              ▼
                    ┌──────────────────┐
                    │     PASSIVE      │ ← Significant location change only
                    │  (off-shift)     │    Near-zero battery
                    └────────┬─────────┘
                             │ startShift()
                             ▼
                    ┌──────────────────┐
                    │     ACTIVE       │ ← Significant change + activity monitoring
                    │ (on-shift,moving)│    + burst timer every 15 min
                    └───┬────┬────┬────┘
                        │    │    │
           ┌────────────┘    │    └────────────┐
           ▼                 ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐
  │    IDLE      │  │    BURST     │  │ GEOFENCE_MONITOR  │
  │  (STILL)     │  │  (30-60s)   │  │ (inside fence)    │
  │  No GPS. No  │  │  GPS ON.    │  │ GPS OFF.          │
  │  tracking.   │  │  1-3 points │  │ Only monitor exit.│
  └──────┬───────┘  └──────┬──────┘  └─────────┬─────────┘
         │                 │                    │
         │ user moves      │ burst ends         │ user exits fence
         └────────►ACTIVE◄─┘                    └──►ACTIVE
                     │
                     │ suspiciousScore ≥ 60
                     ▼
           ┌──────────────────┐
           │   SUSPICIOUS     │ ← Elevated tracking frequency
           │ score: 0–100     │    Overrides ALL other states
           └──────────────────┘
                     │
                     │ clearSuspicious()
                     ▼
              (returns to appropriate state)
```

---

## 4. Tracking Strategy

### 4.1 When GPS is Turned ON

GPS (high-accuracy `CLLocationManager` with `kCLLocationAccuracyBest` / `FusedLocationProvider` with `PRIORITY_HIGH_ACCURACY`) is activated **only** via `triggerGPSBurst()`. These are the exact triggers:

| # | Trigger | Code Reference | Why GPS is Needed |
|---|---|---|---|
| 1 | **Proximity**: Significant change puts nanny within 500m of client | `onSignificantLocationChange()` → `distanceBetween() ≤ nearClientRadius` | Need precise position to determine if inside geofence |
| 2 | **Geofence ENTER** | `onGeofenceTransition(ENTER)` | Capture accurate arrival timestamp |
| 3 | **Geofence EXIT** | `onGeofenceTransition(EXIT)` | Capture accurate departure timestamp |
| 4 | **STILL → MOVING** | `onActivityChange()` where `prev === 'STILL'` and `update.type !== 'STILL'` | Know where the nanny started moving from |
| 5 | **Periodic timer** | `shiftBurstTimer` fires every `shiftCheckInterval` (15 min prod / 2 min dev) | Heartbeat verification that nanny is still in the correct area — but ONLY if nanny is NOT inside geofence |

### 4.2 Why Only 1–3 Points Per Burst

```
Source: NannyLocationModule.swift lines 133–155 (requestGPSBurst)
Config: DEFAULT_TRACKING_CONFIG.gpsBurstMaxPoints = 3
Config: DEFAULT_TRACKING_CONFIG.gpsBurstDuration = 45_000 ms
```

The native module creates a **temporary** `CLLocationManager` (`burstManager`) with `desiredAccuracy = kCLLocationAccuracyBest` and calls `startUpdatingLocation()`. The first 1–3 locations received via `didUpdateLocations` are collected, then `finishBurst()` stops the manager and resolves the promise.

**Rationale**: GPS hardware requires ~10–30 seconds to achieve first fix. By allowing up to 45 seconds and collecting 1–3 points, the system gets at least one good reading while the almanac syncs. More than 3 points adds negligible accuracy but significant battery cost. The first fix is typically ~15m accurate; subsequent fixes converge to ~5m.

A `burstTimer` serves as a safety timeout (duration + 5 seconds) to prevent GPS from running indefinitely if satellite lock fails.

### 4.3 When GPS is Turned OFF

GPS stops in `finishBurst()`:

```swift
burstManager?.stopUpdatingLocation()
burstManager = nil
```

The burst manager is completely deallocated. The primary `locationManager` never uses `startUpdatingLocation()` — it only uses `startMonitoringSignificantLocationChanges()` which runs at the hardware level with near-zero battery impact.

### 4.4 What Continues After GPS Stops

| Mechanism | Battery Impact | What It Does | Managed By |
|---|---|---|---|
| **Significant Location Change** | Negligible | Fires when cell tower changes (~500m–2km movement). Always active after `startSignificantLocationChanges()`. | OS kernel (iOS) / Google Play Services (Android) |
| **Geofence Monitoring** | Negligible | OS monitors CLCircularRegion boundaries. Fires `didEnterRegion` / `didExitRegion` events. | OS (hardware-level on both platforms) |
| **Activity Recognition** | Very Low (<0.5%/hr) | Accelerometer + step counter → classifies STILL/WALKING/RUNNING/VEHICLE/BICYCLE. Updates sent to JS via `onActivityChange`. | CMMotionActivityManager (iOS) / ActivityRecognitionClient (Android) |
| **Shift Burst Timer** | None (JS timer) | `setInterval` fires every 15 min. Only triggers GPS burst if on shift AND not inside geofence. | JS runtime |
| **Silence Timer** | None (JS timer) | `setTimeout` for 45 min. If no location update arrives, adds +30 to `suspiciousScore`. | JS runtime |

---

## 5. Battery Optimization Strategy

### 5.1 Core Design Decisions

```
RULE 1: Never use startUpdatingLocation() for more than 60 seconds.
RULE 2: If the user is STILL, stop all tracking.
RULE 3: If the user is inside the geofence, stop GPS.
RULE 4: Use significant location change as the primary ongoing signal.
RULE 5: Batch network calls every 15–30 minutes.
RULE 6: Drop readings with accuracy worse than 50m.
RULE 7: Drop readings within 100m of the last accepted point.
```

### 5.2 Battery Impact Per State

| State | GPS | Network | Activity Recog. | Estimated Impact |
|---|---|---|---|---|
| `PASSIVE` (off shift) | OFF | 1 req / 20 min (JS fallback) | OFF | **< 0.5% per hour** |
| `IDLE` (on shift, STILL) | OFF | Batch buffer only | ON | **< 1% per hour** |
| `GEOFENCE_MONITOR` | OFF | Batch buffer only | ON | **< 1% per hour** |
| `ACTIVE` (on shift, moving) | Burst (45s) every 15 min | Batch flush every 20 min | ON | **~2–3% per hour** |
| `BURST` (GPS active) | ON for 30–60s | None during burst | ON | **~0.5% per burst instance** |
| `SUSPICIOUS` | Elevated burst frequency | Batch + fraud reports | ON | **~4–5% per hour** |

### 5.3 Why Continuous GPS is a Non-Starter

On a budget Android phone (Redmi, Realme, etc.) with a 4000 mAh battery:

| Method | Battery drain | 8-hour shift survival |
|---|---|---|
| Continuous GPS (`startUpdatingLocation`) | 10–15% per hour | ❌ Dead by hour 5–6 |
| This system (event-driven bursts) | 1–3% per hour | ✅ Uses ~8–24% over full shift |

The difference: continuous GPS keeps the GPS radio powered with a constant ~100–200mA draw. This system powers the radio for ~45 seconds every 15 minutes (~3 minutes out of every hour = 5% duty cycle).

### 5.4 Key Filters That Reduce Work

```
Source: LocationBatchManager.ts lines 64–87 (addPoint)
```

| Filter | What It Drops | Why |
|---|---|---|
| `accuracy > 50m` | Indoor readings, cell-tower-only fixes | Low accuracy = useless for geofence verification. Also triggers unnecessary follow-up bursts. |
| `displacement < 100m` | Stationary jitter | GPS/network readings can bounce ±50m while sitting still. Sending these wastes bandwidth and misleads fraud detection. |
| `geofenceEvent` bypass | Nothing — geofence events always pass both filters | Arrival/departure timestamps are critical for attendance. Cannot be dropped. |

---

## 6. Fraud Detection System

### 6.1 Two-Layer Architecture

```
LAYER 1: Client-side (on-device, synchronous, per-location-update)
  Runs inside: LocationTrackingEngine → runFraudChecks()
  Called from: onSignificantLocationChange(), triggerGPSBurst()
  Report path: onFraudAlert callback → LocationTrackingContext → reportFraudAlert() → POST /api/v1/fraud/alert

LAYER 2: Server-side (handled by external backend API)
  Real-time: batch analysis on each POST /api/v1/location/batch
  Periodic: cron-based checks (tracking silence, double-job, fake leave)
```

### 6.2 Client-Side Detection (FraudDetection.ts)

#### 6.2.1 Teleportation Detection

```
Source: FraudDetection.ts lines 53–69
```

| Parameter | Value | Why |
|---|---|---|
| `MAX_SPEED_MS` | 42 m/s (150 km/h) | India's highway speed limits top out at 120 km/h. 150 km/h allows for measurement error. |
| `MIN_TIME_GAP_MS` | 3,000 ms (3 seconds) | GPS jitter can cause apparent movement of 50–100m between readings 1 second apart. A 3-second minimum prevents false positives. |

**Logic**: `distance(current, previous) / (timeDelta / 1000) > 42` → signal `LOCATION_SPOOFING` with severity `HIGH`.

**Key design**: The time gap guard is critical. Without it, two GPS readings 500ms apart with 30m jitter yield an apparent speed of 60 m/s — a false positive.

#### 6.2.2 Geofence Violation Tracking

```
Source: FraudDetection.ts lines 71–96
```

Uses a module-level variable `geofenceExitTimestamp` to track how long the nanny has been outside the geofence:

```
State: inside geofence → geofenceExitTimestamp = null
State: outside geofence → geofenceExitTimestamp = Date.now() (set once)
Each subsequent check: if (Date.now() - geofenceExitTimestamp > 10 min) → GEOFENCE_VIOLATION
After flagging: geofenceExitTimestamp resets to Date.now() to avoid repeated alerts
```

**Severity**: `MEDIUM` — the nanny may be outside for legitimate reasons (stepping out briefly, taking a child to a park across the street).

#### 6.2.3 Mock Location Detection

```
Source: LocationTrackingEngine.ts lines 393–404 (checkMockLocationAsync)
```

Runs asynchronously after GPS bursts. Calls the native module's `checkMockLocation()` which on Android reads `Location.isFromMockProvider()`. iOS does not have mock locations.

**Severity**: `CRITICAL` (+50 to suspicious score) — mock locations indicate deliberate spoofing.

### 6.3 Suspicious Score Escalation

```
Source: LocationTrackingEngine.ts lines 381–392 (runFraudChecks)
```

When a fraud signal is detected, the suspicious score increases based on severity:

| Severity | Score Increase | Typical Trigger |
|---|---|---|
| `CRITICAL` | +50 | Mock location detected |
| `HIGH` | +30 | Teleportation, tracking stopped |
| `MEDIUM` | +15 | Geofence violation |
| `LOW` | +5 | Minor anomalies |

The threshold for `SUSPICIOUS` mode is `60` (configurable via `suspiciousThreshold`).

**Escalation math**: A single mock location (+50) alone won't trigger SUSPICIOUS mode. But mock + any other signal crosses 60. A teleportation (+30) followed by another within the same shift crosses 60.

**Reset**: Score resets to 0 on `endShift()` or `clearSuspicious()`.

### 6.4 Server-Side Detection (External Backend API)

The backend API performs additional fraud analysis beyond client-side checks. This is handled entirely by the external backend service and is not part of this repository.

#### Real-Time (Per-Batch Upload)

On each `POST /api/v1/location/batch`, the server runs:

| Check | Threshold | Severity | Logic |
|---|---|---|---|
| Mock locations | `isMock === true` | CRITICAL | Any point with mock flag |
| Teleportation | speed > 42 m/s, time gap > 3s | HIGH | Same as client-side but on server data |

Duplicate alerts of the same type are deduplicated within a 2-hour window per nanny.

#### Periodic (Cron)

| Check | Severity | Description |
|---|---|---|
| **TRACKING_STOPPED** | HIGH | No location updates received for 45+ minutes during active shift |
| **DOUBLE_JOB** | HIGH | ≥3 stay clusters (>1hr, >200m from known clients) in 7 days |
| **FAKE_LEAVE** | MEDIUM | Max displacement < 500m from home on leave day |

---

## 7. Data Flow Pipeline

### 7.1 End-to-End: Location Captured → Stored in Database

```
Step 1: OS EVENT
  iOS:  CLLocationManager → didUpdateLocations (significant change)
  Android: FusedLocationProvider → onLocationResult (significant change)
     ↓
  NativeEventEmitter → emits 'onSignificantLocationChange' with {lat, lng, accuracy, timestamp, provider}

Step 2: JS ENGINE PROCESSES
  LocationTrackingEngine.onSignificantLocationChange(location)
    a. state.lastLocation = location
    b. state.lastUpdateTime = Date.now()
    c. resetSilenceTimer() → restart 45-min watchdog
    d. runFraudChecks(location, previousLocation) → check teleportation + geofence violation
    e. Proximity check: if dist to client ≤ 500m → triggerGPSBurst()
    f. locationBatchManager.addPoint(location, isInsideGeofence, currentActivity)
    g. evaluateMode() → potentially change tracking state

Step 3: BATCH MANAGER FILTERS
  LocationBatchManager.addPoint(location, ...)
    a. REJECT if accuracy > 50m
    b. REJECT if displacement < 100m from last accepted (unless geofence event)
    c. Accept → push to in-memory buffer[]
    d. If buffer.length >= 50 → force flush()

Step 4: BATCH FLUSH (every 20 min, or buffer full, or shift ends)
  LocationBatchManager.flush()
    a. Build LocationBatch { nannyId, points[], batchTimestamp, deviceInfo }
    b. Clear buffer
    c. Call onFlush(batch) → uploadLocationBatch(batch, authToken)
    d. If upload fails → saveBatchToDisk(batch) → AsyncStorage
    e. If succeeds → retryAttempt = 0

Step 5: HTTP REQUEST
  POST /api/v1/location/batch
  Headers: { Authorization: Bearer <token>, Content-Type: application/json }
  Body: { nannyId, points[], batchTimestamp, deviceInfo }

Step 6: BACKEND API (external) processes the batch
  → Stores location data, runs server-side fraud checks, updates shift records
  → Returns { success, pointsSaved, fraudAlerts }
```

### 7.2 Failed Upload Recovery

```
Source: LocationBatchManager.ts lines 155–199 (saveBatchToDisk, retrySavedBatches)
```

```
Upload fails
  → saveBatchToDisk(): append to AsyncStorage array (max 10 batches, FIFO trim)
  → On next init(), or after retry delay:
       retrySavedBatches()
         → Load from AsyncStorage
         → Try each batch sequentially
         → On first failure: stop, re-save remaining
         → Schedule next retry with exponential backoff:
              delay = min(2^retryAttempt * 1000, 5 min)
              retryAttempt 0: 1s
              retryAttempt 1: 2s
              retryAttempt 2: 4s
              retryAttempt 3: 8s
              ...capped at 5 min
```

### 7.3 JS Fallback Flow

```
Source: LocationTrackingContext.tsx lines 163–198 (captureAndSend)
```

The JS fallback runs independently of the native engine:

```
Every 60s (dev) / 20 min (prod):
  getCurrentPosition(highAccuracy=false, timeout=15s)
  → buildFallbackBatch(vendorId, position, 'js-fallback')
  → uploadLocationBatch(batch, token) via locationApi.ts
```

This guarantees location data reaches the server even when:
- Native module isn't linked (dev builds)
- Running in an emulator
- Native tracking hasn't been initialized

On app backgrounding:

```
AppState → 'background' | 'inactive'
  → getCurrentPosition(highAccuracy=false, timeout=5s)
  → uploadLocationBatch() — fire-and-forget
```

---

## 8. Platform-Specific Behavior (Android vs iOS)

### 8.1 Significant Location Change

| Aspect | iOS | Android |
|---|---|---|
| API | `CLLocationManager.startMonitoringSignificantLocationChanges()` | `FusedLocationProvider` with `PRIORITY_BALANCED_POWER_ACCURACY` |
| Trigger | Cell tower change (~500m) | Cell tower change or Wi-Fi transition |
| Background | Works in background (plist background modes) | Requires ForegroundService with persistent notification |
| App killed | iOS relaunches app briefly to deliver the event | ForegroundService keeps process alive; BootReceiver + WorkManager re-registers after device restart |
| Battery | Hardware-level, negligible | Near-negligible with Play Services |

### 8.2 Geofencing

| Aspect | iOS | Android |
|---|---|---|
| API | `CLCircularRegion` via `startMonitoring(for:)` | `GeofencingClient.addGeofences()` |
| Max regions | 20 (iOS system limit) | 100 (Google Play Services limit) |
| Radius clamping | `min(radius, maximumRegionMonitoringDistance)` — iOS caps at ~400m in cities | No clamping needed |
| Entry/Exit accuracy | ~100m (iOS uses cell + Wi-Fi when GPS is off) | Similar, uses fused provider |
| Background | Works when app is suspended | Works via `BroadcastReceiver` |
| Latency | 1–5 minutes typical | Similar |

### 8.3 Activity Recognition

| Aspect | iOS | Android |
|---|---|---|
| API | `CMMotionActivityManager.startActivityUpdates()` | `ActivityRecognitionClient.requestActivityTransitionUpdates()` |
| Activities | stationary, walking, running, automotive, cycling | STILL, WALKING, RUNNING, IN_VEHICLE, ON_BICYCLE, ON_FOOT |
| Confidence mapping | `.high` → 90, `.medium` → 70, `.low` → 50 | Uses confidence percentage directly |
| Confidence threshold | Engine drops updates with confidence < 50 | Same |
| Battery | Uses accelerometer + gyroscope (very low power) | Uses step counter + accelerometer |
| Hardware requirement | iPhone 5s+ (M7 coprocessor) | Most Android phones with Play Services |

### 8.4 GPS Burst

| Aspect | iOS | Android |
|---|---|---|
| API | Separate `CLLocationManager` with `desiredAccuracy = kCLLocationAccuracyBest` | `FusedLocationProvider` with `PRIORITY_HIGH_ACCURACY` |
| Implementation | Creates `burstManager`, starts `startUpdatingLocation()`, collects up to `maxPoints`, then stops | Similar one-shot high-accuracy request |
| Safety timeout | Timer at `durationMs/1000 + 5` seconds | Similar timeout |
| Overlap prevention | `gpsBurstEndTime` check in JS engine | Same |

### 8.5 Foreground Service (Android Only)

```
Source: LocationTrackingEngine.ts lines 128–134 (startForegroundService)
        LocationTrackingContext.tsx lines 115–125 (saveTrackingConfig)
```

On Android, `startShift()` launches a foreground service with a persistent notification:
- Title: "MomKidCare"
- Body: "शिफ्ट ट्रैकिंग चालू है" (Hindi: "Shift tracking is active")

`saveTrackingConfig(nannyId, apiBase, token)` persists the config to SharedPreferences so the service can upload location data independently even if the React Native JS bridge is killed.

On `endShift()`, `stopForegroundService()` is called, and `clearTrackingConfig()` removes the persisted data.

### 8.6 Boot Recovery (Android Only)

Android uses `BootReceiver` + `WorkManager` to re-register significant location change monitoring after device restart. iOS handles this automatically via background modes declared in `Info.plist`.

---

## 9. Edge Cases & Failure Scenarios

### 9.1 App Killed by OS or User

| Platform | What Happens | Recovery |
|---|---|---|
| iOS | Significant location change events relaunch the app in background. Geofences remain registered. | App restarts in background, `init()` is called, tracking resumes. Buffered data was flushed or saved to AsyncStorage. |
| Android | ForegroundService prevents kill during active shift (persistent notification). If force-killed: BootReceiver + WorkManager re-registers. | Service restarts automatically. Persisted config in SharedPreferences ensures upload continues. |
| Both | JS fallback fires one last location on AppState → background/inactive. | `uploadLocationBatch` is called fire-and-forget. May or may not succeed. |

### 9.2 Permissions Denied

```
Source: permissions.ts, checkShiftReadiness()
```

| Permission | Impact if Denied | Handling |
|---|---|---|
| `ACCESS_FINE_LOCATION` | Cannot start shift at all | `startShift()` throws `Error('Missing permissions: fineLocation')` |
| `ACCESS_BACKGROUND_LOCATION` | Cannot run geofencing in background | `startShift()` throws error. On Android < API 29: not needed (implied). |
| `ACTIVITY_RECOGNITION` | Cannot detect STILL/MOVING | If this is the ONLY missing permission, `startShift()` requests it inline. If denied, shift starts WITHOUT activity recognition — the engine will use the burst timer as fallback. |
| iOS "When In Use" only | Background tracking won't work | Native module throws at `startMonitoringSignificantLocationChanges()`. JS fallback still sends location when app is in foreground. |

### 9.3 Battery Saver / OEM Restrictions

| Issue | Impact | Mitigation |
|---|---|---|
| **Doze mode (Android 6+)** | Network calls deferred, timers paused | Batch flush timer pauses but resumes on maintenance window. ForegroundService is exempt from Doze. |
| **App Standby Buckets (Android 9+)** | Background execution limited | ForegroundService keeps app in "active" bucket during shift |
| **OEM aggressive kill (Xiaomi, Vivo, Oppo, Samsung)** | Custom task killers stop background services | ForegroundService + persistent notification + AutoStart permission on affected OEMs |
| **Low Power Mode (iOS)** | Background fetch suspended, significant change latency increases | Significant change still works (hardware-level). GPS burst may be delayed. |
| **Background App Refresh OFF (iOS)** | Periodic background execution stops | Significant change and geofencing continue (they are system services, not background fetch). |

### 9.4 GPS Inaccuracies Indoors

| Scenario | GPS Accuracy | System Behavior |
|---|---|---|
| Indoor (concrete building) | 50–200m | `addPoint()` filter drops readings > 50m accuracy. No data is recorded. |
| Indoor near windows | 15–50m | May pass accuracy filter. Displacement filter prevents jitter-based noise. |
| Basement / parking | No GPS fix | `requestGPSBurst()` may timeout (burstTimer fires after duration + 5s). Promise resolves with empty array or partial points. Engine catches the error and continues. |
| Urban canyon (tall buildings) | 10–100m, multipath errors | Accuracy field reflects this. Worst readings dropped by 50m filter. |

### 9.5 Network Failures During Batch Upload

```
Source: LocationBatchManager.ts lines 109–116 (flush), 131–145 (saveBatchToDisk)
```

```
Upload attempt → fetch() fails or returns !res.ok
  → catch returns false
  → saveBatchToDisk(batch) → AsyncStorage
  → Max 10 batches stored (FIFO trim on overflow)
  → On next app launch or after backoff delay → retrySavedBatches()
  → Exponential backoff: 1s, 2s, 4s, 8s... up to 5 min max
  → Sequential retry: stops on first failure, re-saves remaining
```

Worst case: 10 batches × 50 points = 500 points. At 20-min intervals, this covers ~3.5 hours of offline operation.

### 9.6 Clock Skew / Time Manipulation

The teleportation check uses `currentLocation.timestamp - previousLocation.timestamp`. If a user manually changes the device clock backward, the time difference could become negative, which would skip the check (division by negative = negative speed, which is less than 42). This is a very unlikely manipulation vector.

### 9.7 Multiple Simultaneous Shifts

The engine only supports one active shift via `this.currentShift`. If `startShift()` is called while a shift is active, the old geofence is not removed first (the new one overwrites `this.currentShift` but the old geofence remains registered). This could leak monitoring regions.

---

## 10. File-to-Responsibility Map

### Frontend — `src/services/location/`

| File | Responsibility | Depends On | Depended On By |
|---|---|---|---|
| `types.ts` | Type definitions, `DEFAULT_TRACKING_CONFIG`, `LOCATION_EVENTS` constants | None | Every other file |
| `geoUtils.ts` | Pure functions: `distanceBetween`, `distanceBetweenPoints`, `isInsideRadius`, `isAccuracyAcceptable`, `hasMovedSignificantly` | `types.ts` | Engine, BatchManager, FraudDetection |
| `LocationTrackingEngine.ts` | Singleton state machine. Subscribes to native events. Manages GPS bursts, silence timer, shift lifecycle. Integrates FraudDetection. | `types`, `geoUtils`, `BatchManager`, `FraudDetection`, `permissions` | Context, index.ts |
| `LocationBatchManager.ts` | Singleton buffer. Filters/deduplicates points. Periodic flush. AsyncStorage persistence. Exponential retry. | `types`, `geoUtils` | Engine, Context |
| `FraudDetection.ts` | Synchronous fraud heuristics: teleportation, geofence violation, mock location check. Module-level `geofenceExitTimestamp`. | `types`, `geoUtils`, NativeModules | Engine |
| `locationApi.ts` | HTTP client: `uploadLocationBatch`, `fetchActiveShift`, `reportFraudAlert`, `fetchTrackingConfig` | `types`, `react-native-config` | Context, BatchManager (via callback) |
| `permissions.ts` | Android/iOS permission checks and requests. `checkShiftReadiness()` returns which permissions are missing. | React Native `PermissionsAndroid` | Engine |
| `index.ts` | Barrel exports — all public API surface | All | Context, hooks, screens |

### Frontend — Context & Hooks

| File | Responsibility |
|---|---|
| `src/context/LocationTrackingContext.tsx` | React Provider. Initializes engine with batch upload + fraud alert callbacks. Runs JS fallback. Sends background snapshot. Subscribes to state changes. |
| `src/hooks/useLocationTracking.ts` | Re-exports `useLocationTrackingContext` for backward compatibility |

### Native — iOS

| File | Responsibility |
|---|---|
| `ios/nannyApp/NannyLocationModule.swift` | CLLocationManager (significant change), CLCircularRegion (geofence), GPS burst via temp CLLocationManager, CMMotionActivityManager (activity), battery info |
| `ios/nannyApp/NannyLocationModule.m` | Objective-C bridge: declares all RCT_EXTERN_METHOD signatures for React Native |

> **Note**: Backend API code is in a separate repository. See Appendix C for the API endpoints this app communicates with.

---

## 11. Code Intelligence — Risks, Redundancies & Optimizations

### 11.1 Identified Risks

| # | Risk | Severity | File | Details |
|---|---|---|---|---|
| R1 | **Foreground service config stored in SharedPreferences with auth token** | MEDIUM | `LocationTrackingContext.tsx` | `saveTrackingConfig(vendorId, apiBase, token)` stores the bearer token in SharedPreferences. On rooted devices this is readable. Should use EncryptedSharedPreferences or Android Keystore. |
| R2 | **Multiple shift race condition** | LOW | `LocationTrackingEngine.ts` | Calling `startShift()` twice without `endShift()` leaks the first geofence region and overwrites `this.currentShift` without cleanup. |
| R3 | **CMMotionActivityManager instance not stored** | LOW | `NannyLocationModule.swift` | `startActivityRecognition` creates a local `activityManager` that's deallocated when it goes out of scope. The activity updates closure captures `[weak self]` but the manager itself may be garbage collected. |
| R4 | **Module-level mutable state in FraudDetection** | LOW | `FraudDetection.ts` | `geofenceExitTimestamp` is module-scoped mutable state. In a hot-reload scenario (dev), this state persists across re-renders but may be stale. The `resetFraudState()` function exists but isn't called on shift start. |

### 11.2 Redundancies Identified and Resolved

| # | What | Status |
|---|---|---|
| 1 | `useLocationTracking` hook duplicated `LocationTrackingContext` (both initialized the engine independently) | ✅ Resolved — hook is now a thin re-export |
| 2 | JS fallback used raw `fetch()` to the batch endpoint while `locationApi.ts` had `uploadLocationBatch()` | ✅ Resolved — now uses `uploadLocationBatch()` |

### 11.3 Performance Optimizations Applied

| # | Before | After | Impact |
|---|---|---|---|
| 1 | Batch retry: immediate retry of all failed batches | Exponential backoff (1s, 2s, 4s... 5min cap) | Prevents thundering herd on server recovery |

---

## 12. Suggested Improvements

### 12.1 Security (High Priority)

| # | Suggestion | Effort | Impact |
|---|---|---|---|
| S1 | Use `EncryptedSharedPreferences` (Android) or Keychain (iOS) for token storage instead of plain SharedPreferences | Medium | Prevents token theft on rooted devices |
| S2 | Add request signing (HMAC) for batch uploads to prevent replay attacks | Medium | Prevents captured requests from being replayed |

### 12.2 Reliability

| # | Suggestion | Effort | Impact |
|---|---|---|---|
| R1 | Call `endShift()` before `startShift()` if `currentShift` is already set — prevents geofence leak | Low | Fixes race condition |
| R2 | Call `resetFraudState()` at the start of `startShift()` to clear stale `geofenceExitTimestamp` | Low | Prevents false geofence violations on shift start |
| R3 | Store `CMMotionActivityManager` as an instance property in Swift module to prevent premature deallocation | Low | Fixes activity recognition silently stopping |
| R4 | Add `isMock` field to the batch points sent from client (Android `Location.isFromMockProvider()`) — currently only checked via async native call | Medium | Server-side mock detection even without GPS burst |
| R5 | Add a client-side health check that runs on `AppState` → foreground: verify location permissions + geofence registration + significant change monitoring are all still active | Medium | Recovers from OS permission revocation or geofence expiry |

### 12.3 Scalability

| # | Suggestion | Effort | Impact |
|---|---|---|---|
| SC1 | Add batch compression (gzip) for mobile uploads — a 50-point batch is ~5KB uncompressed | Low | Saves mobile data on slow 2G/3G connections |

### 12.4 Observability

| # | Suggestion | Effort | Impact |
|---|---|---|---|
| O1 | Track client-side metrics: battery level delta per shift, batch upload success rate, GPS burst accuracy distribution | Medium | Data-driven battery optimization |
| O2 | Log tracking state transitions (sent as part of batch or separate telemetry) for debugging nanny-reported issues | Medium | Reduces support burden |

---

## Appendix A: Configuration Reference

```
Source: types.ts, DEFAULT_TRACKING_CONFIG
```

| Parameter | Default (Prod) | Default (Dev) | Unit | Purpose |
|---|---|---|---|---|
| `significantDisplacement` | 100 | 100 | meters | Min distance between accepted points |
| `geofenceRadius` | 150 | 150 | meters | Default radius around client home |
| `nearClientRadius` | 500 | 500 | meters | Distance at which GPS burst triggers |
| `gpsBurstDuration` | 45,000 | 45,000 | ms | How long GPS stays on per burst |
| `batchInterval` | 1,200,000 (20 min) | 60,000 (1 min) | ms | How often batched points are uploaded |
| `shiftCheckInterval` | 900,000 (15 min) | 120,000 (2 min) | ms | Periodic GPS burst timer during shift |
| `maxSilenceBeforeAlert` | 2,700,000 (45 min) | 300,000 (5 min) | ms | No-update duration before suspicious flag |
| `minAccuracyThreshold` | 50 | 50 | meters | Readings worse than this are dropped |
| `gpsBurstMaxPoints` | 3 | 3 | count | Max GPS readings per burst |
| `suspiciousThreshold` | 60 | 60 | score (0–100) | Score above which tracking escalates |

## Appendix B: API Endpoint Reference

| Method | Path | Auth | Purpose | Rate |
|---|---|---|---|---|
| `POST` | `/api/v1/location/batch` | Bearer token | Upload location points | Max 100 points/batch |
| `GET` | `/api/v1/location/config` | Bearer token | Get tracking config | On init |
| `GET` | `/api/v1/shifts/active` | Bearer token | Get current shift | On init |
| `POST` | `/api/v1/fraud/alert` | Bearer token | Report client-detected fraud | On fraud signal |
| `GET` | `/api/v1/fraud/alerts` | Bearer token | List alerts (admin) | Paginated |
| `PUT` | `/api/v1/fraud/alerts/:id/resolve` | Bearer token | Resolve alert (admin) | Per action |

## Appendix C: Fraud Alert Types Quick Reference

| Type | Detected By | Severity | Threshold |
|---|---|---|---|
| `LOCATION_SPOOFING` (teleportation) | Client + Backend API | HIGH | Speed > 42 m/s, gap > 3s |
| `LOCATION_SPOOFING` (mock) | Client + Backend API | CRITICAL | `isMock === true` or `checkMockLocation()` |
| `GEOFENCE_VIOLATION` | Client | MEDIUM | Outside fence > 10 min during shift |
| `TRACKING_STOPPED` | Backend API (cron) | HIGH | No updates > 45 min during active shift |
| `DOUBLE_JOB` | Backend API (cron) | HIGH | ≥3 stays (>1hr, >200m from clients) in 7 days |
| `FAKE_LEAVE` | Backend API (on demand) | MEDIUM | Max displacement < 500m on leave day |
