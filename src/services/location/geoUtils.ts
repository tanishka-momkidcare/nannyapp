/**
 * Geo Utilities — Haversine distance, bearing, and helper calculations.
 * Pure functions, no side effects.
 */

import type { LocationPoint } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

/** Haversine distance between two points in meters. */
export function distanceBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance between two LocationPoints. */
export function distanceBetweenPoints(a: LocationPoint, b: LocationPoint): number {
  return distanceBetween(a.latitude, a.longitude, b.latitude, b.longitude);
}

/** Is the given point inside a circle defined by center + radius? */
export function isInsideRadius(
  point: LocationPoint,
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): boolean {
  return distanceBetween(point.latitude, point.longitude, centerLat, centerLng) <= radiusMeters;
}

/** Filter out low-accuracy readings. */
export function isAccuracyAcceptable(point: LocationPoint, maxAccuracy: number): boolean {
  return point.accuracy <= maxAccuracy;
}

/** Has the user moved significantly since the last known position? */
export function hasMovedSignificantly(
  current: LocationPoint,
  previous: LocationPoint | null,
  thresholdMeters: number,
): boolean {
  if (!previous) return true;
  return distanceBetweenPoints(current, previous) >= thresholdMeters;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
