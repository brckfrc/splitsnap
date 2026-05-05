import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';
import { refreshEmojiMap } from '@/services/emoji-map-service';
import { loadExpensesForAllGroups } from '@/services/split-data';
import { useSplitDataStore } from '@/stores/split-data-store';
import type { User } from '@/types';

import { loadGroupsFromSupabase } from './groups-supabase';

const CHANNEL = 'splitsnap-groups-sync';

let channel: ReturnType<typeof supabase.channel> | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastAppState: AppStateStatus = AppState.currentState;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;

function teardownChannel() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
}

export async function reloadGroupsAndExpenses() {
  await loadGroupsFromSupabase();
  const groupIds = useSplitDataStore.getState().groups.map((g) => g.id);
  await loadExpensesForAllGroups(groupIds);
  // Refresh dynamic emoji map in background (non-blocking)
  refreshEmojiMap().catch(() => {});
}

function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    void reloadGroupsAndExpenses().catch(() => {});
  }, 300);
}

export function stopGroupsBackgroundSync() {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
    reloadTimer = null;
  }
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  teardownChannel();
}

/**
 * Initial fetch, Realtime on `groups` / `group_members`, refetch on AppState active and on resubscribe.
 */
export async function syncGroupsForSessionUser(_profile: User): Promise<void> {
  stopGroupsBackgroundSync();
  lastAppState = AppState.currentState;

  try {
    await reloadGroupsAndExpenses();
  } catch {
    /* keep previous store data on failure */
  }

  channel = supabase
    .channel(CHANNEL)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'groups' },
      () => scheduleReload(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'group_members' },
      () => scheduleReload(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        scheduleReload();
      }
    });

  appStateSub = AppState.addEventListener('change', (next) => {
    if (lastAppState.match(/inactive|background/) && next === 'active') {
      scheduleReload();
    }
    lastAppState = next;
  });
}
