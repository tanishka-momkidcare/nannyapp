package com.nannyapp.location

import android.content.Context
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters

/**
 * Periodic WorkManager worker that restarts the foreground service
 * if it was killed by the OEM or system. Runs every 15 minutes.
 */
class LocationKeepaliveWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    companion object {
        private const val TAG = "LocationKeepalive"
    }

    override fun doWork(): Result {
        Log.i(TAG, "Keepalive check running...")

        if (LocationForegroundService.isConfigured(applicationContext)) {
            Log.i(TAG, "Config exists — restarting foreground service")
            LocationForegroundService.startIfConfigured(applicationContext)
        } else {
            Log.i(TAG, "No config — skipping")
        }

        return Result.success()
    }
}
