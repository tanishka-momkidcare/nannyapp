import React, {createContext, useContext} from 'react';
import {useColorScheme} from 'react-native';
import {Colors, type ThemeColors} from '../constants';

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.light,
  isDark: false,
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{colors, isDark}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
