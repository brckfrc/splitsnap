import { ArrowLeft } from '@/lib/icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { validateLoginPassword, validateNewPassword } from '@/utils/validation';

export default function ChangePasswordScreen() {
  const t = useTheme();
  const { user, signOutApp } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);
    setError(null);

    let hasError = false;

    const currentErr = validateLoginPassword(currentPassword);
    if (currentErr) {
      setCurrentPasswordError(currentErr);
      hasError = true;
    }

    const newErr = validateNewPassword(newPassword);
    if (newErr) {
      setNewPasswordError(newErr);
      hasError = true;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('Yeni şifre mevcut şifreden farklı olmalıdır.');
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Şifreler eşleşmiyor.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      // Step 1: Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPassword,
      });

      if (signInError) {
        setCurrentPasswordError('Mevcut şifre yanlış.');
        return;
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Dismiss the keyboard first so the bottom toast isn't pushed up over
      // the keyboard (which made it appear mid-screen).
      Keyboard.dismiss();
      Toast.show({
        type: 'success',
        text1: 'Şifre Değiştirildi',
        text2: 'Lütfen yeni şifrenizle tekrar giriş yapın.',
        position: 'bottom',
        visibilityTime: 5000,
      });

      // Sign out and route back to the login screen so the user re-authenticates
      // with the NEW password. Logging in is the flow where iOS/password managers
      // reliably offer to UPDATE the saved credential (change-password screens
      // don't trigger that heuristic). The (app) layout guard redirects to
      // /login automatically once the user becomes null.
      await signOutApp();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bir hata oluştu.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color={t.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
          Şifre Değiştir
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.hint, { color: t.mutedForeground }]}>
            Güvenliğiniz için önce mevcut şifrenizi doğrulamanız gerekmektedir.
          </Text>

          <Input
            label="Mevcut Şifre"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
            secureToggle
            autoComplete="current-password"
            textContentType="password"
            error={currentPasswordError ?? undefined}
          />

          <View style={[styles.divider, { backgroundColor: t.border }]} />

          <Input
            label="Yeni Şifre"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureTextEntry
            secureToggle
            autoComplete="password"
            textContentType="password"
            error={newPasswordError ?? undefined}
          />

          <PasswordStrengthMeter password={newPassword} />

          <Input
            label="Yeni Şifre (Tekrar)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
            secureToggle
            autoComplete="password"
            textContentType="password"
            error={confirmPasswordError ?? undefined}
          />

          {error ? (
            <Text style={{ color: t.destructive }} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Button
            size="lg"
            loading={loading}
            onPress={onSubmit}
            accessibilityLabel="Şifreyi güncelle"
            style={{ marginTop: Spacing.two }}
          >
            Şifreyi Güncelle
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: Spacing.two },
  topTitle: { fontSize: 18, fontWeight: '700' },
  body: {
    padding: Spacing.five,
    gap: Spacing.four,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
});
