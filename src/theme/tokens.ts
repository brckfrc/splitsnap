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
  background: '#f2f2f7',
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
  border: 'rgba(0, 0, 0, 0.08)',
  inputBackground: '#f3f3f5',
  ring: '#b0b0b0',
  positive: '#16a34a',
  positiveMuted: 'rgba(22, 163, 74, 0.08)',
} as const;

export const DarkTokens = {
  background: '#000000',
  foreground: '#ffffff',
  card: '#121214',
  cardForeground: '#ffffff',
  primary: '#ffffff',
  primaryForeground: '#000000',
  secondary: '#1b1b1f',
  secondaryForeground: '#e4e4e7',
  muted: '#1c1c1e',
  mutedForeground: '#8e8e93',
  accent: '#2c2c2e',
  accentForeground: '#ffffff',
  destructive: '#ff453a',
  destructiveForeground: '#ffffff',
  border: '#1c1c1e',
  inputBackground: '#1c1c1e',
  ring: '#3a3a3c',
  positive: '#34c759',
  positiveMuted: 'rgba(52, 199, 89, 0.12)',
} as const;

export type TokenScheme = typeof LightTokens | typeof DarkTokens;
