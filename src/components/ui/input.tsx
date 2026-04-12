import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Text shown inside the input on the right, styled like a placeholder. */
  suffix?: string;
  /** Called when the suffix text is pressed. */
  onSuffixPress?: () => void;
};

export function Input({ label, error, suffix, onSuffixPress, style, accessibilityLabel, ...rest }: InputProps) {
  const t = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: t.foreground }]} accessibilityLabel={label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: t.inputBackground,
            borderColor: error ? t.destructive : 'transparent',
          },
        ]}
      >
        <TextInput
          placeholderTextColor={t.mutedForeground}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[styles.input, { color: t.foreground }, style]}
          {...rest}
        />
        {suffix ? (
          <Pressable
            onPress={onSuffixPress}
            disabled={!onSuffixPress}
            hitSlop={8}
            accessibilityRole={onSuffixPress ? 'button' : 'text'}
            accessibilityLabel={suffix}
          >
            <Text style={[styles.suffix, { color: t.mutedForeground }]}>{suffix}</Text>
          </Pressable>
        ) : null}
      </View>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.lg,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  suffix: {
    fontSize: 14,
    paddingRight: Spacing.four,
  },
  error: {
    fontSize: 13,
  },
});
