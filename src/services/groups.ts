/**
 * Group operations. UI should depend on this module; implementation is mock-backed
 * via splitData until Supabase `groups` / `group_members` tables + RLS are wired.
 */

import { splitData } from '@/services/split-data';
import type { Group, User } from '@/types';

export const groupsService = {
  listForUser: (userId: string): Group[] => splitData.listGroupsForUser(userId),
  get: (groupId: string) => splitData.getGroup(groupId),
  create: (input: { name: string; description?: string; ownerId: string; owner: User }) =>
    splitData.createGroup(input),
  join: (input: { groupId: string; user: User }) => splitData.joinGroup(input),
};
