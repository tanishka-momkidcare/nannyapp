import React, {createContext, useContext, useEffect, useState} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, type ThemeColors} from '../constants';

/**
 * 'system' — follow device light/dark setting
 * 'light'  — always use light theme regardless of system
 */
type ThemeMode = 'system' | 'light';

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = '@nannyapp_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.light,
  isDark: false,
  themeMode: 'light',
  setThemeMode: () => {},
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'system' || stored === 'light') {
        setThemeModeState(stored);
      }
    });
  }, []);

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : false;
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{colors, isDark, themeMode, setThemeMode}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
