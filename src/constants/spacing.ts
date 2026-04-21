import { scaleFont } from './fontSizes';

export const Spacing = {
  xs: scaleFont(4),
  sm: scaleFont(8),
  md: scaleFont(16),
  hp: scaleFont(20),
  lg: scaleFont(24),
  xl: scaleFont(32),
  xxl: scaleFont(48),
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  button: 14,
  xl: 16,
  xxl: 20,
  pill: 36,
} as const;
