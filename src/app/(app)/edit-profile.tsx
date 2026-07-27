import { ArrowLeft, Trash2 } from '@/lib/icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { validateDisplayName } from '@/utils/validation';

export default function EditProfileScreen() {
  const t = useTheme();
  const { user, refreshSession } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSave() {
    setNameError(null);
    const trimmed = name.trim();

    const nameErr = validateDisplayName(name);
    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      if (error) {
        setNameError(error.message);
        return;
      }

      await refreshSession();

      Toast.show({
        type: 'success',
        text1: 'Profil Güncellendi',
        text2: 'İsminiz başarıyla değiştirildi.',
        position: 'bottom',
      });

      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bir hata oluştu.';
      setNameError(msg);
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
          Kişisel Bilgiler
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
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: t.secondary, borderColor: t.border }]}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: t.secondaryForeground, letterSpacing: 1 }}>
                {(() => {
                  const parts = name.trim().split(/\s+/).filter(Boolean);
                  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  return parts[0]?.[0]?.toUpperCase() ?? '?';
                })()}
              </Text>
            </View>
          </View>

          <Input
            label="Ad Soyad"
            value={name}
            onChangeText={setName}
            placeholder="Ahmet Yılmaz"
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            error={nameError ?? undefined}
          />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: t.mutedForeground }]}>E-posta</Text>
            <Text style={[styles.infoValue, { color: t.foreground }]}>{user?.email ?? '—'}</Text>
          </View>



          <Button
            loading={loading}
            onPress={onSave}
            accessibilityLabel="Değişiklikleri kaydet"
            style={{ marginTop: Spacing.four }}
          >
            Kaydet
          </Button>

          <View style={[styles.dangerDivider, { backgroundColor: t.border }]} />

          <Text style={[styles.dangerLabel, { color: t.mutedForeground }]}>TEHLİKELİ ALAN</Text>
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && { backgroundColor: `${t.destructive}1A` },
            ]}
            onPress={() => router.push('/delete-account' as never)}
          >
            <Trash2 size={16} color={t.destructive} />
            <Text style={[styles.deleteBtnText, { color: t.destructive }]}>
              Hesabı Kapat ve Sil
            </Text>
          </Pressable>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 16,
  },
  dangerDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.four,
    marginTop: Spacing.six,
  },
  dangerLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#ff453a33', // faint red border
    paddingVertical: Spacing.three,
    borderRadius: 12,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
