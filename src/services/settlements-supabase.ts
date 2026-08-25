import { supabase } from '@/lib/supabase';
import { mapProfileToUser, unwrapProfile, type ProfileRow } from '@/services/profile-mapper';
import type { Settlement } from '@/types';
import { parseNumeric } from '@/utils/numeric';

type SettlementRow = {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: string | number;
  note: string | null;
  created_at: string;
  deleted_at: string | null;
  from_profile: ProfileRow | ProfileRow[] | null;
  to_profile: ProfileRow | ProfileRow[] | null;
};

export async function fetchSettlementsForGroup(groupId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      from_profile:profiles!settlements_from_user_id_fkey(id, display_name, avatar_url),
      to_profile:profiles!settlements_to_user_id_fkey(id, display_name, avatar_url)
    `)
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchSettlementsForGroup error:', error);
    throw error;
  }

  return ((data ?? []) as SettlementRow[]).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    fromUser: mapProfileToUser(row.from_user_id, unwrapProfile(row.from_profile)),
    toUser: mapProfileToUser(row.to_user_id, unwrapProfile(row.to_profile)),
    amount: parseNumeric(row.amount),
    note: row.note ?? undefined,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }));
}

export async function createSettlementRemote(input: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note?: string;
}) {
  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id: input.groupId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      amount: input.amount,
      note: input.note,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createSettlementRemote error:', error);
    throw error;
  }

  return data.id;
}
