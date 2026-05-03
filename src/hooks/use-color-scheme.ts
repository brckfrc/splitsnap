import { useColorScheme as useNativeColorScheme, type ColorSchemeName } from 'react-native';

import { useAppSettingsStore } from '@/stores/app-settings-store';

export function useColorScheme(): NonNullable<ColorSchemeName> | 'unspecified' {
  const systemScheme = useNativeColorScheme();
  const themeMode = useAppSettingsStore((s) => s.themeMode);

  if (themeMode === 'light') return 'light';
  if (themeMode === 'dark') return 'dark';
  
  return systemScheme ?? 'unspecified';
}
