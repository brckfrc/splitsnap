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
import { signUp } from '@/services/auth';

export default function RegisterScreen() {
  const t = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { user, error: err } = await signUp(email.trim(), password, name.trim());
      if (err) {
        setError(err.message);
        return;
      }
      if (!user) {
        setInfo('Kayıt alındı. E-posta doğrulaması gerekiyorsa gelen kutunuzu kontrol edin.');
        return;
      }
      router.replace(href('/groups'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <Text style={styles.emoji}></Text>
            <Text style={[styles.h1, { color: t.foreground }]} accessibilityRole="header">
              Hesap Oluştur
            </Text>
            <Text style={[styles.muted, { color: t.mutedForeground }]}>SplitSnap&apos;e hoş geldiniz</Text>

            <View style={styles.form}>
              <Input label="Ad Soyad" value={name} onChangeText={setName} placeholder="Ahmet Yılmaz" />
              <Input
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input label="Şifre" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
              {error ? (
                <Text style={{ color: t.destructive }} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              {info ? (
                <Text style={{ color: t.mutedForeground }} accessibilityRole="text">
                  {info}
                </Text>
              ) : null}
              <Button size="lg" loading={loading} onPress={onSubmit} accessibilityLabel="Kayıt ol">
                Kayıt Ol
              </Button>
            </View>

            <View style={styles.footer}>
              <Text style={{ color: t.mutedForeground }}>Zaten hesabınız var mı? </Text>
              <Link href={href('/login')} asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="Giriş sayfasına git">
                  <Text style={{ color: t.primary, fontWeight: '600' }}>Giriş Yapın</Text>
                </Pressable>
              </Link>
            </View>

            {__DEV__ ? (
              <View style={[styles.demo, { borderColor: t.border, backgroundColor: t.accent }]}>
                <Text style={[styles.demoText, { color: t.mutedForeground }]}>
                  Geliştirici: Production’da gerçek kayıt/giriş kullanılacak. E-posta onayı açıksa oturum hemen
                  oluşmayabilir. Yerel önizleme için EXPO_PUBLIC_DEV_LOGIN_BYPASS — ayrıntı AGENTS.md.
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
  },
  form: {
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
