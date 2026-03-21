import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DevLoginBypassPanel } from '@/components/auth/dev-login-bypass-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { signIn } from '@/services/auth';

export default function LoginScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError(err.message);
        return;
      }
      router.replace(href('/groups'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <Text style={[styles.emoji]} accessibilityElementsHidden importantForAccessibility="no">
              
            </Text>
            <Text style={[styles.h1, { color: t.foreground }]} accessibilityRole="header">
              SplitSnap
            </Text>
            <Text style={[styles.muted, { color: t.mutedForeground }]}>
              Ortak harcamalarınızı kolayca takip edin
            </Text>

            <View style={styles.form}>
              <Input
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
              <Input
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                textContentType="password"
              />
              {error ? (
                <Text style={{ color: t.destructive }} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <Button size="lg" loading={loading} onPress={onSubmit} accessibilityLabel="Giriş yap">
                Giriş Yap
              </Button>
            </View>

            <View style={styles.footer}>
              <Text style={{ color: t.mutedForeground }}>Hesabınız yok mu? </Text>
              <Link href={href('/register')} asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="Kayıt sayfasına git">
                  <Text style={{ color: t.primary, fontWeight: '600' }}>Kayıt Olun</Text>
                </Pressable>
              </Link>
            </View>

            {__DEV__ ? (
              <View style={[styles.demo, { borderColor: t.border, backgroundColor: t.accent }]}>
                <Text style={[styles.demoText, { color: t.mutedForeground }]}>
                  Geliştirici: Production’da gerçek giriş zorunludur. Supabase URL/anahtar .env içinde olmalı;
                  EXPO_PUBLIC_DEV_LOGIN_BYPASS=true yalnızca yerel UI gezintisi içindir (AGENTS.md).
                </Text>
              </View>
            ) : null}

            <DevLoginBypassPanel />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.seven,
  },
  inner: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.five,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
  },
  h1: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  muted: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  demo: {
    marginTop: Spacing.five,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
