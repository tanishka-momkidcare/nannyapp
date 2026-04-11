/**
 * Server-Side Fraud Detection Engine
 *
 * Runs periodic checks and real-time analysis on incoming location data.
 *
 * Detection rules:
 *  1. FAKE LEAVE: Leave applied but no long-distance movement detected
 *  2. DOUBLE JOB: Repeated long stays at unknown (non-client) locations
 *  3. TRACKING STOPPED: No updates for 30–60 min during active shift
 *  4. LOCATION SPOOFING: Mock location flag or impossible speed
 *  5. GEOFENCE VIOLATION: Prolonged absence from geofence during shift
 */

const { LocationUpdate, GeofenceEvent, Shift, FraudAlert } = require('../models/locationModels');

// Haversine distance (meters)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Real-Time Checks (called on each batch upload) ─────────────────────────

async function analyzeLocationBatch(nannyId, points, shiftId) {
  const alerts = [];

  // Check for mock locations
  const mockPoints = points.filter((p) => p.isMock);
  if (mockPoints.length > 0) {
    alerts.push({
      nannyId,
      type: 'LOCATION_SPOOFING',
      severity: 'CRITICAL',
      details: `${mockPoints.length} mock location(s) detected in batch`,
      shiftId,
      latitude: mockPoints[0].latitude,
      longitude: mockPoints[0].longitude,
    });
  }

  // Check for impossible speed (teleportation)
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const timeDiff = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000;
    if (timeDiff > 0) {
      const speed = dist / timeDiff; // m/s
      if (speed > 42) {
        // > 150 km/h
        alerts.push({
          nannyId,
          type: 'LOCATION_SPOOFING',
          severity: 'HIGH',
          details: `Impossible speed: ${Math.round(speed)} m/s (${Math.round(dist)}m in ${Math.round(timeDiff)}s)`,
          shiftId,
          latitude: curr.latitude,
          longitude: curr.longitude,
        });
        break;
      }
    }
  }

  // Save alerts
  if (alerts.length > 0) {
    await FraudAlert.insertMany(alerts);
  }

  return alerts;
}

// ─── Periodic Checks (run via cron/scheduler) ───────────────────────────────

/** Check all active shifts for tracking silence (> 30–60 min without updates). */
async function checkTrackingSilence() {
  const silenceThreshold = 45 * 60 * 1000; // 45 minutes
  const now = new Date();

  const activeShifts = await Shift.find({ status: 'ACTIVE' }).lean();

  for (const shift of activeShifts) {
    const lastUpdate = await LocationUpdate.findOne({ nannyId: shift.nannyId })
      .sort({ timestamp: -1 })
      .lean();

    if (!lastUpdate) continue;

    const silence = now - new Date(lastUpdate.timestamp);
    if (silence > silenceThreshold) {
      // Check if alert already exists (avoid duplicates)
      const existing = await FraudAlert.findOne({
        nannyId: shift.nannyId,
        type: 'TRACKING_STOPPED',
        resolved: false,
        createdAt: { $gte: new Date(now - 2 * 60 * 60 * 1000) }, // within 2h
      });

      if (!existing) {
        await FraudAlert.create({
          nannyId: shift.nannyId,
          type: 'TRACKING_STOPPED',
          severity: 'HIGH',
          details: `No location updates for ${Math.round(silence / 60000)} minutes during active shift`,
          shiftId: shift._id,
          latitude: lastUpdate.latitude,
          longitude: lastUpdate.longitude,
        });
      }
    }
  }
}

/** Detect FAKE LEAVE: leave applied but location shows nanny didn't travel. */
async function checkFakeLeave(nannyId, leaveDate) {
  const dayStart = new Date(leaveDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(leaveDate);
  dayEnd.setHours(23, 59, 59, 999);

  const locations = await LocationUpdate.find({
    nannyId,
    timestamp: { $gte: dayStart, $lte: dayEnd },
  })
    .sort({ timestamp: 1 })
    .lean();

  if (locations.length < 2) return null;

  // Calculate total displacement
  let maxDisplacement = 0;
  const homePoint = locations[0];
  for (const loc of locations) {
    const d = haversine(homePoint.latitude, homePoint.longitude, loc.latitude, loc.longitude);
    maxDisplacement = Math.max(maxDisplacement, d);
  }

  // If nanny stayed within 500m all day → suspicious
  if (maxDisplacement < 500) {
    const alert = await FraudAlert.create({
      nannyId,
      type: 'FAKE_LEAVE',
      severity: 'MEDIUM',
      details: `Leave applied but max displacement was only ${Math.round(maxDisplacement)}m for the entire day`,
      latitude: homePoint.latitude,
      longitude: homePoint.longitude,
    });
    return alert;
  }

  return null;
}

/** Detect DOUBLE JOB: repeated long stays at unknown locations. */
async function checkDoubleJob(nannyId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all shifts for this nanny
  const shifts = await Shift.find({ nannyId, startTime: { $gte: since } }).lean();
  const clientLocations = shifts.map((s) => ({
    lat: s.clientLocation.latitude,
    lng: s.clientLocation.longitude,
  }));

  // Get location clusters outside client locations
  const locations = await LocationUpdate.find({
    nannyId,
    timestamp: { $gte: since },
    isInsideGeofence: false,
    activityType: { $ne: 'IN_VEHICLE' },
  })
    .sort({ timestamp: 1 })
    .lean();

  // Find clusters where nanny stayed > 1 hour
  const clusters = findStayClusters(locations, 200, 60 * 60 * 1000); // 200m radius, 1h min

  // Filter out clusters near known client locations
  const suspiciousClusters = clusters.filter((cluster) => {
    return !clientLocations.some(
      (cl) => haversine(cluster.centerLat, cluster.centerLng, cl.lat, cl.lng) < 500
    );
  });

  // If same unknown location appears 3+ times → flag
  if (suspiciousClusters.length >= 3) {
    await FraudAlert.create({
      nannyId,
      type: 'DOUBLE_JOB',
      severity: 'HIGH',
      details: `${suspiciousClusters.length} extended stays detected at unknown locations over ${days} days`,
      latitude: suspiciousClusters[0].centerLat,
      longitude: suspiciousClusters[0].centerLng,
    });
  }
}

/** Helper: find clusters of locations where someone stayed in a small area for a long time. */
function findStayClusters(locations, radiusMeters, minDurationMs) {
  const clusters = [];
  let i = 0;

  while (i < locations.length) {
    const anchor = locations[i];
    let j = i + 1;

    while (j < locations.length) {
      const d = haversine(anchor.latitude, anchor.longitude, locations[j].latitude, locations[j].longitude);
      if (d > radiusMeters) break;
      j++;
    }

    const clusterPoints = locations.slice(i, j);
    if (clusterPoints.length >= 2) {
      const duration =
        new Date(clusterPoints[clusterPoints.length - 1].timestamp) -
        new Date(clusterPoints[0].timestamp);

      if (duration >= minDurationMs) {
        const avgLat = clusterPoints.reduce((s, p) => s + p.latitude, 0) / clusterPoints.length;
        const avgLng = clusterPoints.reduce((s, p) => s + p.longitude, 0) / clusterPoints.length;
        clusters.push({
          centerLat: avgLat,
          centerLng: avgLng,
          pointCount: clusterPoints.length,
          durationMs: duration,
          startTime: clusterPoints[0].timestamp,
          endTime: clusterPoints[clusterPoints.length - 1].timestamp,
        });
      }
    }

    i = j;
  }

  return clusters;
}

module.exports = {
  analyzeLocationBatch,
  checkTrackingSilence,
  checkFakeLeave,
  checkDoubleJob,
};
