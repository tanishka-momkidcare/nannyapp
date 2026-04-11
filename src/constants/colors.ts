export const Colors = {
  primary: '#1B7FF6',
  iconBlue: '#1B7FF6',
  textBlue: '#4D99F1',
  light: {
    // Core
    background: '#FFFFFF',
    surface: '#F7F8FA',
    card: '#FFFFFF',
    primary: '#1B7FF6',
    primaryDark: '#2563EB',
    secondary: '#FF6584',
    accent: '#F5A623',
    success: '#22C55E',

    // Colors specifically requested
    iconBlue: '#1B7FF6',
    textBlue: '#4D99F1',

    // Text
    text: '#333333',
    textSecondary: '#6B7280',
    textMuted: '#707070',
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#E5E7EB',
    borderLight: '#E8ECF0',
    divider: '#F0F0F0',

    // Input
    inputBackground: '#F3F4F4',
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
    checkboxChecked: '#1B7FF6',

    // OTP
    otpBackground: '#FFFFFF',
    otpBorder: '#E0E0E0',
    otpFilledBackground: '#EEF6FF',
    otpFilledBorder: '#1B7FF6',

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
    badgeBackground: '#FFFFFF',
    blobColor: '#3B82F6',
    onboardingBackground: '#EEF6FF',

    // Dark mode specific
    textDark: '#1A3B70',
    danger: '#EF4444',
    avatarBackground: '#C5D8F0',
    avatarOverlay: 'rgba(255,255,255,0.5)',
    cardWarm: '#FFF5E6',
    cardInner: '#BDDAFC',
    badgeSurface: '#EEF2FF',
    tabInactive: '#9CA3AF',
    iconCircleBackground: '#EEF6FF',
    accentSurface: '#FFF5E6',
    primaryLight: '#D0E3FF',
    decorativeLine: '#DEE8F5',
    cardTinted: '#E8EFF9',
    dotInactive: '#C5D8F0',
    switchTrackOff: '#D1D5DB',
    switchTrackOn: '#374151',
    switchThumb: '#FFFFFF',
  },
  dark: {
    // Core
    background: '#0D1B2A',
    surface: '#1B2838',
    card: '#1B2838',
    primary: '#7CB8FF',
    primaryDark: '#5A9CF5',
    secondary: '#FF7A95',
    accent: '#FFB74D',
    success: '#4ADE80',

    // Colors specifically requested
    iconBlue: '#7CB8FF',
    textBlue: '#7CB8FF',

    // Text
    text: '#E8EAED',
    textSecondary: '#9AA0A6',
    textMuted: '#5E6D7F',
    textInverse: '#0D1B2A',

    // Borders & Dividers
    border: '#243447',
    borderLight: '#243447',
    divider: '#192533',

    // Input
    inputBackground: '#1B2838',
    inputText: '#E8EAED',
    inputPlaceholder: '#5E6D7F',
    inputBorder: '#2A3D52',

    // Button
    buttonPrimary: '#FFB74D',
    buttonPrimaryText: '#0D1B2A',
    buttonDisabled: '#1B2838',
    buttonDisabledText: '#4A5B6E',

    // Checkbox
    checkboxBorder: '#3A5068',
    checkboxChecked: '#7CB8FF',

    // OTP
    otpBackground: '#1B2838',
    otpBorder: '#2A3D52',
    otpFilledBackground: '#1A2E45',
    otpFilledBorder: '#7CB8FF',

    // Overlay / Modal
    overlay: 'rgba(0,0,0,0.55)',
    sheetBackground: '#1B2838',
    sheetHandle: '#3A5068',
    searchBackground: '#243447',
    selectedRow: '#1A2E45',

    // Status bar
    statusBar: 'light-content' as const,

    // Misc
    shadow: '#000000',
    badgeBackground: '#1B2838',
    blobColor: '#5A9CF5',
    onboardingBackground: '#0D1B2A',

    // Dark mode specific
    textDark: '#E8EAED',
    danger: '#EF4444',
    avatarBackground: '#374151',
    avatarOverlay: 'rgba(255,255,255,0.15)',
    cardWarm: '#1B2838',
    cardInner: '#101D2C',
    badgeSurface: '#243447',
    tabInactive: '#8899AA',
    iconCircleBackground: '#1B3A5C',
    accentSurface: '#1B3A5C',
    primaryLight: '#1B3A5C',
    decorativeLine: '#3C3C3E',
    cardTinted: '#1B2838',
    dotInactive: '#374151',
    switchTrackOff: '#374151',
    switchTrackOn: '#7CB8FF',
    switchThumb: '#E5E7EB',
  },
};

export type ThemeColors = typeof Colors.light;
