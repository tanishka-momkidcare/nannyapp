export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    primary: '#6C63FF',
    primaryDark: '#5A52D5',
    secondary: '#FF6584',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
    statusBar: 'dark-content' as const,
  },
  dark: {
    background: '#1A1A2E',
    surface: '#16213E',
    primary: '#6C63FF',
    primaryDark: '#5A52D5',
    secondary: '#FF6584',
    text: '#F8F9FA',
    textSecondary: '#9CA3AF',
    border: '#374151',
    card: '#16213E',
    statusBar: 'light-content' as const,
  },
};

export type ThemeColors = typeof Colors.light;
