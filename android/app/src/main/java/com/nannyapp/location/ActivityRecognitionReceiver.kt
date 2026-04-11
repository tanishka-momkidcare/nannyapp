package com.nannyapp.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.DetectedActivity

/**
 * Receives activity recognition updates from the OS.
 * Maps detected activities to our types: STILL, WALKING, RUNNING, IN_VEHICLE, ON_BICYCLE, UNKNOWN.
 * Only emits when confidence ≥ 50%.
 */
class ActivityRecognitionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (!ActivityRecognitionResult.hasResult(intent)) return

        val result = ActivityRecognitionResult.extractResult(intent) ?: return
        val activity = result.mostProbableActivity

        if (activity.confidence < 50) return

        val activityType = mapActivityType(activity.type)

        val map = Arguments.createMap().apply {
            putString("type", activityType)
            putInt("confidence", activity.confidence)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }

        try {
            val reactContext = (context.applicationContext as? com.facebook.react.ReactApplication)
                ?.reactHost
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

            reactContext?.emit("onActivityChange", map)
        } catch (_: Exception) {
            // React context may not be available
        }
    }

    private fun mapActivityType(type: Int): String {
        return when (type) {
            DetectedActivity.STILL -> "STILL"
            DetectedActivity.WALKING -> "WALKING"
            DetectedActivity.RUNNING -> "RUNNING"
            DetectedActivity.IN_VEHICLE -> "IN_VEHICLE"
            DetectedActivity.ON_BICYCLE -> "ON_BICYCLE"
            DetectedActivity.ON_FOOT -> "WALKING"
            else -> "UNKNOWN"
        }
    }
}
