/**
 * Location Tracking API Routes
 *
 * POST /api/location/batch       — Upload location batch from mobile
 * GET  /api/location/config      — Get tracking config for nanny
 * GET  /api/shifts/active        — Get active shift for nanny
 * POST /api/fraud/alert          — Report fraud alert from device
 * GET  /api/fraud/alerts         — Get fraud alerts (admin)
 * PUT  /api/fraud/alerts/:id/resolve — Resolve a fraud alert (admin)
 */

const express = require('express');
const router = express.Router();
const { LocationUpdate, GeofenceEvent, Shift, FraudAlert, TrackingConfig } = require('../models/locationModels');
const { analyzeLocationBatch } = require('../services/fraudDetectionService');

// ─── Upload Location Batch ───────────────────────────────────────────────────

router.post('/location/batch', async (req, res) => {
  try {
    const { nannyId, points, batchTimestamp, deviceInfo } = req.body;

    if (!nannyId || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'Invalid batch: nannyId and points required' });
    }

    // Find active shift for context
    const activeShift = await Shift.findOne({
      nannyId,
      status: 'ACTIVE',
    }).lean();

    // Transform and insert location points
    const docs = points.map((p) => ({
      nannyId,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      timestamp: new Date(p.timestamp),
      isInsideGeofence: p.isInsideGeofence || false,
      activityType: p.activityType || 'UNKNOWN',
      provider: p.provider,
      geofenceEvent: p.geofenceEvent || null,
      shiftId: activeShift?._id,
      platform: deviceInfo?.platform,
      batteryLevel: deviceInfo?.batteryLevel,
      isCharging: deviceInfo?.isCharging,
    }));

    await LocationUpdate.insertMany(docs);

    // Extract and save geofence events separately
    const geofencePoints = points.filter((p) => p.geofenceEvent);
    if (geofencePoints.length > 0 && activeShift) {
      const geoEvents = geofencePoints.map((p) => ({
        nannyId,
        shiftId: activeShift._id,
        clientId: activeShift.clientId,
        event: p.geofenceEvent,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        timestamp: new Date(p.timestamp),
        geofenceId: `shift_${activeShift._id}`,
      }));

      await GeofenceEvent.insertMany(geoEvents);

      // Update shift arrival/departure times
      for (const ge of geofencePoints) {
        if (ge.geofenceEvent === 'ENTER' && !activeShift.actualArrival) {
          await Shift.findByIdAndUpdate(activeShift._id, {
            actualArrival: new Date(ge.timestamp),
          });
        }
        if (ge.geofenceEvent === 'EXIT') {
          await Shift.findByIdAndUpdate(activeShift._id, {
            actualDeparture: new Date(ge.timestamp),
          });
        }
      }
    }

    // Run real-time fraud analysis
    const alerts = await analyzeLocationBatch(nannyId, docs, activeShift?._id);

    res.json({
      success: true,
      pointsSaved: docs.length,
      fraudAlerts: alerts.length,
    });
  } catch (err) {
    console.error('Location batch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Tracking Config ─────────────────────────────────────────────────────

router.get('/location/config', async (req, res) => {
  try {
    const { nannyId } = req.query;
    if (!nannyId) {
      return res.status(400).json({ error: 'nannyId required' });
    }

    const config = await TrackingConfig.findOne({ nannyId }).lean();

    // Return defaults if no custom config
    res.json(
      config || {
        significantDisplacement: 100,
        geofenceRadius: 150,
        batchInterval: 20 * 60 * 1000,
        maxSilenceBeforeAlert: 45 * 60 * 1000,
        minAccuracyThreshold: 50,
        suspiciousThreshold: 60,
      }
    );
  } catch (err) {
    console.error('Config fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Active Shift ────────────────────────────────────────────────────────

router.get('/shifts/active', async (req, res) => {
  try {
    const { nannyId } = req.query;
    if (!nannyId) {
      return res.status(400).json({ error: 'nannyId required' });
    }

    const now = new Date();
    const shift = await Shift.findOne({
      nannyId,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    if (shift && shift.status === 'SCHEDULED') {
      await Shift.findByIdAndUpdate(shift._id, { status: 'ACTIVE' });
      shift.status = 'ACTIVE';
    }

    res.json({
      shift: shift
        ? {
            shiftId: shift._id.toString(),
            nannyId: shift.nannyId.toString(),
            clientId: shift.clientId.toString(),
            clientLocation: shift.clientLocation,
            geofenceRadius: shift.geofenceRadius,
            startTime: shift.startTime.getTime(),
            endTime: shift.endTime.getTime(),
          }
        : null,
    });
  } catch (err) {
    console.error('Active shift fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Report Fraud Alert (from device) ────────────────────────────────────────

router.post('/fraud/alert', async (req, res) => {
  try {
    const { nannyId, type, severity, details, latitude, longitude } = req.body;

    if (!nannyId || !type || !severity || !details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validTypes = ['FAKE_LEAVE', 'DOUBLE_JOB', 'TRACKING_STOPPED', 'LOCATION_SPOOFING', 'GEOFENCE_VIOLATION'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    const alert = await FraudAlert.create({
      nannyId,
      type,
      severity,
      details,
      latitude,
      longitude,
    });

    res.json({ success: true, alertId: alert._id });
  } catch (err) {
    console.error('Fraud alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Fraud Alerts (admin) ────────────────────────────────────────────────

router.get('/fraud/alerts', async (req, res) => {
  try {
    const { nannyId, resolved, type, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (nannyId) filter.nannyId = nannyId;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (type) filter.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [alerts, total] = await Promise.all([
      FraudAlert.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      FraudAlert.countDocuments(filter),
    ]);

    res.json({ alerts, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('Fraud alerts fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Resolve Fraud Alert ─────────────────────────────────────────────────────

router.put('/fraud/alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, note } = req.body;

    const alert = await FraudAlert.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
        resolvedNote: note,
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true, alert });
  } catch (err) {
    console.error('Resolve alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
