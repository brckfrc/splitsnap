import { useMemo } from 'react';
import { getVariableValue, useTheme as useTamaguiTheme } from 'tamagui';

import { extendLegacy, type AppThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTokens, LightTokens, type TokenScheme } from '@/theme/tokens';

const TOKEN_KEYS = Object.keys(LightTokens) as (keyof TokenScheme)[];

function readThemeValue(entry: unknown, fallback: string): string {
  if (entry == null || entry === undefined) {
    return fallback;
  }
  try {
    const resolved = getVariableValue(entry as never);
    if (typeof resolved === 'string' && resolved.length > 0) {
      return resolved;
    }
  } catch {
    /* not a Tamagui variable */
  }
  if (typeof entry === 'string' && entry.length > 0) {
    return entry;
  }
  if (entry && typeof entry === 'object' && 'get' in entry && typeof (entry as { get: () => unknown }).get === 'function') {
    const v = (entry as { get: () => unknown }).get();
    if (typeof v === 'string' && v.length > 0) return v;
    if (v != null && v !== undefined) {
      try {
        const inner = getVariableValue(v as never);
        if (typeof inner === 'string' && inner.length > 0) return inner;
      } catch {
        /* ignore */
      }
    }
  }
  return fallback;
}

export function useTheme(): AppThemeColors {
  const t = useTamaguiTheme();
  const scheme = useColorScheme();
  const isDark = scheme !== 'unspecified' && scheme !== 'light';

  return useMemo(() => {
    const fallbackTokens = isDark ? DarkTokens : LightTokens;
    const picked: Record<string, string> = {};
    for (const key of TOKEN_KEYS) {
      picked[key as string] = readThemeValue(t[key as string], fallbackTokens[key]);
    }
    return extendLegacy(picked as TokenScheme);
  }, [t, isDark]);
}
