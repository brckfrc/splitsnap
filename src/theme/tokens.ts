/**
 * Design tokens ported from design/src/styles/theme.css (light + dark).
 * oklch values approximated to hex for React Native.
 */

export const Radii = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const LightTokens = {
  background: '#ffffff',
  foreground: '#252525',
  card: '#ffffff',
  cardForeground: '#252525',
  primary: '#030213',
  primaryForeground: '#ffffff',
  secondary: '#E8E8ED',
  secondaryForeground: '#030213',
  muted: '#ececf0',
  mutedForeground: '#717182',
  accent: '#e9ebef',
  accentForeground: '#030213',
  destructive: '#d4183d',
  destructiveForeground: '#ffffff',
  border: 'rgba(0, 0, 0, 0.1)',
  inputBackground: '#f3f3f5',
  ring: '#b0b0b0',
  positive: '#16a34a',
  positiveMuted: 'rgba(22, 163, 74, 0.08)',
} as const;

export const DarkTokens = {
  background: '#252525',
  foreground: '#fafafa',
  card: '#252525',
  cardForeground: '#fafafa',
  primary: '#fafafa',
  primaryForeground: '#2a2a2a',
  secondary: '#3a3a3a',
  secondaryForeground: '#fafafa',
  muted: '#3a3a3a',
  mutedForeground: '#a3a3a3',
  accent: '#3a3a3a',
  accentForeground: '#fafafa',
  destructive: '#f87171',
  destructiveForeground: '#450a0a',
  border: '#3a3a3a',
  inputBackground: '#3a3a3a',
  ring: '#6b6b6b',
  positive: '#4ade80',
  positiveMuted: 'rgba(74, 222, 128, 0.12)',
} as const;

export type TokenScheme = typeof LightTokens | typeof DarkTokens;
