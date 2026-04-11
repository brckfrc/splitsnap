/**
 * Group operations for UI. Persisted via Supabase (`groups-supabase`).
 */

import { createGroupRemote, joinGroupByInviteCodeRemote, loadGroupsFromSupabase } from '@/services/groups-supabase';
import type { Group } from '@/types';

export const groupsService = {
  async create(input: { name: string; description?: string; ownerId: string }): Promise<Group> {
    const group = await createGroupRemote(input);
    await loadGroupsFromSupabase();
    return group;
  },

  async joinByInviteCode(inviteCode: string): Promise<void> {
    await joinGroupByInviteCodeRemote(inviteCode);
    await loadGroupsFromSupabase();
  },

  async refresh(): Promise<void> {
    await loadGroupsFromSupabase();
  },
};
