import React from 'react';
import { Pressable, type PressableProps, View, type ViewProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardBaseProps = {
  children: React.ReactNode;
  style?: ViewProps['style'];
};

export function Card({ children, style }: CardBaseProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: Radii.lg,
          padding: Spacing.four,
        },
        style,
      ]}
    >
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
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: Radii.lg,
          padding: Spacing.four,
        },
        pressed && { opacity: 0.97 },
        style,
      ]}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}
