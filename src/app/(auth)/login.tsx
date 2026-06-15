import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    const emailValue = email.trim();
    let hasError = false;

    if (!emailValue || !/\S+@\S+\.\S+/.test(emailValue)) {
      setEmailError('Geçerli bir e-posta adresi girin.');
      hasError = true;
    }
    if (!password || password.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır.');
      hasError = true;
    }

    if (hasError) return;

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
            <Image
              source={require('../../../assets/icon/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
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
                autoComplete="email"
                textContentType="username"
                error={emailError ?? undefined}
              />
              <Input
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                error={passwordError ?? undefined}
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
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
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
});
