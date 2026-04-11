package com.nannyapp.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.GeofenceStatusCodes
import com.google.android.gms.location.GeofencingEvent

/**
 * Receives geofence transition events from the OS.
 * Emits them to JS via RCTDeviceEventEmitter.
 */
class GeofenceBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) {
            val msg = GeofenceStatusCodes.getStatusCodeString(event.errorCode)
            emitError(context, msg)
            return
        }

        val transition = event.geofenceTransition
        val transitionType = when (transition) {
            com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_ENTER -> "ENTER"
            com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_EXIT -> "EXIT"
            com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_DWELL -> "DWELL"
            else -> return
        }

        val location = event.triggeringLocation ?: return

        for (geofence in event.triggeringGeofences ?: emptyList()) {
            val map = Arguments.createMap().apply {
                putString("regionId", geofence.requestId)
                putString("event", transitionType)
                putMap("location", Arguments.createMap().apply {
                    putDouble("latitude", location.latitude)
                    putDouble("longitude", location.longitude)
                    putDouble("accuracy", location.accuracy.toDouble())
                    putDouble("timestamp", location.time.toDouble())
                    putString("provider", "fused")
                })
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }

            try {
                val reactContext = (context.applicationContext as? com.facebook.react.ReactApplication)
                    ?.reactHost
                    ?.currentReactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

                reactContext?.emit("onGeofenceTransition", map)
            } catch (_: Exception) {
                // React context may not be available
            }
        }
    }

    private fun emitError(context: Context, message: String) {
        try {
            val reactContext = (context.applicationContext as? com.facebook.react.ReactApplication)
                ?.reactHost
                ?.currentReactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

            val errorMap = Arguments.createMap().apply {
                putString("error", message)
                putString("source", "geofence")
            }
            reactContext?.emit("onTrackingError", errorMap)
        } catch (_: Exception) {}
    }
}
