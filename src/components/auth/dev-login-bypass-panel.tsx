import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { isDevLoginBypassEnabled } from '@/lib/dev-auth-bypass';

/**
 * Shown only when `__DEV__` and `EXPO_PUBLIC_DEV_LOGIN_BYPASS=true|1`.
 * Do not rely on this for production auth — remove when real login is sufficient.
 */
export function DevLoginBypassPanel() {
  const t = useTheme();
  const { enterDevPreviewUser } = useAuth();

  if (!isDevLoginBypassEnabled()) {
    return null;
  }

  return (
    <View
      style={[styles.box, { borderColor: t.destructive, backgroundColor: t.accent }]}
      accessibilityLabel="Geliştirici yerel önizleme"
    >
      <Text style={[styles.title, { color: t.foreground }]}>Yerel geliştirici önizlemesi</Text>
      <Text style={[styles.body, { color: t.mutedForeground }]}>
        Supabase JWT oturumu olmadan uygulamaya girersiniz. Release derlemelerinde kapalıdır. Gerçek veri ve
        güvenlik için normal giriş / kayıt kullanın; bu kısayol geçicidir.
      </Text>
      <Button
        variant="secondary"
        onPress={() => {
          enterDevPreviewUser();
          queueMicrotask(() => {
            router.replace(href('/groups'));
          });
        }}
        accessibilityLabel="Geliştirici önizlemesi ile uygulamaya gir"
      >
        Dev: Uygulamayı önizle
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: Spacing.five,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.three,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
  },
});
