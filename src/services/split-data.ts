/**
 * Split / group / expense data layer. Mock-backed Zustand store today;
 * swap internals for Supabase-backed calls when DB + RLS are ready.
 */

import { useSplitDataStore } from '@/stores/split-data-store';
import type { User } from '@/types';

export function ensureSplitDataForUser(user: User) {
  const { sessionUserId, resetForUser } = useSplitDataStore.getState();
  if (sessionUserId !== user.id) {
    resetForUser(user);
  }
}

export const splitData = {
  listGroupsForUser: (userId: string) => useSplitDataStore.getState().listGroupsForUser(userId),
  getGroup: (groupId: string) => useSplitDataStore.getState().getGroup(groupId),
  getMembers: (groupId: string) => useSplitDataStore.getState().getMembers(groupId),
  getExpenses: (groupId: string) => useSplitDataStore.getState().getExpenses(groupId),
  getShares: (expenseId: string) => useSplitDataStore.getState().getShares(expenseId),
  createGroup: (input: { name: string; description?: string; ownerId: string; owner: User }) =>
    useSplitDataStore.getState().createGroup(input),
  joinGroup: (input: { groupId: string; user: User }) => useSplitDataStore.getState().joinGroup(input),
  addExpense: (input: Parameters<ReturnType<typeof useSplitDataStore.getState>['addExpense']>[0]) =>
    useSplitDataStore.getState().addExpense(input),
  updateExpense: (input: Parameters<ReturnType<typeof useSplitDataStore.getState>['updateExpense']>[0]) =>
    useSplitDataStore.getState().updateExpense(input),
  deleteExpense: (expenseId: string) => useSplitDataStore.getState().deleteExpense(expenseId),
};

export { useSplitDataStore };
