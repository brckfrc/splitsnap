import React from 'react';
import { Pressable, type PressableProps, StyleSheet, View, type ViewProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardBaseProps = {
  children: React.ReactNode;
  style?: ViewProps['style'];
};

export function Card({ children, style }: CardBaseProps) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

export type PressableCardProps = CardBaseProps &
  Omit<PressableProps, 'style' | 'children'> & { style?: ViewProps['style'] };

export function PressableCard({ children, style, ...pressableProps }: PressableCardProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.card, borderColor: t.border },
        pressed && { opacity: 0.97 },
        style,
      ]}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.four,
  },
});
