package com.nannyapp.location

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.Looper
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.*

/**
 * NannyLocationModule — Android native module for battery-efficient location tracking.
 *
 * Uses:
 * - FusedLocationProviderClient (BALANCED_POWER_ACCURACY, 100m displacement)
 * - GeofencingClient for geofence monitoring
 * - ActivityRecognitionClient for motion detection
 * - GPS burst mode for short high-accuracy captures
 */
class NannyLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NannyLocationModule"

    private val fusedClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(reactContext)
    }
    private val geofencingClient: GeofencingClient by lazy {
        LocationServices.getGeofencingClient(reactContext)
    }
    private val activityClient: ActivityRecognitionClient by lazy {
        ActivityRecognition.getClient(reactContext)
    }

    private var significantChangeCallback: LocationCallback? = null
    private var gpsBurstCallback: LocationCallback? = null
    private var gpsBurstPromise: Promise? = null
    private var gpsBurstPoints: WritableArray? = null
    private var gpsBurstMaxPoints: Int = 3
    private var gpsBurstCount: Int = 0

    // ─── Significant Location Change ─────────────────────────────────────────

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startSignificantLocationChanges(promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }

        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            5 * 60 * 1000L // 5 minutes interval
        ).apply {
            setMinUpdateDistanceMeters(100f) // 100m displacement
            setWaitForAccurateLocation(false)
            setMaxUpdateDelayMillis(10 * 60 * 1000L) // batch delay 10 min
        }.build()

        significantChangeCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    emitLocationEvent("onSignificantLocationChange", location)
                }
            }
        }

        fusedClient.requestLocationUpdates(
            request,
            significantChangeCallback!!,
            Looper.getMainLooper()
        )

        promise.resolve(null)
    }

    @ReactMethod
    fun stopSignificantLocationChanges(promise: Promise) {
        significantChangeCallback?.let { fusedClient.removeLocationUpdates(it) }
        significantChangeCallback = null
        promise.resolve(null)
    }

    // ─── Geofencing ──────────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun addGeofence(regionMap: ReadableMap, promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }

        val id = regionMap.getString("id") ?: run {
            promise.reject("INVALID_ARGS", "Missing geofence id")
            return
        }
        val lat = regionMap.getDouble("latitude")
        val lng = regionMap.getDouble("longitude")
        val radius = regionMap.getDouble("radius").toFloat()

        val geofence = Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(lat, lng, radius)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(
                Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT
            )
            .setLoiteringDelay(30_000) // 30s dwell
            .build()

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()

        val intent = getGeofencePendingIntent()

        geofencingClient.addGeofences(request, intent)
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e ->
                promise.reject("GEOFENCE_ERROR", e.message)
            }
    }

    @ReactMethod
    fun removeGeofence(regionId: String, promise: Promise) {
        geofencingClient.removeGeofences(listOf(regionId))
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("GEOFENCE_ERROR", e.message) }
    }

    @ReactMethod
    fun removeAllGeofences(promise: Promise) {
        geofencingClient.removeGeofences(getGeofencePendingIntent())
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("GEOFENCE_ERROR", e.message) }
    }

    // ─── GPS Burst Mode ──────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun requestGPSBurst(durationMs: Double, maxPoints: Double, promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }

        gpsBurstPromise = promise
        gpsBurstPoints = Arguments.createArray()
        gpsBurstMaxPoints = maxPoints.toInt()
        gpsBurstCount = 0

        val request = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            (durationMs / maxPoints).toLong()
        ).apply {
            setMaxUpdates(gpsBurstMaxPoints)
            setDurationMillis(durationMs.toLong())
        }.build()

        gpsBurstCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    gpsBurstPoints?.pushMap(locationToMap(loc))
                    gpsBurstCount++

                    if (gpsBurstCount >= gpsBurstMaxPoints) {
                        finishGPSBurst()
                    }
                }
            }
        }

        fusedClient.requestLocationUpdates(
            request,
            gpsBurstCallback!!,
            Looper.getMainLooper()
        )

        // Safety timeout — ensure burst ends
        android.os.Handler(Looper.getMainLooper()).postDelayed({
            finishGPSBurst()
        }, durationMs.toLong() + 5000)
    }

    private fun finishGPSBurst() {
        gpsBurstCallback?.let { fusedClient.removeLocationUpdates(it) }
        gpsBurstCallback = null

        gpsBurstPromise?.resolve(gpsBurstPoints)
        gpsBurstPromise = null
        gpsBurstPoints = null
    }

    // ─── Activity Recognition ────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startActivityRecognition(promise: Promise) {
        val intent = getActivityPendingIntent()
        activityClient.requestActivityUpdates(30_000L, intent) // every 30s
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("ACTIVITY_ERROR", e.message) }
    }

    @ReactMethod
    fun stopActivityRecognition(promise: Promise) {
        activityClient.removeActivityUpdates(getActivityPendingIntent())
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("ACTIVITY_ERROR", e.message) }
    }

    // ─── Foreground Service ──────────────────────────────────────────────────

    @ReactMethod
    fun startForegroundService(title: String, body: String, promise: Promise) {
        val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
            putExtra("title", title)
            putExtra("body", body)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun stopForegroundService(promise: Promise) {
        val intent = Intent(reactContext, LocationForegroundService::class.java)
        reactContext.stopService(intent)
        promise.resolve(null)
    }

    // ─── Mock Location Detection ─────────────────────────────────────────────

    @ReactMethod
    fun checkMockLocation(locationMap: ReadableMap, promise: Promise) {
        // On Android, Location.isFromMockProvider() flags spoofed locations
        // We check the flag from the last known location
        val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            locationMap.hasKey("isMock") && locationMap.getBoolean("isMock")
        } else {
            false
        }
        promise.resolve(isMock)
    }

    // ─── Battery Info ────────────────────────────────────────────────────────

    @ReactMethod
    fun getBatteryInfo(promise: Promise) {
        val batteryIntent = reactContext.registerReceiver(
            null,
            android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED)
        )
        val level = batteryIntent?.let { intent ->
            val lvl = intent.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1)
            if (lvl >= 0 && scale > 0) (lvl.toFloat() / scale * 100).toInt() else -1
        } ?: -1

        val isCharging = batteryIntent?.let { intent ->
            val status = intent.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1)
            status == android.os.BatteryManager.BATTERY_STATUS_CHARGING ||
                status == android.os.BatteryManager.BATTERY_STATUS_FULL
        } ?: false

        val result = Arguments.createMap().apply {
            putInt("level", level)
            putBoolean("isCharging", isCharging)
        }
        promise.resolve(result)
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private fun emitLocationEvent(eventName: String, location: Location) {
        val map = locationToMap(location)
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, map)
    }

    private fun locationToMap(location: Location): WritableMap {
        return Arguments.createMap().apply {
            putDouble("latitude", location.latitude)
            putDouble("longitude", location.longitude)
            putDouble("accuracy", location.accuracy.toDouble())
            putDouble("altitude", location.altitude)
            putDouble("speed", location.speed.toDouble())
            putDouble("heading", location.bearing.toDouble())
            putDouble("timestamp", location.time.toDouble())
            putString("provider", "fused")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                putBoolean("isMock", location.isMock)
            }
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun getGeofencePendingIntent(): PendingIntent {
        val intent = Intent(reactContext, GeofenceBroadcastReceiver::class.java)
        return PendingIntent.getBroadcast(
            reactContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
    }

    private fun getActivityPendingIntent(): PendingIntent {
        val intent = Intent(reactContext, ActivityRecognitionReceiver::class.java)
        return PendingIntent.getBroadcast(
            reactContext, 1, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
    }
}
