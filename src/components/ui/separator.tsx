import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Separator() {
  const t = useTheme();
  return (
    <View
      style={[styles.line, { backgroundColor: t.border }]}
      accessibilityRole="none"
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.two,
    alignSelf: 'stretch',
  },
});
