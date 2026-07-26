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
import { fetchSettlementsForGroup, createSettlementRemote } from '@/services/settlements-supabase';
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
  const settlements = await fetchSettlementsForGroup(groupId);
  useSplitDataStore
    .getState()
    .replaceExpensesAndSharesForGroup(
      groupId,
      payload.expenses,
      payload.expenseShares,
      payload.expensePayers,
      settlements,
    );
}

export async function loadExpensesForAllGroups(groupIds: string[]): Promise<void> {
  if (groupIds.length === 0) return;
  const payload = await fetchExpensesForGroupsPayload(groupIds);
  const settlementsLists = await Promise.all(groupIds.map((id) => fetchSettlementsForGroup(id)));
  const settlements = settlementsLists.flat();
  useSplitDataStore
    .getState()
    .replaceAllExpensesAndShares(
      payload.expenses,
      payload.expenseShares,
      payload.expensePayers,
      settlements,
    );
}

export const splitData = {
  listGroupsForUser: (userId: string) => useSplitDataStore.getState().listGroupsForUser(userId),
  getGroup: (groupId: string) => useSplitDataStore.getState().getGroup(groupId),
  getMembers: (groupId: string) => useSplitDataStore.getState().getMembers(groupId),
  getExpenses: (groupId: string) => useSplitDataStore.getState().getExpenses(groupId),
  getShares: (expenseId: string) => useSplitDataStore.getState().getShares(expenseId),
  getPayers: (expenseId: string) => useSplitDataStore.getState().getPayers(expenseId),
  getSettlements: (groupId: string) => useSplitDataStore.getState().getSettlements(groupId),

  loadExpensesForGroup,

  addExpense: async (input: {
    groupId: string;
    title: string;
    description?: string;
    amount: number;
    date: string;
    paidBy?: string;
    createdBy: string;
    splitType: 'equal' | 'manual';
    icon?: string | null;
    participantIds: string[];
    manualAmounts?: Record<string, number>;
    payerAmounts?: Record<string, number>;
    receiptStoragePath?: string | null;
    ocrSuggestions?: { merchantName?: string; date?: string; total?: number } | null;
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
      icon,
      participantIds,
      manualAmounts,
      payerAmounts,
      receiptStoragePath,
      ocrSuggestions,
    } = input;

    let shares: { userId: string; amount: number }[] = [];
    if (splitType === 'equal' && participantIds.length > 0) {
      const n = participantIds.length;
      const base = Math.floor((amount / n) * 100) / 100;
      const remainder = Math.round((amount - base * n) * 100) / 100;
      shares = participantIds.map((userId, i) => ({
        userId,
        amount: i === 0 ? base + remainder : base,
      }));
    } else if (splitType === 'manual' && manualAmounts) {
      shares = participantIds
        .map((userId) => {
          const shareAmount = manualAmounts[userId] ?? 0;
          return { userId, amount: shareAmount };
        })
        .filter((s) => s.amount > 0);
    }

    let payers: { userId: string; amount: number }[] = [];
    if (payerAmounts && Object.keys(payerAmounts).length > 0) {
      payers = Object.entries(payerAmounts)
        .map(([userId, payerAmount]) => ({ userId, amount: payerAmount }))
        .filter((p) => p.amount > 0);
    } else if (paidBy) {
      payers = [{ userId: paidBy, amount }];
    }
    if (payers.length === 0) {
      payers = [{ userId: paidBy || createdBy, amount }];
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
      icon,
      shares,
      payers,
      receiptStoragePath,
      ocrSuggestions,
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
    icon?: string | null;
    splitType: 'equal' | 'manual';
    participantIds: string[];
    manualAmounts?: Record<string, number>;
    payerAmounts?: Record<string, number>;
    receiptStoragePath?: string | null;
    ocrSuggestions?: { merchantName?: string; date?: string; total?: number } | null;
  }) => {
    const exp = useSplitDataStore.getState().expenses.find((e) => e.id === input.expenseId);
    if (!exp) throw new Error('expense_not_found');

    let shares: { userId: string; amount: number }[] = [];
    if (input.splitType === 'equal' && input.participantIds.length > 0) {
      const n = input.participantIds.length;
      const base = Math.floor((input.amount / n) * 100) / 100;
      const remainder = Math.round((input.amount - base * n) * 100) / 100;
      shares = input.participantIds.map((userId, i) => ({
        userId,
        amount: i === 0 ? base + remainder : base,
      }));
    } else if (input.splitType === 'manual' && input.manualAmounts) {
      shares = input.participantIds
        .map((userId) => {
          const shareAmount = input.manualAmounts![userId] ?? 0;
          return { userId, amount: shareAmount };
        })
        .filter((s) => s.amount > 0);
    }

    let payers: { userId: string; amount: number }[] = [];
    if (input.payerAmounts && Object.keys(input.payerAmounts).length > 0) {
      payers = Object.entries(input.payerAmounts)
        .map(([userId, payerAmount]) => ({ userId, amount: payerAmount }))
        .filter((p) => p.amount > 0);
    } else {
      const oldPayers = useSplitDataStore.getState().getPayers(input.expenseId);
      if (oldPayers.length > 0) {
        const totalOld = oldPayers.reduce((s, p) => s + p.amount, 0);
        if (Math.abs(totalOld - input.amount) > 0.01 && totalOld > 0) {
          payers = oldPayers.map((p) => ({
            userId: p.userId,
            amount: Math.round((p.amount / totalOld) * input.amount * 100) / 100,
          }));
          const newSum = payers.reduce((s, p) => s + p.amount, 0);
          const remainder = Math.round((input.amount - newSum) * 100) / 100;
          if (payers.length > 0) {
            payers[0].amount += remainder;
          }
        } else {
          payers = oldPayers.map((p) => ({ userId: p.userId, amount: p.amount }));
        }
      } else {
        const selfId = useSplitDataStore.getState().sessionUserId || '';
        payers = [{ userId: selfId, amount: input.amount }];
      }
    }

    await updateExpenseRemote({
      expenseId: input.expenseId,
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      amount: input.amount,
      expenseDate: input.date,
      splitType: input.splitType,
      icon: input.icon,
      shares,
      payers,
      receiptStoragePath: input.receiptStoragePath,
      ocrSuggestions: input.ocrSuggestions,
    });
    await loadExpensesForGroup(input.groupId);
  },

  deleteExpense: async (expenseId: string, groupId: string) => {
    await softDeleteExpenseRemote(expenseId);
    await loadExpensesForGroup(groupId);
  },

  addSettlement: async (input: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    note?: string;
  }) => {
    await createSettlementRemote(input);
    await loadExpensesForGroup(input.groupId);
  },
};

export { useSplitDataStore };
