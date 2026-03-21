import { Colors, type AppThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): AppThemeColors {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' || scheme === 'light' ? 'light' : 'dark';
  return Colors[theme];
}
