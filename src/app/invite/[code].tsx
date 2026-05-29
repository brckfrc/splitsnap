/**
 * Universal-link deep link handler.
 *
 * Opened when the user taps:
 *   https://splitsnap.borak.dev/invite/<CODE>
 *
 * • Authenticated  → join group immediately → navigate to groups list.
 * • Unauthenticated → persist code in MMKV → redirect to /login.
 *   After login, groups/index.tsx picks up the pending code and joins.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Toast from 'react-native-toast-message';

import { href } from '@/lib/href';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { groupsService } from '@/services/groups';
import { reloadGroupsAndExpenses } from '@/services/groups-sync';
import { pendingInviteStore } from '@/stores/pending-invite-store';

export default function InviteDeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, initializing } = useAuth();
  const t = useTheme();
  const handled = useRef(false);

  useEffect(() => {
    if (initializing || handled.current) return;
    if (!code) {
      router.replace(href('/'));
      return;
    }

    const inviteCode = Array.isArray(code) ? code[0] : code;

    if (!user) {
      // Not logged in — save code, go to login.
      pendingInviteStore.set(inviteCode);
      router.replace(href('/login'));
      return;
    }

    // Logged in — join immediately.
    handled.current = true;
    groupsService
      .joinByInviteCode(inviteCode)
      .then(() => reloadGroupsAndExpenses())
      .then(() => {
        Toast.show({ type: 'success', text1: 'Gruba katıldınız 🎉' });
        router.replace(href('/(app)/groups'));
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Gruba katılınamadı.';
        // "already member" is not an error worth showing
        if (!msg.includes('already')) {
          Toast.show({ type: 'error', text1: msg });
        }
        router.replace(href('/(app)/groups'));
      });
  }, [initializing, user, code]);

  return (
    <View style={[styles.center, { backgroundColor: t.background }]}>
      <ActivityIndicator size="large" color={t.primary} />
      <Text style={[styles.label, { color: t.mutedForeground }]}>Davet işleniyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  label: { fontSize: 15 },
});
