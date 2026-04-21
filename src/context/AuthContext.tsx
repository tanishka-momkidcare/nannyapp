import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';
import {logoutVendor} from '../services/authApi';
import {ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, FORCE_SIGN_OUT_EVENT} from '../services/Axios';

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  hasLocationPermission: boolean;
  hasJobLocation: boolean;
  vendorId: string | null;
  vendorMobile: string | null;
  vendorName: string | null;
  vendorLocation: string | null;
  signIn: (accessToken: string, refreshToken: string, vendorId: string, mobile: string, name?: string, location?: string) => Promise<void>;
  updateVendorLocation: (location: string) => Promise<void>;
  setHasLocationPermission: (val: boolean) => Promise<void>;
  setHasJobLocation: (val: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  hasSeenOnboarding: false,
  hasLocationPermission: false,
  hasJobLocation: false,
  vendorId: null,
  vendorMobile: null,
  vendorName: null,
  vendorLocation: null,
  signIn: async () => {},
  updateVendorLocation: async () => {},
  setHasLocationPermission: async () => {},
  setHasJobLocation: async () => {},
  signOut: async () => {},
  completeOnboarding: async () => {},
});

const STORAGE_KEYS = {
  VENDOR_ID: '@nannyapp_vendor_id',
  VENDOR_MOBILE: '@nannyapp_vendor_mobile',
  VENDOR_NAME: '@nannyapp_vendor_name',
  VENDOR_LOCATION: '@nannyapp_vendor_location',
  HAS_LOCATION_PERMISSION: '@nannyapp_has_location_perm',
  HAS_JOB_LOCATION: '@nannyapp_has_job_location',
  ONBOARDING: '@nannyapp_onboarding_complete',
};

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorMobile, setVendorMobile] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [vendorLocation, setVendorLocation] = useState<string | null>(null);
  const [hasJobLocation, setHasJobLocationState] = useState(false);
  const [hasLocationPermission, setHasLocationPermissionState] = useState(false);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  // Force sign-out when Axios refresh token fails
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(FORCE_SIGN_OUT_EVENT, () => {
      void clearLocalState();
    });
    return () => sub.remove();
  }, []);

  async function bootstrapAuth() {
    try {
      const [accessToken, onboarding, storedVendorId, storedMobile, storedName, storedLocation, storedHasJobLoc, storedHasLocPerm] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_ID),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_MOBILE),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_LOCATION),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_JOB_LOCATION),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_LOCATION_PERMISSION),
      ]);
      setIsLoggedIn(!!accessToken);
      setVendorId(storedVendorId);
      setVendorMobile(storedMobile);
      setVendorName(storedName);
      setVendorLocation(storedLocation);
      setHasJobLocationState(storedHasJobLoc === 'true');
      setHasLocationPermissionState(storedHasLocPerm === 'true');
      setHasSeenOnboarding(__DEV__ ? false : onboarding === 'true');
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(accessToken: string, refreshToken: string, newVendorId: string, mobile: string, name?: string, location?: string) {
    const pairs: [string, string][] = [
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
      [STORAGE_KEYS.VENDOR_ID, newVendorId],
      [STORAGE_KEYS.VENDOR_MOBILE, mobile],
    ];
    if (name) pairs.push([STORAGE_KEYS.VENDOR_NAME, name]);
    if (location) pairs.push([STORAGE_KEYS.VENDOR_LOCATION, location]);
    await AsyncStorage.multiSet(pairs);
    setVendorId(newVendorId);
    setVendorMobile(mobile);
    setVendorName(name || null);
    setVendorLocation(location || null);
    setIsLoggedIn(true);
  }

  async function updateVendorLocation(location: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.VENDOR_LOCATION, location);
    setVendorLocation(location);
  }

  async function setHasJobLocation(val: boolean) {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_JOB_LOCATION, val ? 'true' : 'false');
    setHasJobLocationState(val);
  }

  async function setHasLocationPermission(val: boolean) {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_LOCATION_PERMISSION, val ? 'true' : 'false');
    setHasLocationPermissionState(val);
  }

  async function signOut() {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await logoutVendor(refreshToken);
    }
    await clearLocalState();
  }

  async function clearLocalState() {
    await AsyncStorage.multiRemove([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      STORAGE_KEYS.VENDOR_ID,
      STORAGE_KEYS.VENDOR_MOBILE,
      STORAGE_KEYS.VENDOR_NAME,
      STORAGE_KEYS.VENDOR_LOCATION,
      STORAGE_KEYS.HAS_LOCATION_PERMISSION,
      STORAGE_KEYS.HAS_JOB_LOCATION,
    ]);
    setVendorId(null);
    setVendorMobile(null);
    setVendorName(null);
    setVendorLocation(null);
    setHasJobLocationState(false);
    setHasLocationPermissionState(false);
    setIsLoggedIn(false);
  }

  async function completeOnboarding() {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
    setHasSeenOnboarding(true);
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        hasSeenOnboarding,
        hasLocationPermission,
        hasJobLocation,
        vendorId,
        vendorMobile,
        vendorName,
        vendorLocation,
        signIn,
        updateVendorLocation,
        setHasLocationPermission,
        setHasJobLocation,
        signOut,
        completeOnboarding,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
