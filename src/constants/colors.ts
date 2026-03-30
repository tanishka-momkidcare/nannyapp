export const Colors = {
  light: {
    // Core
    background: '#FFFFFF',
    surface: '#F7F8FA',
    card: '#FFFFFF',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    secondary: '#FF6584',
    accent: '#F5A623',
    success: '#22C55E',

    // Text
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#888888',
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#E5E7EB',
    borderLight: '#E8ECF0',
    divider: '#F0F0F0',

    // Input
    inputBackground: '#F7F8FA',
    inputText: '#1A1A1A',
    inputPlaceholder: '#AAAAAA',
    inputBorder: '#E8ECF0',

    // Button
    buttonPrimary: '#F5A623',
    buttonPrimaryText: '#FFFFFF',
    buttonDisabled: '#E0E7EF',
    buttonDisabledText: '#666666',

    // Checkbox
    checkboxBorder: '#CCCCCC',
    checkboxChecked: '#3B82F6',

    // OTP
    otpBackground: '#FFFFFF',
    otpBorder: '#E0E0E0',
    otpFilledBackground: '#EEF6FF',
    otpFilledBorder: '#3B82F6',

    // Overlay / Modal
    overlay: 'rgba(0,0,0,0.4)',
    sheetBackground: '#FFFFFF',
    sheetHandle: '#DDDDDD',
    searchBackground: '#F5F5F5',
    selectedRow: '#EEF6FF',

    // Status bar
    statusBar: 'dark-content' as const,

    // Misc
    shadow: '#000000',
    link: '#3B82F6',
    badgeBackground: '#FFFFFF',
    blobColor: '#3B82F6',
    onboardingBackground: '#EEF6FF',
  },
  dark: {
    // Core
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    secondary: '#FF6584',
    accent: '#F5A623',
    success: '#22C55E',

    // Text
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F172A',

    // Borders & Dividers
    border: '#334155',
    borderLight: '#334155',
    divider: '#1E293B',

    // Input
    inputBackground: '#1E293B',
    inputText: '#F1F5F9',
    inputPlaceholder: '#64748B',
    inputBorder: '#334155',

    // Button
    buttonPrimary: '#F5A623',
    buttonPrimaryText: '#FFFFFF',
    buttonDisabled: '#334155',
    buttonDisabledText: '#64748B',

    // Checkbox
    checkboxBorder: '#475569',
    checkboxChecked: '#60A5FA',

    // OTP
    otpBackground: '#1E293B',
    otpBorder: '#334155',
    otpFilledBackground: '#1E3A5F',
    otpFilledBorder: '#60A5FA',

    // Overlay / Modal
    overlay: 'rgba(0,0,0,0.6)',
    sheetBackground: '#1E293B',
    sheetHandle: '#475569',
    searchBackground: '#334155',
    selectedRow: '#1E3A5F',

    // Status bar
    statusBar: 'light-content' as const,

    // Misc
    shadow: '#000000',
    link: '#60A5FA',
    badgeBackground: '#1E293B',
    blobColor: '#2563EB',
    onboardingBackground: '#0F172A',
  },
};

export type ThemeColors = typeof Colors.light;
