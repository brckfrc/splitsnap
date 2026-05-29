import { ChevronRight, Key, LogOut, Monitor, Moon, Sun, Trash2, User as UserIcon } from '@/lib/icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount } from '@/services/account';
import { useAppSettingsStore, type AppThemeMode } from '@/stores/app-settings-store';

export default function ProfileScreen() {
  const t = useTheme();
  const { user, signOutApp } = useAuth();
  const { themeMode, setThemeMode } = useAppSettingsStore();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınız ve kişisel bilgileriniz kalıcı olarak silinecek. Gruplardaki ortak harcama kayıtları "Silinmiş Kullanıcı" olarak korunur. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam Et',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Son Onay', 'Hesabınız silinecek ve tekrar giriş yapamayacaksınız. Emin misiniz?', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Hesabı Sil',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                    await signOutApp();
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Hesap silinemedi.';
                    Alert.alert('Hata', msg);
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const handleThemePress = () => {
    const options = ['İptal', 'Cihaz Ayarı (Sistem)', 'Açık', 'Koyu'];
    const actions: AppThemeMode[] = ['system', 'system', 'light', 'dark'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Uygulama Teması',
          message: 'Uygulamanın genel görünümünü seçin.',
        },
        (buttonIndex) => {
          if (buttonIndex !== 0) {
            setThemeMode(actions[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert('Uygulama Teması', 'Uygulamanın genel görünümünü seçin.', [
        { text: 'Cihaz Ayarı', onPress: () => setThemeMode('system') },
        { text: 'Açık', onPress: () => setThemeMode('light') },
        { text: 'Koyu', onPress: () => setThemeMode('dark') },
        { text: 'İptal', style: 'cancel' },
      ]);
    }
  };

  const themeLabel = themeMode === 'light' ? 'Açık' : themeMode === 'dark' ? 'Koyu' : 'Sistem';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
          Profil
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET + Spacing.five }]}>
        {/* AVATAR & INFO HEADER */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: t.secondary, borderColor: t.border }]}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: t.secondaryForeground, letterSpacing: 1 }}>
              {(() => {
                const parts = (user?.name ?? '').trim().split(/\s+/).filter(Boolean);
                if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                return parts[0]?.[0]?.toUpperCase() ?? '?';
              })()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: t.foreground }]}>{user?.name ?? 'Kullanıcı'}</Text>
          <Text style={[styles.userEmail, { color: t.mutedForeground }]}>{user?.email ?? 'E-posta tanımlı değil'}</Text>
        </View>

        {/* HESAP (ACCOUNT) */}
        <Text style={[styles.sectionTitle, { color: t.mutedForeground }]}>HESAP</Text>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Pressable
            style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: t.accent }]}
            onPress={() => router.push('/edit-profile' as never)}
          >
            <View style={[styles.iconBox, { backgroundColor: t.primary }]}>
              <UserIcon size={16} color={t.primaryForeground} />
            </View>
            <Text style={[styles.listLabel, { color: t.foreground }]}>Kişisel Bilgiler</Text>
            <ChevronRight size={18} color={t.mutedForeground} style={styles.chevron} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          <Pressable
            style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: t.accent }]}
            onPress={() => router.push('/change-password' as never)}
          >
            <View style={[styles.iconBox, { backgroundColor: t.primary }]}>
              <Key size={16} color={t.primaryForeground} />
            </View>
            <Text style={[styles.listLabel, { color: t.foreground }]}>Şifre Değiştir</Text>
            <ChevronRight size={18} color={t.mutedForeground} style={styles.chevron} />
          </Pressable>
        </Card>

        {/* UYGULAMA (APP SETTINGS) */}
        <Text style={[styles.sectionTitle, { color: t.mutedForeground, marginTop: Spacing.four }]}>UYGULAMA</Text>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Pressable
            style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: t.accent }]}
            onPress={handleThemePress}
          >
            <View style={[styles.iconBox, { backgroundColor: t.foreground }]}>
              {themeMode === 'light' ? (
                <Sun size={16} color={t.background} />
              ) : themeMode === 'dark' ? (
                <Moon size={16} color={t.background} />
              ) : (
                <Monitor size={16} color={t.background} />
              )}
            </View>
            <Text style={[styles.listLabel, { color: t.foreground }]}>Tema</Text>
            <Text style={[styles.listValue, { color: t.mutedForeground }]}>{themeLabel}</Text>
            <ChevronRight size={18} color={t.mutedForeground} style={styles.chevron} />
          </Pressable>
        </Card>

        {/* TEHLİKELİ ALAN (DANGER ZONE) */}
        <Text style={[styles.sectionTitle, { color: t.mutedForeground, marginTop: Spacing.four }]}>GÜVENLİK</Text>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Pressable
            style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: `${t.destructive}1A` }]}
            onPress={() => {
              Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: () => void signOutApp() },
              ]);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: t.destructive }]}>
              <LogOut size={16} color={t.destructiveForeground} />
            </View>
            <Text style={[styles.listLabel, { color: t.destructive, fontWeight: '600' }]}>Çıkış Yap</Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          <Pressable
            disabled={deleting}
            style={({ pressed }) => [
              styles.listItem,
              pressed && { backgroundColor: `${t.destructive}1A` },
              deleting && { opacity: 0.5 },
            ]}
            onPress={handleDeleteAccount}
          >
            <View style={[styles.iconBox, { backgroundColor: t.destructive }]}>
              <Trash2 size={16} color={t.destructiveForeground} />
            </View>
            <Text style={[styles.listLabel, { color: t.destructive, fontWeight: '600' }]}>
              {deleting ? 'Hesap Siliniyor…' : 'Hesabı Sil'}
            </Text>
          </Pressable>
        </Card>
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
  },
  title: { fontSize: 24, fontWeight: '800' },
  body: { padding: Spacing.five, paddingBottom: Spacing.seven },
  
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
    letterSpacing: 0.5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  listLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  listValue: {
    fontSize: 16,
    marginRight: Spacing.one,
  },
  chevron: {
    opacity: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52, // icon width + margin
  },
});
