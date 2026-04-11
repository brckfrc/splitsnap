import { create } from 'zustand';

import { buildEmptySplitStateForUser } from '@/data/mock-split-seed';
import type { Expense, ExpenseShare, Group, GroupMember, User } from '@/types';

function newEntityId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type SplitState = {
  users: User[];
  groups: Group[];
  groupMembers: GroupMember[];
  expenses: Expense[];
  expenseShares: ExpenseShare[];
  sessionUserId: string | null;
  resetForUser: (user: User) => void;
  clearSessionData: () => void;
  replaceGroupsAndMembers: (groups: Group[], groupMembers: GroupMember[]) => void;
  listGroupsForUser: (userId: string) => Group[];
  getGroup: (groupId: string) => Group | undefined;
  getMembers: (groupId: string) => GroupMember[];
  getExpenses: (groupId: string) => Expense[];
  getShares: (expenseId: string) => ExpenseShare[];
  addExpense: (input: {
    groupId: string;
    title: string;
    description?: string;
    amount: number;
    date: string;
    paidBy: string;
    splitType: 'equal' | 'manual';
    participantIds: string[];
    manualAmounts?: Record<string, number>;
    receiptImageUrl?: string;
  }) => Expense;
  updateExpense: (input: {
    expenseId: string;
    title: string;
    description?: string;
    amount: number;
    date: string;
  }) => void;
  deleteExpense: (expenseId: string) => void;
};

function userById(users: User[]): Record<string, User> {
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

export const useSplitDataStore = create<SplitState>((set, get) => ({
  users: [],
  groups: [],
  groupMembers: [],
  expenses: [],
  expenseShares: [],
  sessionUserId: null,

  resetForUser: (user) => {
    const next = buildEmptySplitStateForUser(user);
    set({
      ...next,
      sessionUserId: user.id,
    });
  },

  clearSessionData: () => {
    set({
      users: [],
      groups: [],
      groupMembers: [],
      expenses: [],
      expenseShares: [],
      sessionUserId: null,
    });
  },

  replaceGroupsAndMembers: (groups, groupMembers) => {
    const prev = get();
    const userMap = new Map<string, User>();
    for (const u of prev.users) {
      userMap.set(u.id, u);
    }
    for (const m of groupMembers) {
      userMap.set(m.userId, m.user);
    }
    for (const e of prev.expenses) {
      if (e.paidByUser) userMap.set(e.paidBy, e.paidByUser);
    }
    for (const sh of prev.expenseShares) {
      if (sh.user) userMap.set(sh.userId, sh.user);
    }
    if (prev.sessionUserId) {
      const self = prev.users.find((u) => u.id === prev.sessionUserId);
      if (self) userMap.set(self.id, self);
    }
    set({
      groups,
      groupMembers,
      users: Array.from(userMap.values()),
    });
  },

  listGroupsForUser: (userId) => {
    const { groups, groupMembers } = get();
    const ids = new Set(
      groupMembers.filter((m) => m.userId === userId && !m.leftAt).map((m) => m.groupId),
    );
    return groups.filter((g) => ids.has(g.id));
  },

  getGroup: (groupId) => get().groups.find((g) => g.id === groupId),

  getMembers: (groupId) => get().groupMembers.filter((m) => m.groupId === groupId),

  getExpenses: (groupId) => get().expenses.filter((e) => e.groupId === groupId),

  getShares: (expenseId) => get().expenseShares.filter((s) => s.expenseId === expenseId),

  addExpense: ({
    groupId,
    title,
    description,
    amount,
    date,
    paidBy,
    splitType,
    participantIds,
    manualAmounts,
    receiptImageUrl,
  }) => {
    const state = get();
    const byId = userById(state.users);
    const expenseId = newEntityId('e');
    const payer = byId[paidBy];
    const expense: Expense = {
      id: expenseId,
      groupId,
      title: title.trim(),
      description: description?.trim(),
      amount,
      date: new Date(date).toISOString(),
      paidBy,
      paidByUser: payer,
      splitType,
      receiptImageUrl,
    };

    let shares: ExpenseShare[] = [];
    if (splitType === 'equal' && participantIds.length > 0) {
      const each = amount / participantIds.length;
      shares = participantIds.map((userId) => ({
        expenseId,
        userId,
        user: byId[userId],
        amount: each,
      }));
    } else if (splitType === 'manual' && manualAmounts) {
      shares = participantIds
        .map((userId) => {
          const shareAmount = manualAmounts[userId] ?? 0;
          return {
            expenseId,
            userId,
            user: byId[userId],
            amount: shareAmount,
          };
        })
        .filter((s) => s.amount > 0);
    }

    set((s) => ({
      expenses: [...s.expenses, expense],
      expenseShares: [...s.expenseShares, ...shares],
    }));
    return expense;
  },

  updateExpense: ({ expenseId, title, description, amount, date }) => {
    set((s) => {
      const expenses = s.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              title: title.trim(),
              description: description?.trim(),
              amount,
              date: new Date(date).toISOString(),
            }
          : e,
      );
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return s;
      const byId = userById(s.users);
      let expenseShares = s.expenseShares;
      if (expense.splitType === 'equal') {
        const oldShares = s.expenseShares.filter((sh) => sh.expenseId === expenseId);
        const participantIds = oldShares.map((sh) => sh.userId);
        if (participantIds.length > 0) {
          const each = amount / participantIds.length;
          const nextSharesForExp = participantIds.map((userId) => ({
            expenseId,
            userId,
            user: byId[userId],
            amount: each,
          }));
          expenseShares = [...s.expenseShares.filter((sh) => sh.expenseId !== expenseId), ...nextSharesForExp];
        }
      }
      return { expenses, expenseShares };
    });
  },

  deleteExpense: (expenseId) => {
    set((s) => ({
      expenses: s.expenses.filter((e) => e.id !== expenseId),
      expenseShares: s.expenseShares.filter((sh) => sh.expenseId !== expenseId),
    }));
  },
}));
