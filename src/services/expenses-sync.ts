import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';
import { loadExpensesForGroup } from '@/services/split-data';

const CHANNEL_PREFIX = 'splitsnap-expenses-sync-';

let channel: ReturnType<typeof supabase.channel> | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastAppState: AppStateStatus = AppState.currentState;
let activeGroupId: string | null = null;

function teardownChannel() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
}

function scheduleReload() {
  if (activeGroupId) {
    void loadExpensesForGroup(activeGroupId).catch(() => {});
  }
}

export function stopExpensesBackgroundSync() {
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  teardownChannel();
  activeGroupId = null;
}

/**
 * Initial fetch for one group, Realtime on `expenses` for that group_id, refetch on AppState active.
 */
export async function syncExpensesForGroup(groupId: string): Promise<void> {
  stopExpensesBackgroundSync();
  activeGroupId = groupId;
  lastAppState = AppState.currentState;

  try {
    await loadExpensesForGroup(groupId);
  } catch {
    /* keep previous store slice */
  }

  channel = supabase
    .channel(`${CHANNEL_PREFIX}${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `group_id=eq.${groupId}`,
      },
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
