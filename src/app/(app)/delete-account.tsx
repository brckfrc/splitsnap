import { ArrowLeft, Trash2 } from '@/lib/icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { deleteAccount } from '@/services/account';

type DeleteStep = 'warning' | 'password';

export default function DeleteAccountScreen() {
  const t = useTheme();
  const { user, signOutApp } = useAuth();

  const [step, setStep] = useState<DeleteStep>('warning');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setPasswordError(null);
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setPasswordError('Lütfen şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      // 1. Şifre doğrulaması yap (Supabase Auth ile re-authenticate)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: trimmedPassword,
      });

      if (authError) {
        setPasswordError('Şifre hatalı. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }

      // 2. Şifre doğru ise Edge Function çağırıp hesabı sil
      await deleteAccount();
      
      // 3. Çıkış yap ve temizle
      await signOutApp();
      
      Alert.alert('Hesabınız Silindi', 'Hesabınız başarıyla kalıcı olarak kapatıldı ve silindi.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Hesap silinemedi.';
      setPasswordError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => {
            if (step === 'password') {
              setStep('warning');
              setPassword('');
              setPasswordError(null);
            } else {
              router.back();
            }
          }}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color={t.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
          {step === 'warning' ? 'Hesabı Kapat ve Sil' : 'Şifre Doğrulama'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'warning' ? (
            /* ADIM 1: UYARI VE KOŞULLAR */
            <View style={styles.content}>
              <View style={styles.warnIconWrapper}>
                <View style={[styles.warnIconBox, { backgroundColor: `${t.destructive}1A` }]}>
                  <Trash2 size={40} color={t.destructive} />
                </View>
              </View>

              <Text style={[styles.warnTitle, { color: t.foreground }]}>
                Bunu yapmak istediğinizden emin misiniz?
              </Text>
              
              <Text style={[styles.warnDesc, { color: t.mutedForeground }]}>
                Hesabınızı silmek kalıcı bir işlemdir ve aşağıdaki sonuçları doğuracaktır:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: t.destructive }]}>•</Text>
                  <Text style={[styles.bulletText, { color: t.foreground }]}>
                    Profiliniz, kayıtlı kişisel bilgileriniz ve ayarlarınız kalıcı olarak veritabanımızdan silinir.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: t.destructive }]}>•</Text>
                  <Text style={[styles.bulletText, { color: t.foreground }]}>
                    {"Katıldığınız gruplardaki harcama geçmişiniz ve borç/alacak kayıtlarınız korunur ancak isminiz anonimleştirilir (\"Silinmiş Kullanıcı\")."}
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: t.destructive }]}>•</Text>
                  <Text style={[styles.bulletText, { color: t.foreground }]}>
                    Bu işlem geri alınamaz. Hesabınızı sildikten sonra aynı bilgilerle sisteme tekrar giriş yapamaz veya verilerinizi kurtaramazsınız.
                  </Text>
                </View>
              </View>

              <Button
                variant="destructive"
                onPress={() => setStep('password')}
                style={styles.actionBtn}
              >
                Anladım, Şifre Adımına Geç
              </Button>
            </View>
          ) : (
            /* ADIM 2: ŞİFRE DOĞRULAMA VE ONAY */
            <View style={styles.content}>
              <Text style={[styles.formTitle, { color: t.foreground }]}>
                Güvenliğiniz için şifrenizi doğrulayın
              </Text>
              <Text style={[styles.formDesc, { color: t.mutedForeground }]}>
                Hesabınızı kalıcı olarak silmek için lütfen mevcut şifrenizi girerek onaylayın.
              </Text>

              <Input
                label="Mevcut Şifreniz"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordError ?? undefined}
              />

              <Button
                variant="destructive"
                loading={loading}
                disabled={!password.trim()}
                onPress={handleDelete}
                style={styles.actionBtn}
              >
                Hesabımı Kalıcı Olarak Sil
              </Button>
            </View>
          )}
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    gap: Spacing.five,
  },
  warnIconWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  warnIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  warnDesc: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  bulletList: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bulletPoint: {
    fontSize: 18,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formDesc: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  actionBtn: {
    marginTop: Spacing.four,
  },
});
