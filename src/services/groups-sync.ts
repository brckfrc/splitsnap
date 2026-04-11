import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

import { loadGroupsFromSupabase } from './groups-supabase';

const CHANNEL = 'splitsnap-groups-sync';

let channel: ReturnType<typeof supabase.channel> | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastAppState: AppStateStatus = AppState.currentState;

function teardownChannel() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
}

function scheduleReload() {
  void loadGroupsFromSupabase().catch(() => {});
}

export function stopGroupsBackgroundSync() {
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
    await loadGroupsFromSupabase();
  } catch {
    /* empty store on failure */
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
