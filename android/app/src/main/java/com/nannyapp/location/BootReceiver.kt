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

        // Re-register significant location changes on boot.
        // The React Native engine will re-initialize geofences on app launch,
        // but we use WorkManager as a fallback to ensure we re-register.
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
