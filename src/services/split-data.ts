/**
 * Split / group / expense data layer. Groups and members sync from Supabase (`groups-sync`);
 * expenses sync from Supabase (`expenses-sync` + `expenses-supabase`).
 */

import {
  createExpenseRemote,
  fetchExpensesForGroupPayload,
  fetchExpensesForGroupsPayload,
  softDeleteExpenseRemote,
  updateExpenseRemote,
} from '@/services/expenses-supabase';
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

export async function loadExpensesForGroup(groupId: string): Promise<void> {
  const payload = await fetchExpensesForGroupPayload(groupId);
  useSplitDataStore.getState().replaceExpensesAndSharesForGroup(groupId, payload.expenses, payload.expenseShares);
}

export async function loadExpensesForAllGroups(groupIds: string[]): Promise<void> {
  if (groupIds.length === 0) return;
  const payload = await fetchExpensesForGroupsPayload(groupIds);
  useSplitDataStore.getState().replaceAllExpensesAndShares(payload.expenses, payload.expenseShares);
}

export const splitData = {
  listGroupsForUser: (userId: string) => useSplitDataStore.getState().listGroupsForUser(userId),
  getGroup: (groupId: string) => useSplitDataStore.getState().getGroup(groupId),
  getMembers: (groupId: string) => useSplitDataStore.getState().getMembers(groupId),
  getExpenses: (groupId: string) => useSplitDataStore.getState().getExpenses(groupId),
  getShares: (expenseId: string) => useSplitDataStore.getState().getShares(expenseId),

  loadExpensesForGroup,

  addExpense: async (input: {
    groupId: string;
    title: string;
    description?: string;
    amount: number;
    date: string;
    paidBy: string;
    createdBy: string;
    splitType: 'equal' | 'manual';
    participantIds: string[];
    manualAmounts?: Record<string, number>;
  }) => {
    const {
      groupId,
      title,
      description,
      amount,
      date,
      paidBy,
      createdBy,
      splitType,
      participantIds,
      manualAmounts,
    } = input;

    let shares: { userId: string; amount: number }[] = [];
    if (splitType === 'equal' && participantIds.length > 0) {
      const each = amount / participantIds.length;
      shares = participantIds.map((userId) => ({ userId, amount: each }));
    } else if (splitType === 'manual' && manualAmounts) {
      shares = participantIds
        .map((userId) => {
          const shareAmount = manualAmounts[userId] ?? 0;
          return { userId, amount: shareAmount };
        })
        .filter((s) => s.amount > 0);
    }

    await createExpenseRemote({
      groupId,
      title,
      description,
      amount,
      expenseDate: date,
      paidBy,
      createdBy,
      splitType,
      shares,
    });
    await loadExpensesForGroup(groupId);
  },

  updateExpense: async (input: {
    expenseId: string;
    groupId: string;
    title: string;
    description?: string;
    amount: number;
    date: string;
  }) => {
    const exp = useSplitDataStore.getState().expenses.find((e) => e.id === input.expenseId);
    if (!exp) throw new Error('expense_not_found');
    await updateExpenseRemote({
      expenseId: input.expenseId,
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      amount: input.amount,
      expenseDate: input.date,
      splitType: exp.splitType,
    });
    await loadExpensesForGroup(input.groupId);
  },

  deleteExpense: async (expenseId: string, groupId: string) => {
    await softDeleteExpenseRemote(expenseId);
    await loadExpensesForGroup(groupId);
  },
};

export { useSplitDataStore };
