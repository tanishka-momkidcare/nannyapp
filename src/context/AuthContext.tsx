import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  vendorId: string | null;
  vendorMobile: string | null;
  vendorName: string | null;
  vendorLocation: string | null;
  signIn: (token: string, vendorId: string, mobile: string, name?: string, location?: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  hasSeenOnboarding: false,
  vendorId: null,
  vendorMobile: null,
  vendorName: null,
  vendorLocation: null,
  signIn: async () => {},
  signOut: async () => {},
  completeOnboarding: async () => {},
});

const STORAGE_KEYS = {
  AUTH_TOKEN: '@nannyapp_auth_token',
  VENDOR_ID: '@nannyapp_vendor_id',
  VENDOR_MOBILE: '@nannyapp_vendor_mobile',
  VENDOR_NAME: '@nannyapp_vendor_name',
  VENDOR_LOCATION: '@nannyapp_vendor_location',
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

  useEffect(() => {
    bootstrapAuth();
  }, []);

  async function bootstrapAuth() {
    try {
      const [token, onboarding, storedVendorId, storedMobile, storedName, storedLocation] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_ID),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_MOBILE),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_NAME),
        AsyncStorage.getItem(STORAGE_KEYS.VENDOR_LOCATION),
      ]);
      setIsLoggedIn(!!token);
      setVendorId(storedVendorId);
      setVendorMobile(storedMobile);
      setVendorName(storedName);
      setVendorLocation(storedLocation);
      // In dev mode, always show onboarding; in production, respect stored value
      setHasSeenOnboarding(__DEV__ ? false : onboarding === 'true');
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(token: string, newVendorId: string, mobile: string, name?: string, location?: string) {
    const pairs: [string, string][] = [
      [STORAGE_KEYS.AUTH_TOKEN, token],
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

  async function signOut() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.VENDOR_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.VENDOR_MOBILE),
      AsyncStorage.removeItem(STORAGE_KEYS.VENDOR_NAME),
      AsyncStorage.removeItem(STORAGE_KEYS.VENDOR_LOCATION),
    ]);
    setVendorId(null);
    setVendorMobile(null);
    setVendorName(null);
    setVendorLocation(null);
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
        vendorId,
        vendorMobile,
        vendorName,
        vendorLocation,
        signIn,
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
