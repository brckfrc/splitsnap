import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shared nativeID for the iOS InputAccessoryView "Done" toolbar. */
export const KEYBOARD_ACCESSORY_ID = 'keyboard-done-bar';

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
  const isMultiline = Boolean(rest.multiline);

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
          // Single-line: "Done" key closes keyboard directly
          returnKeyType={isMultiline ? undefined : (rest.returnKeyType ?? 'done')}
          onSubmitEditing={isMultiline ? undefined : (rest.onSubmitEditing ?? (() => Keyboard.dismiss()))}
          // Multiline: uses shared InputAccessoryView toolbar below
          inputAccessoryViewID={isMultiline && Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
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

/**
 * Mount once at the layout/screen level (e.g. inside a SafeAreaView).
 * Renders the "Tamam" toolbar above the iOS keyboard for multiline inputs.
 * Single-line inputs use returnKeyType="done" and don't need this.
 */
export function KeyboardDoneToolbar() {
  const t = useTheme();

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
      <View style={[styles.toolbar, { backgroundColor: t.inputBackground, borderTopColor: t.border }]}>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Klavyeyi kapat"
        >
          <Text style={[styles.toolbarBtn, { color: t.primary }]}>Tamam</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
