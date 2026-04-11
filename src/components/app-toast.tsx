import { useMemo } from 'react';
import Toast, { BaseToast, type ToastConfig } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/**
 * Global toast host for React Native (react-native-toast-message).
 * Renders above navigation; keep mounted under Tamagui + SafeAreaProvider.
 */
export function AppToast() {
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const toastConfig: ToastConfig = useMemo(
    () => ({
      success: (props) => (
        <BaseToast
          {...props}
          style={{
            borderLeftColor: t.positive,
            backgroundColor: t.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            borderLeftWidth: 4,
            height: undefined,
            minHeight: 64,
            paddingVertical: 10,
          }}
          text1Style={{ fontSize: 16, fontWeight: '600', color: t.foreground }}
          text2Style={{ fontSize: 14, lineHeight: 20, color: t.mutedForeground }}
          text2NumberOfLines={4}
        />
      ),
      error: (props) => (
        <BaseToast
          {...props}
          style={{
            borderLeftColor: t.destructive,
            backgroundColor: t.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            borderLeftWidth: 4,
            height: undefined,
            minHeight: 64,
            paddingVertical: 10,
          }}
          text1Style={{ fontSize: 16, fontWeight: '600', color: t.foreground }}
          text2Style={{ fontSize: 14, lineHeight: 20, color: t.mutedForeground }}
          text2NumberOfLines={4}
        />
      ),
      info: (props) => (
        <BaseToast
          {...props}
          style={{
            borderLeftColor: t.primary,
            backgroundColor: t.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            borderLeftWidth: 4,
            height: undefined,
            minHeight: 64,
            paddingVertical: 10,
          }}
          text1Style={{ fontSize: 16, fontWeight: '600', color: t.foreground }}
          text2Style={{ fontSize: 14, lineHeight: 20, color: t.mutedForeground }}
          text2NumberOfLines={4}
        />
      ),
    }),
    [t],
  );

  return (
    <Toast
      config={toastConfig}
      topOffset={insets.top + 8}
      bottomOffset={insets.bottom + 16}
    />
  );
}
