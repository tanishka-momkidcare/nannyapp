import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  hasSeenOnboarding: false,
  signIn: async () => {},
  signOut: async () => {},
  completeOnboarding: async () => {},
});

const STORAGE_KEYS = {
  AUTH_TOKEN: '@nannyapp_auth_token',
  ONBOARDING: '@nannyapp_onboarding_complete',
};

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  async function bootstrapAuth() {
    try {
      const [token, onboarding] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
      ]);
      setIsLoggedIn(!!token);
      // In dev mode, always show onboarding; in production, respect stored value
      setHasSeenOnboarding(__DEV__ ? false : onboarding === 'true');
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    setIsLoggedIn(true);
  }

  async function signOut() {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setIsLoggedIn(false);
  }

  async function completeOnboarding() {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
    setHasSeenOnboarding(true);
  }

  return (
    <AuthContext.Provider
      value={{isLoggedIn, isLoading, hasSeenOnboarding, signIn, signOut, completeOnboarding}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
