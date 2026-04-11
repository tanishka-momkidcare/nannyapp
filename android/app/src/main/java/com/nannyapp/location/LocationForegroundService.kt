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
import com.google.android.gms.location.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Foreground service that keeps location tracking alive during active shifts.
 *
 * Self-sufficient: when the JS bridge is dead (app killed), this service
 * collects location via FusedLocationProvider and POSTs batches directly
 * to the backend over HTTP.
 *
 * When the JS bridge IS alive, duplicate uploads are harmless — the backend
 * deduplicates by timestamp.
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

        /** Call from JS bridge to persist config for the service. */
        fun saveConfig(context: Context, vendorId: String, apiBase: String, authToken: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_VENDOR_ID, vendorId)
                .putString(KEY_API_BASE, apiBase)
                .putString(KEY_AUTH_TOKEN, authToken)
                .apply()
        }

        fun clearConfig(context: Context) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().clear().apply()
        }
    }

    private var fusedClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var vendorId: String? = null
    private var apiBase: String? = null
    private var authToken: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra("title") ?: "MomKidCare"
        val body = intent?.getStringExtra("body") ?: "Location tracking active"

        createNotificationChannel()

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        // Load config from SharedPreferences
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        vendorId = prefs.getString(KEY_VENDOR_ID, null)
        apiBase = prefs.getString(KEY_API_BASE, null)
        authToken = prefs.getString(KEY_AUTH_TOKEN, null)

        // Start self-sufficient location tracking
        startSelfSufficientTracking()

        return START_STICKY
    }

    override fun onDestroy() {
        stopSelfSufficientTracking()
        super.onDestroy()
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

        fusedClient = LocationServices.getFusedLocationProviderClient(this)

        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            5 * 60 * 1000L // 5 minutes
        ).apply {
            setMinUpdateDistanceMeters(100f)
            setWaitForAccurateLocation(false)
            setMaxUpdateDelayMillis(10 * 60 * 1000L) // batch for 10 min
        }.build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
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
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when location tracking is active during your shift"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
