package com.nannyapp.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restarts significant location tracking after device boot.
 * Ensures geofences and passive tracking survive reboots.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        // Restart foreground service if config exists
        LocationForegroundService.startIfConfigured(context)

        // Also re-register significant location changes via WorkManager
        try {
            androidx.work.OneTimeWorkRequest.Builder(LocationBootWorker::class.java)
                .build()
                .let { request ->
                    androidx.work.WorkManager.getInstance(context).enqueue(request)
                }
        } catch (_: Exception) {
            // WorkManager may not be initialized yet
        }
    }
}
