/**
 * App theme: design tokens from design/src/styles/theme.css + layout constants.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { DarkTokens, LightTokens, Radii, type TokenScheme } from '@/theme/tokens';

export { Radii };

export type AppThemeColors = TokenScheme & {
  /** @deprecated use foreground */
  text: string;
  /** @deprecated use mutedForeground */
  textSecondary: string;
  /** @deprecated use muted */
  backgroundElement: string;
  /** @deprecated use accent */
  backgroundSelected: string;
};

export function extendLegacy(tokens: TokenScheme): AppThemeColors {
  return {
    ...tokens,
    text: tokens.foreground,
    textSecondary: tokens.mutedForeground,
    backgroundElement: tokens.muted,
    backgroundSelected: tokens.accent,
  };
}

export const Colors: Record<'light' | 'dark', AppThemeColors> = {
  light: extendLegacy(LightTokens),
  dark: extendLegacy(DarkTokens),
};

export type ThemeColor = keyof AppThemeColors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, default: 50 }) ?? 50;
export const MaxContentWidth = 800;
