import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import Toast, { BaseToast, type BaseToastProps, type ToastConfig } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function makeToastRenderer(name: string, accentColor: string, t: AppThemeColors) {
  const style: ViewStyle = {
    borderLeftColor: accentColor,
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    borderLeftWidth: 4,
    height: undefined,
    minHeight: 64,
    paddingVertical: 10,
  };
  const text1Style = { fontSize: 16, fontWeight: '600' as const, color: t.foreground };
  const text2Style = { fontSize: 14, lineHeight: 20, color: t.mutedForeground };

  const Renderer = (props: BaseToastProps) => (
    <BaseToast {...props} style={style} text1Style={text1Style} text2Style={text2Style} text2NumberOfLines={4} />
  );
  Renderer.displayName = `Toast${name}`;
  return Renderer;
}

/**
 * Global toast host for React Native (react-native-toast-message).
 * Renders above navigation; keep mounted under Tamagui + SafeAreaProvider.
 */
export function AppToast() {
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const toastConfig: ToastConfig = useMemo(
    () => ({
      success: makeToastRenderer('Success', t.positive, t),
      error: makeToastRenderer('Error', t.destructive, t),
      info: makeToastRenderer('Info', t.primary, t),
    }),
    [t],
  );

  return <Toast config={toastConfig} topOffset={insets.top + 8} bottomOffset={insets.bottom + 16} />;
}
