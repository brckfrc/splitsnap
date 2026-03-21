import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const t = useTheme();
  const { user, signOutApp } = useAuth();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
          Profil
        </Text>
        <Text style={[styles.sub, { color: t.mutedForeground }]}>Hesap bilgileriniz</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET + Spacing.five }]}>
        <Card style={{ gap: Spacing.three }}>
          <View>
            <Text style={[styles.label, { color: t.mutedForeground }]}>Ad</Text>
            <Text style={[styles.value, { color: t.foreground }]}>{user?.name ?? '—'}</Text>
          </View>
          <View>
            <Text style={[styles.label, { color: t.mutedForeground }]}>E-posta</Text>
            <Text style={[styles.value, { color: t.foreground }]}>{user?.email ?? '—'}</Text>
          </View>
        </Card>

        <Button variant="destructive" onPress={() => void signOutApp()} accessibilityLabel="Çıkış yap">
          Çıkış Yap
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14 },
  body: { padding: Spacing.five, gap: Spacing.five },
  label: { fontSize: 13, marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '600' },
});
