package com.nannyapp.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.android.gms.location.*

/**
 * WorkManager worker that re-registers significant location change tracking
 * after device boot. Acts as a fallback to ensure tracking is always active.
 */
class LocationBootWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    @SuppressLint("MissingPermission")
    override fun doWork(): Result {
        if (ActivityCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return Result.failure()
        }

        val fusedClient = LocationServices.getFusedLocationProviderClient(applicationContext)

        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            5 * 60 * 1000L
        ).apply {
            setMinUpdateDistanceMeters(100f)
            setWaitForAccurateLocation(false)
        }.build()

        // We use a minimal callback here — the actual event handling
        // happens when the React Native app initializes
        fusedClient.requestLocationUpdates(
            request,
            object : LocationCallback() {},
            Looper.getMainLooper()
        )

        return Result.success()
    }
}
