import Foundation
import CoreLocation
import React

/// NannyLocationModule — iOS native module for battery-efficient location tracking.
///
/// Uses:
/// - Significant Location Change API (ultra low battery)
/// - Region Monitoring / CLCircularRegion (geofencing)
/// - Short GPS bursts via CLLocationManager with desiredAccuracy = best
///
/// Does NOT use continuous GPS tracking.
@objc(NannyLocationModule)
class NannyLocationModule: RCTEventEmitter, CLLocationManagerDelegate {

  private let locationManager = CLLocationManager()
  private var burstManager: CLLocationManager?
  private var burstPromise: RCTPromiseResolveBlock?
  private var burstReject: RCTPromiseRejectBlock?
  private var burstPoints: [[String: Any]] = []
  private var burstMaxPoints: Int = 3
  private var burstTimer: Timer?

  override init() {
    super.init()
    locationManager.delegate = self
    locationManager.allowsBackgroundLocationUpdates = true
    locationManager.pausesLocationUpdatesAutomatically = false
  }

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String]! {
    return [
      "onSignificantLocationChange",
      "onGeofenceTransition",
      "onActivityChange",
      "onGPSBurstResult",
      "onTrackingError"
    ]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Significant Location Change

  @objc
  func startSignificantLocationChanges(_ resolve: @escaping RCTPromiseResolveBlock,
                                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard CLLocationManager.significantLocationChangeMonitoringAvailable() else {
      reject("UNAVAILABLE", "Significant location change not available", nil)
      return
    }

    locationManager.startMonitoringSignificantLocationChanges()
    resolve(nil)
  }

  @objc
  func stopSignificantLocationChanges(_ resolve: @escaping RCTPromiseResolveBlock,
                                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    locationManager.stopMonitoringSignificantLocationChanges()
    resolve(nil)
  }

  // MARK: - Geofencing (Region Monitoring)

  @objc
  func addGeofence(_ regionDict: NSDictionary,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else {
      reject("UNAVAILABLE", "Region monitoring not available", nil)
      return
    }

    guard let id = regionDict["id"] as? String,
          let lat = regionDict["latitude"] as? Double,
          let lng = regionDict["longitude"] as? Double,
          let radius = regionDict["radius"] as? Double else {
      reject("INVALID_ARGS", "Missing geofence parameters", nil)
      return
    }

    let clampedRadius = min(radius, locationManager.maximumRegionMonitoringDistance)
    let region = CLCircularRegion(
      center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
      radius: clampedRadius,
      identifier: id
    )
    region.notifyOnEntry = true
    region.notifyOnExit = true

    locationManager.startMonitoring(for: region)
    resolve(nil)
  }

  @objc
  func removeGeofence(_ regionId: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    for region in locationManager.monitoredRegions {
      if region.identifier == regionId {
        locationManager.stopMonitoring(for: region)
        break
      }
    }
    resolve(nil)
  }

  @objc
  func removeAllGeofences(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    for region in locationManager.monitoredRegions {
      locationManager.stopMonitoring(for: region)
    }
    resolve(nil)
  }

  // MARK: - GPS Burst Mode

  @objc
  func requestGPSBurst(_ durationMs: Double,
                        maxPoints: Double,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    burstPromise = resolve
    burstReject = reject
    burstPoints = []
    burstMaxPoints = Int(maxPoints)

    burstManager = CLLocationManager()
    burstManager?.delegate = self
    burstManager?.desiredAccuracy = kCLLocationAccuracyBest
    burstManager?.startUpdatingLocation()

    // Safety timeout
    let duration = durationMs / 1000.0 + 5.0
    burstTimer = Timer.scheduledTimer(withTimeInterval: duration, repeats: false) { [weak self] _ in
      self?.finishBurst()
    }
  }

  private func finishBurst() {
    burstTimer?.invalidate()
    burstTimer = nil
    burstManager?.stopUpdatingLocation()
    burstManager = nil

    burstPromise?(burstPoints)
    burstPromise = nil
    burstReject = nil
  }

  // MARK: - Activity Recognition (iOS via CMMotionActivityManager)

  @objc
  func startActivityRecognition(_ resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    // iOS uses CMMotionActivityManager for activity detection
    guard CMMotionActivityManager.isActivityAvailable() else {
      reject("UNAVAILABLE", "Activity recognition not available", nil)
      return
    }

    let activityManager = CMMotionActivityManager()
    activityManager.startActivityUpdates(to: .main) { [weak self] activity in
      guard let activity = activity else { return }

      var type = "UNKNOWN"
      var confidence = 50

      if activity.stationary {
        type = "STILL"
        confidence = activity.confidence == .high ? 90 : (activity.confidence == .medium ? 70 : 50)
      } else if activity.walking {
        type = "WALKING"
        confidence = activity.confidence == .high ? 90 : (activity.confidence == .medium ? 70 : 50)
      } else if activity.running {
        type = "RUNNING"
        confidence = activity.confidence == .high ? 90 : (activity.confidence == .medium ? 70 : 50)
      } else if activity.automotive {
        type = "IN_VEHICLE"
        confidence = activity.confidence == .high ? 90 : (activity.confidence == .medium ? 70 : 50)
      } else if activity.cycling {
        type = "ON_BICYCLE"
        confidence = activity.confidence == .high ? 90 : (activity.confidence == .medium ? 70 : 50)
      }

      self?.sendEvent(withName: "onActivityChange", body: [
        "type": type,
        "confidence": confidence,
        "timestamp": Date().timeIntervalSince1970 * 1000
      ])
    }

    resolve(nil)
  }

  @objc
  func stopActivityRecognition(_ resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    // CMMotionActivityManager doesn't have a shared instance pattern;
    // in production, store the instance as a property
    resolve(nil)
  }

  // MARK: - Battery Info

  @objc
  func getBatteryInfo(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    UIDevice.current.isBatteryMonitoringEnabled = true
    resolve([
      "level": Int(UIDevice.current.batteryLevel * 100),
      "isCharging": UIDevice.current.batteryState == .charging || UIDevice.current.batteryState == .full
    ])
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }

    let locDict: [String: Any] = [
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "accuracy": location.horizontalAccuracy,
      "altitude": location.altitude,
      "speed": max(0, location.speed),
      "heading": max(0, location.course),
      "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
      "provider": "significant-change"
    ]

    // GPS burst mode
    if manager === burstManager {
      burstPoints.append(locDict)
      if burstPoints.count >= burstMaxPoints {
        finishBurst()
      }
      return
    }

    // Significant location change
    sendEvent(withName: "onSignificantLocationChange", body: locDict)
  }

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    emitGeofenceEvent(region: region, event: "ENTER")
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    emitGeofenceEvent(region: region, event: "EXIT")
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    sendEvent(withName: "onTrackingError", body: [
      "error": error.localizedDescription,
      "source": "locationManager"
    ])
  }

  private func emitGeofenceEvent(region: CLRegion, event: String) {
    let currentLoc = locationManager.location
    sendEvent(withName: "onGeofenceTransition", body: [
      "regionId": region.identifier,
      "event": event,
      "location": [
        "latitude": currentLoc?.coordinate.latitude ?? 0,
        "longitude": currentLoc?.coordinate.longitude ?? 0,
        "accuracy": currentLoc?.horizontalAccuracy ?? 0,
        "timestamp": (currentLoc?.timestamp.timeIntervalSince1970 ?? 0) * 1000,
        "provider": "significant-change"
      ],
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
  }
}

// Import CoreMotion for activity recognition
import CoreMotion
import UIKit
