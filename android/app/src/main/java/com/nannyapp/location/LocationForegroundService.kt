package com.nannyapp.location

import android.Manifest
import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.google.android.gms.location.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Foreground service that keeps location tracking alive.
 *
 * Self-sufficient: when the JS bridge is dead (app killed), this service
 * collects location via FusedLocationProvider and POSTs batches directly
 * to the backend over HTTP.
 *
 * Uses WorkManager periodic keepalive to restart itself if killed by OEM.
 */
class LocationForegroundService : Service() {

    companion object {
        private const val TAG = "LocationFgService"
        private const val CHANNEL_ID = "nanny_location_channel"
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "NannyLocationPrefs"
        private const val KEY_VENDOR_ID = "vendorId"
        private const val KEY_API_BASE = "apiBaseUrl"
        private const val KEY_AUTH_TOKEN = "authToken"
        private const val KEY_SERVICE_ACTIVE = "serviceActive"
        private const val KEEPALIVE_WORK_NAME = "location_keepalive"

        /** Call from JS bridge to persist config for the service. */
        fun saveConfig(context: Context, vendorId: String, apiBase: String, authToken: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_VENDOR_ID, vendorId)
                .putString(KEY_API_BASE, apiBase)
                .putString(KEY_AUTH_TOKEN, authToken)
                .putBoolean(KEY_SERVICE_ACTIVE, true)
                .apply()
        }

        fun clearConfig(context: Context) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().clear().apply()
            // Cancel keepalive worker
            WorkManager.getInstance(context).cancelUniqueWork(KEEPALIVE_WORK_NAME)
        }

        /** Check if service should be running. */
        fun isConfigured(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_SERVICE_ACTIVE, false) &&
                   prefs.getString(KEY_VENDOR_ID, null) != null
        }

        /** Start the service from any context (WorkManager, BroadcastReceiver, etc.) */
        fun startIfConfigured(context: Context) {
            if (!isConfigured(context)) return
            val intent = Intent(context, LocationForegroundService::class.java).apply {
                putExtra("title", "MomKidCare")
                putExtra("body", "लोकेशन ट्रैकिंग चालू है")
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not start service: ${e.message}")
            }
        }
    }

    private var fusedClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var vendorId: String? = null
    private var apiBase: String? = null
    private var authToken: String? = null
    private var isExplicitStop = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand called")
        isExplicitStop = false

        val title = intent?.getStringExtra("title") ?: "MomKidCare"
        val body = intent?.getStringExtra("body") ?: "Location tracking active"

        createNotificationChannel()

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        // Load config from SharedPreferences
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        vendorId = prefs.getString(KEY_VENDOR_ID, null)
        apiBase = prefs.getString(KEY_API_BASE, null)
        authToken = prefs.getString(KEY_AUTH_TOKEN, null)

        // Start self-sufficient location tracking
        startSelfSufficientTracking()

        // Schedule WorkManager keepalive to restart service if OEM kills it
        scheduleKeepalive()

        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.i(TAG, "App removed from recents — service continues running")
        // Don't stop tracking — let the service keep running independently
        // WorkManager keepalive will restart if OEM kills us
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy called, explicitStop=$isExplicitStop")
        if (isExplicitStop) {
            // Only clean up if explicitly stopped (e.g. user logged out)
            stopSelfSufficientTracking()
            WorkManager.getInstance(this).cancelUniqueWork(KEEPALIVE_WORK_NAME)
        }
        // If NOT explicit stop (killed by system/OEM), WorkManager will restart us
        super.onDestroy()
    }

    /** Called by NannyLocationModule.stopForegroundService() */
    fun markExplicitStop() {
        isExplicitStop = true
    }

    // ─── WorkManager keepalive ──────────────────────────────────────────────

    private fun scheduleKeepalive() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
            .build()

        val keepaliveWork = PeriodicWorkRequestBuilder<LocationKeepaliveWorker>(
            15, TimeUnit.MINUTES // Minimum interval for periodic work
        )
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.LINEAR, 1, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            KEEPALIVE_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            keepaliveWork
        )
        Log.i(TAG, "Keepalive worker scheduled")
    }

    // ─── Self-sufficient location tracking ──────────────────────────────────

    @SuppressLint("MissingPermission")
    private fun startSelfSufficientTracking() {
        if (vendorId == null || apiBase == null) {
            Log.w(TAG, "No config saved — skipping self-sufficient tracking")
            return
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission not granted")
            return
        }

        // Stop existing callbacks before re-registering
        stopSelfSufficientTracking()

        fusedClient = LocationServices.getFusedLocationProviderClient(this)

        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            1 * 60 * 1000L // 1 minute — send even if stationary
        ).apply {
            setMinUpdateDistanceMeters(0f) // No displacement filter — always send
            setWaitForAccurateLocation(false)
            setMaxUpdateDelayMillis(2 * 60 * 1000L) // batch for 2 min max
        }.build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    Log.d(TAG, "Location received: (${loc.latitude}, ${loc.longitude}) acc=${loc.accuracy}m")
                    postLocationBatch(loc.latitude, loc.longitude, loc.accuracy.toDouble(), loc.time)
                }
            }
        }

        fusedClient?.requestLocationUpdates(request, locationCallback!!, Looper.getMainLooper())
        Log.i(TAG, "Self-sufficient tracking started for vendor=$vendorId")
    }

    private fun stopSelfSufficientTracking() {
        locationCallback?.let { fusedClient?.removeLocationUpdates(it) }
        locationCallback = null
        fusedClient = null
    }

    private fun postLocationBatch(lat: Double, lng: Double, accuracy: Double, timestamp: Long) {
        val vid = vendorId ?: return
        val base = apiBase ?: return

        // Run HTTP on background thread
        Thread {
            try {
                val point = JSONObject().apply {
                    put("latitude", lat)
                    put("longitude", lng)
                    put("accuracy", accuracy)
                    put("timestamp", timestamp)
                    put("activityType", "UNKNOWN")
                    put("provider", "foreground-service")
                    put("isInsideGeofence", false)
                    put("isMock", false)
                }

                val body = JSONObject().apply {
                    put("nannyId", vid)
                    put("batchTimestamp", System.currentTimeMillis())
                    put("deviceInfo", JSONObject().apply {
                        put("platform", "android")
                    })
                    put("points", JSONArray().put(point))
                }

                val url = URL("$base/api/v1/location/batch")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                authToken?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
                conn.doOutput = true
                conn.connectTimeout = 15_000
                conn.readTimeout = 15_000

                OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }

                val code = conn.responseCode
                conn.disconnect()

                if (code in 200..299) {
                    Log.d(TAG, "Batch sent: ($lat, $lng) acc=${accuracy}m")
                } else {
                    Log.w(TAG, "Batch failed: HTTP $code")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Batch send error: ${e.message}")
            }
        }.start()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Shows when location tracking is active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
