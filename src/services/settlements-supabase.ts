import { supabase } from '@/lib/supabase';
import type { Settlement, User } from '@/types';

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

  return (data || []).map((row: any) => {
    const fromUser: User = {
      id: row.from_profile.id,
      name: row.from_profile.display_name,
      email: '',
      avatar: row.from_profile.avatar_url,
    };
    const toUser: User = {
      id: row.to_profile.id,
      name: row.to_profile.display_name,
      email: '',
      avatar: row.to_profile.avatar_url,
    };

    return {
      id: row.id,
      groupId: row.group_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      fromUser,
      toUser,
      amount: row.amount,
      note: row.note,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    };
  });
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
