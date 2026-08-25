/**
 * Shared profile mapping utilities for Supabase row → domain model conversion.
 * Used by groups-supabase.ts and expenses-supabase.ts.
 */

import type { User } from '@/types';

export type ProfileRow = {
  display_name: string;
  email: string | null;
  avatar_url: string | null;
};

export function mapProfileToUser(userId: string, p: ProfileRow | null | undefined): User {
  if (!p) {
    return { id: userId, name: 'Kullanıcı', email: '', avatar: '👤' };
  }
  return {
    id: userId,
    name: p.display_name || 'Kullanıcı',
    email: p.email ?? '',
    avatar: p.avatar_url ?? '👤',
  };
}

export function unwrapProfile<T extends ProfileRow>(
  profiles: T | T[] | null | undefined,
): T | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}
