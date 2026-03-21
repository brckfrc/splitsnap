import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, accessibilityLabel, ...rest }: InputProps) {
  const t = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: t.foreground }]} accessibilityLabel={label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={t.mutedForeground}
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.input,
          {
            color: t.foreground,
            backgroundColor: t.inputBackground,
            borderColor: error ? t.destructive : 'transparent',
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[styles.error, { color: t.destructive }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    fontSize: 13,
  },
});
