import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'default' | 'secondary' | 'ghost' | 'destructive';
type Size = 'default' | 'sm' | 'lg';

export type ButtonProps = PressableProps & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
  textStyle?: TextStyle;
};

export function Button({
  variant = 'default',
  size = 'default',
  loading,
  disabled,
  children,
  style,
  textStyle,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<Variant, { container: ViewStyle; label: TextStyle }> = {
    default: {
      container: { backgroundColor: t.primary },
      label: { color: t.primaryForeground },
    },
    secondary: {
      container: { backgroundColor: t.secondary },
      label: { color: t.secondaryForeground },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      label: { color: t.foreground },
    },
    destructive: {
      container: { backgroundColor: t.destructive },
      label: { color: t.destructiveForeground },
    },
  };

  const sizeStyles: Record<Size, { container: ViewStyle; label: TextStyle }> = {
    sm: {
      container: { paddingVertical: Spacing.one + 2, paddingHorizontal: Spacing.three, minHeight: 36 },
      label: { fontSize: 14 },
    },
    default: {
      container: { paddingVertical: Spacing.two + 2, paddingHorizontal: Spacing.four, minHeight: 44 },
      label: { fontSize: 15 },
    },
    lg: {
      container: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, minHeight: 52 },
      label: { fontSize: 16 },
    },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: !!isDisabled }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        v.container,
        s.container,
        variant === 'ghost' && state.pressed && { backgroundColor: t.accent },
        variant !== 'ghost' && state.pressed && { opacity: 0.92 },
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.label.color as string} />
      ) : (
        <Text style={[styles.label, s.label, v.label, textStyle]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
