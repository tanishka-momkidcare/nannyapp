/**
 * Location Permission Helper
 *
 * Centralized permission checks for the tracking system.
 * Handles the differences between Android API levels and iOS.
 *
 * PERMISSION FLOW:
 *  1. LocationPermissionScreen (auth flow) → asks FINE_LOCATION + BACKGROUND_LOCATION
 *  2. When shift starts → checks if ACTIVITY_RECOGNITION is granted (Android 10+)
 *  3. If any permission missing → returns specific status so UI can prompt
 *
 * PHONE COMPATIBILITY:
 *  - All Android 5.0+ (API 21+) phones have fine/coarse location
 *  - Background location requires Android 10+ (API 29+) for separate permission
 *  - Activity recognition requires Android 10+ (API 29+) as runtime permission
 *  - Foreground service permission auto-granted on Android <12, runtime on 12+
 *  - iOS: location always available, motion requires iPhone 5s+ (2013+)
 *  - Geofencing: all Android phones with Google Play Services, all iPhones
 */

import { Platform, PermissionsAndroid } from 'react-native';

export type PermissionStatus =
  | 'GRANTED'
  | 'DENIED'
  | 'NEVER_ASK_AGAIN'
  | 'NOT_REQUESTED';

export interface LocationPermissions {
  fineLocation: PermissionStatus;
  backgroundLocation: PermissionStatus;
  activityRecognition: PermissionStatus;
}

/** Check all location-related permissions without requesting them. */
export async function checkAllPermissions(): Promise<LocationPermissions> {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled by CLLocationManager authorization status.
    // If the app can run, it means "when in use" was granted at minimum.
    // The native module checks at call time and throws if not granted.
    return {
      fineLocation: 'GRANTED',
      backgroundLocation: 'GRANTED', // Handled by Info.plist background modes
      activityRecognition: 'GRANTED', // CMMotionActivityManager checks at usage
    };
  }

  // Android
  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  const apiLevel = Number(Platform.Version);

  let bg = fine; // Before API 29, background was implied with fine location
  if (apiLevel >= 29) {
    bg = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    );
  }

  let activity = true; // Before API 29, no runtime permission needed
  if (apiLevel >= 29) {
    activity = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    );
  }

  return {
    fineLocation: fine ? 'GRANTED' : 'NOT_REQUESTED',
    backgroundLocation: bg ? 'GRANTED' : 'NOT_REQUESTED',
    activityRecognition: activity ? 'GRANTED' : 'NOT_REQUESTED',
  };
}

/** Request activity recognition permission (needed when starting a shift). */
export async function requestActivityRecognitionPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'ios') return 'GRANTED'; // Handled by CMMotionActivityManager

  const apiLevel = Number(Platform.Version);
  if (apiLevel < 29) return 'GRANTED'; // No runtime permission needed

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    {
      title: 'गतिविधि पहचान',
      message:
        'बैटरी बचाने के लिए हमें यह जानना होगा कि आप चल रहे हैं या रुके हैं। कृपया अनुमति दें।',
      buttonPositive: 'अनुमति दें',
      buttonNegative: 'रद्द करें',
    },
  );

  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'GRANTED';
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'NEVER_ASK_AGAIN';
  return 'DENIED';
}

/** Check if background location is available (needed for geofencing). */
export async function checkBackgroundLocationReady(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;

  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (!fine) return false;

  const apiLevel = Number(Platform.Version);
  if (apiLevel < 29) return true; // Background implied

  return PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  );
}

/**
 * Check if all permissions needed for shift tracking are granted.
 * If not, returns which ones are missing.
 */
export async function checkShiftReadiness(): Promise<{
  ready: boolean;
  missing: string[];
}> {
  const perms = await checkAllPermissions();
  const missing: string[] = [];

  if (perms.fineLocation !== 'GRANTED') missing.push('fineLocation');
  if (perms.backgroundLocation !== 'GRANTED') missing.push('backgroundLocation');
  if (perms.activityRecognition !== 'GRANTED') missing.push('activityRecognition');

  return { ready: missing.length === 0, missing };
}
