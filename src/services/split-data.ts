/**
 * Split / group / expense data layer. Groups and members sync from Supabase (`groups-sync`);
 * expenses remain local Zustand until later migrations.
 */

import { useSplitDataStore } from '@/stores/split-data-store';
import type { User } from '@/types';

export function ensureSplitDataForUser(user: User) {
  const { sessionUserId, resetForUser } = useSplitDataStore.getState();
  if (sessionUserId !== user.id) {
    resetForUser(user);
  }
}

export function clearSplitSessionData() {
  useSplitDataStore.getState().clearSessionData();
}

export const splitData = {
  listGroupsForUser: (userId: string) => useSplitDataStore.getState().listGroupsForUser(userId),
  getGroup: (groupId: string) => useSplitDataStore.getState().getGroup(groupId),
  getMembers: (groupId: string) => useSplitDataStore.getState().getMembers(groupId),
  getExpenses: (groupId: string) => useSplitDataStore.getState().getExpenses(groupId),
  getShares: (expenseId: string) => useSplitDataStore.getState().getShares(expenseId),
  addExpense: (input: Parameters<ReturnType<typeof useSplitDataStore.getState>['addExpense']>[0]) =>
    useSplitDataStore.getState().addExpense(input),
  updateExpense: (input: Parameters<ReturnType<typeof useSplitDataStore.getState>['updateExpense']>[0]) =>
    useSplitDataStore.getState().updateExpense(input),
  deleteExpense: (expenseId: string) => useSplitDataStore.getState().deleteExpense(expenseId),
};

export { useSplitDataStore };
