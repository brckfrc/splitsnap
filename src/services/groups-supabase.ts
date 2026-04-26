import { supabase } from '@/lib/supabase';
import { mapProfileToUser, unwrapProfile, type ProfileRow } from '@/services/profile-mapper';
import { useSplitDataStore } from '@/stores/split-data-store';
import type { Group, GroupMember } from '@/types';

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  currency: string;
  invite_code: string;
  deleted_at: string | null;
};

type MemberRow = {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  profiles: ProfileRow | ProfileRow[] | null;
};

function mapGroupRow(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    inviteCode: row.invite_code,
    currency: row.currency,
    deletedAt: row.deleted_at,
  };
}

export async function fetchMyGroupsPayload(): Promise<{ groups: Group[]; groupMembers: GroupMember[] }> {
  const { data: groupRows, error: gErr } = await supabase
    .from('groups')
    .select('id, name, description, owner_id, created_at, currency, invite_code, deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (gErr) throw new Error(gErr.message);

  const rows = (groupRows ?? []) as GroupRow[];
  const groups = rows.map(mapGroupRow);

  if (rows.length === 0) {
    return { groups, groupMembers: [] };
  }

  const ids = rows.map((r) => r.id);
  const { data: memberRows, error: mErr } = await supabase
    .from('group_members')
    .select(
      'group_id, user_id, role, joined_at, left_at, profiles:user_id (display_name, email, avatar_url)',
    )
    .in('group_id', ids);

  if (mErr) throw new Error(mErr.message);

  const groupMembers: GroupMember[] = ((memberRows ?? []) as MemberRow[]).map((m) => {
    const prof = unwrapProfile(m.profiles);
    const user = mapProfileToUser(m.user_id, prof);
    const role = m.role === 'admin' ? 'admin' : 'member';
    return {
      groupId: m.group_id,
      userId: m.user_id,
      user,
      joinedAt: m.joined_at,
      leftAt: m.left_at,
      role,
    };
  });

  return { groups, groupMembers };
}

export async function loadGroupsFromSupabase(): Promise<void> {
  const payload = await fetchMyGroupsPayload();
  useSplitDataStore.getState().replaceGroupsAndMembers(payload.groups, payload.groupMembers);
}

export async function createGroupRemote(input: {
  name: string;
  description?: string;
  ownerId: string;
}): Promise<Group> {
  const name = input.name.trim();
  if (!name) throw new Error('empty_name');

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      description: input.description?.trim() || null,
      owner_id: input.ownerId,
    })
    .select('id, name, description, owner_id, created_at, currency, invite_code, deleted_at')
    .single();

  if (error) throw new Error(error.message);
  return mapGroupRow(data as GroupRow);
}

export function mapJoinRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid_invite_code')) {
    return 'Geçersiz davet kodu veya grup bulunamadı.';
  }
  return message || 'Gruba katılınamadı.';
}

export async function joinGroupByInviteCodeRemote(code: string): Promise<string> {
  const norm = code.trim().toUpperCase();
  if (!norm) throw new Error('empty_code');

  const { data, error } = await supabase.rpc('join_group_by_invite', { code: norm });

  if (error) {
    throw new Error(mapJoinRpcError(error.message));
  }
  if (typeof data !== 'string') {
    throw new Error('Gruba katılınamadı.');
  }
  return data;
}
