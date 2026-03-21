import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Separator() {
  const t = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: t.border,
        marginVertical: Spacing.two,
        alignSelf: 'stretch',
      }}
      accessibilityRole="none"
      importantForAccessibility="no"
    />
  );
}
