import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);

    const emailValue = email.trim();
    const nameValue = name.trim();
    let hasError = false;

    if (!nameValue || nameValue.length < 2) {
      setNameError('Ad Soyad en az 2 karakter olmalıdır.');
      hasError = true;
    }
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
      const { error: err, session } = await signUp(email.trim(), password, name.trim());
      if (err) {
        setError(err.message);
        return;
      }
      if (!session) {
        setPassword('');
        Toast.show({
          type: 'success',
          text1: 'Kaydınız alındı',
          text2: 'E-postanızdaki doğrulama bağlantısına tıklayın; ardından buradan giriş yapın.',
          visibilityTime: 5000,
          position: 'bottom',
        });
        router.replace(href('/login'));
        return;
      }
      setPassword('');
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
            <Text style={[styles.h1, { color: t.foreground }]} accessibilityRole="header">
              Hesap Oluştur
            </Text>
            <Text style={[styles.muted, { color: t.mutedForeground }]}>SplitSnap&apos;e hoş geldiniz</Text>

            <View style={styles.form}>
              <Input
                label="Ad Soyad"
                value={name}
                onChangeText={setName}
                placeholder="Ahmet Yılmaz"
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                autoCorrect={false}
                error={nameError ?? undefined}
              />
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
                autoComplete="new-password"
                textContentType="newPassword"
                passwordRules="minlength: 6;"
                error={passwordError ?? undefined}
              />
              {error ? (
                <Text style={{ color: t.destructive }} accessibilityRole="alert">
                  {error}
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
});
