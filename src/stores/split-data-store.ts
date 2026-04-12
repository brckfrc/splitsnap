import { create } from 'zustand';

import { buildEmptySplitStateForUser } from '@/data/mock-split-seed';
import type { Expense, ExpenseShare, Group, GroupMember, User } from '@/types';

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
  replaceExpensesAndSharesForGroup: (groupId: string, expenses: Expense[], expenseShares: ExpenseShare[]) => void;
  replaceAllExpensesAndShares: (expenses: Expense[], expenseShares: ExpenseShare[]) => void;
  listGroupsForUser: (userId: string) => Group[];
  getGroup: (groupId: string) => Group | undefined;
  getMembers: (groupId: string) => GroupMember[];
  getExpenses: (groupId: string) => Expense[];
  getShares: (expenseId: string) => ExpenseShare[];
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

  replaceExpensesAndSharesForGroup: (groupId, expenses, expenseShares) => {
    const prev = get();
    const userMap = new Map<string, User>();
    for (const u of prev.users) {
      userMap.set(u.id, u);
    }
    for (const m of prev.groupMembers) {
      userMap.set(m.userId, m.user);
    }
    for (const e of expenses) {
      if (e.paidByUser) userMap.set(e.paidBy, e.paidByUser);
    }
    for (const sh of expenseShares) {
      if (sh.user) userMap.set(sh.userId, sh.user);
    }
    for (const e of prev.expenses) {
      if (e.groupId !== groupId && e.paidByUser) userMap.set(e.paidBy, e.paidByUser);
    }
    for (const sh of prev.expenseShares) {
      const exp = prev.expenses.find((x) => x.id === sh.expenseId);
      if (exp && exp.groupId !== groupId && sh.user) userMap.set(sh.userId, sh.user);
    }
    if (prev.sessionUserId) {
      const self = prev.users.find((u) => u.id === prev.sessionUserId);
      if (self) userMap.set(self.id, self);
    }

    const oldIds = new Set(prev.expenses.filter((e) => e.groupId === groupId).map((e) => e.id));

    set({
      expenses: [...prev.expenses.filter((e) => e.groupId !== groupId), ...expenses],
      expenseShares: [
        ...prev.expenseShares.filter((sh) => !oldIds.has(sh.expenseId)),
        ...expenseShares,
      ],
      users: Array.from(userMap.values()),
    });
  },

  replaceAllExpensesAndShares: (expenses, expenseShares) => {
    const prev = get();
    const userMap = new Map<string, User>();
    for (const u of prev.users) userMap.set(u.id, u);
    for (const m of prev.groupMembers) userMap.set(m.userId, m.user);
    for (const e of expenses) {
      if (e.paidByUser) userMap.set(e.paidBy, e.paidByUser);
    }
    for (const sh of expenseShares) {
      if (sh.user) userMap.set(sh.userId, sh.user);
    }
    if (prev.sessionUserId) {
      const self = prev.users.find((u) => u.id === prev.sessionUserId);
      if (self) userMap.set(self.id, self);
    }
    set({
      expenses,
      expenseShares,
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
}));

export { userById };
