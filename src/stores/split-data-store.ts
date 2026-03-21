import { create } from 'zustand';

import { buildInitialSplitStateForUser } from '@/data/mock-split-seed';
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
  listGroupsForUser: (userId: string) => Group[];
  getGroup: (groupId: string) => Group | undefined;
  getMembers: (groupId: string) => GroupMember[];
  getExpenses: (groupId: string) => Expense[];
  getShares: (expenseId: string) => ExpenseShare[];
  createGroup: (input: { name: string; description?: string; ownerId: string; owner: User }) => Group;
  joinGroup: (input: { groupId: string; user: User }) => boolean;
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
    const next = buildInitialSplitStateForUser(user);
    set({
      ...next,
      sessionUserId: user.id,
    });
  },

  listGroupsForUser: (userId) => {
    const { groups, groupMembers } = get();
    const ids = new Set(groupMembers.filter((m) => m.userId === userId).map((m) => m.groupId));
    return groups.filter((g) => ids.has(g.id));
  },

  getGroup: (groupId) => get().groups.find((g) => g.id === groupId),

  getMembers: (groupId) => get().groupMembers.filter((m) => m.groupId === groupId),

  getExpenses: (groupId) => get().expenses.filter((e) => e.groupId === groupId),

  getShares: (expenseId) => get().expenseShares.filter((s) => s.expenseId === expenseId),

  createGroup: ({ name, description, ownerId, owner }) => {
    const id = newEntityId('g');
    const group: Group = {
      id,
      name: name.trim(),
      description: description?.trim(),
      createdAt: new Date().toISOString(),
      ownerId,
    };
    const member: GroupMember = {
      groupId: id,
      userId: ownerId,
      user: owner,
      joinedAt: new Date().toISOString(),
    };
    set((s) => ({
      groups: [...s.groups, group],
      groupMembers: [...s.groupMembers, member],
      users: s.users.some((u) => u.id === owner.id) ? s.users : [...s.users, owner],
    }));
    return group;
  },

  joinGroup: ({ groupId, user }) => {
    const state = get();
    if (!state.groups.some((g) => g.id === groupId)) return false;
    if (state.groupMembers.some((m) => m.groupId === groupId && m.userId === user.id)) return true;
    const member: GroupMember = {
      groupId,
      userId: user.id,
      user,
      joinedAt: new Date().toISOString(),
    };
    set((s) => ({
      groupMembers: [...s.groupMembers, member],
      users: s.users.some((u) => u.id === user.id) ? s.users : [...s.users, user],
    }));
    return true;
  },

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
