import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { buildEmptySplitStateForUser } from '@/data/mock-split-seed';
import { zustandMMKVStorage } from '@/lib/storage';
import type { Expense, ExpenseShare, Group, GroupMember, Settlement, User } from '@/types';

type SplitState = {
  users: User[];
  groups: Group[];
  groupMembers: GroupMember[];
  expenses: Expense[];
  expenseShares: ExpenseShare[];
  settlements: Settlement[];
  sessionUserId: string | null;
  /** True once MMKV rehydration is complete. */
  _hydrated: boolean;
  resetForUser: (user: User) => void;
  clearSessionData: () => void;
  replaceGroupsAndMembers: (groups: Group[], groupMembers: GroupMember[]) => void;
  replaceExpensesAndSharesForGroup: (groupId: string, expenses: Expense[], expenseShares: ExpenseShare[], settlements: Settlement[]) => void;
  replaceAllExpensesAndShares: (expenses: Expense[], expenseShares: ExpenseShare[], settlements: Settlement[]) => void;
  listGroupsForUser: (userId: string) => Group[];
  getGroup: (groupId: string) => Group | undefined;
  getMembers: (groupId: string) => GroupMember[];
  getExpenses: (groupId: string) => Expense[];
  getShares: (expenseId: string) => ExpenseShare[];
  getSettlements: (groupId: string) => Settlement[];
};

function userById(users: User[]): Record<string, User> {
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

/**
 * Promise that resolves once the store has been rehydrated from MMKV.
 * Used by the splash gate to avoid showing a blank screen.
 */
let _resolveHydration: () => void;
export const storeHydrated = new Promise<void>((resolve) => {
  _resolveHydration = resolve;
});

export const useSplitDataStore = create<SplitState>()(persist((set, get) => ({
  users: [],
  groups: [],
  groupMembers: [],
  expenses: [],
  expenseShares: [],
  settlements: [],
  sessionUserId: null,
  _hydrated: false,

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
      settlements: [],
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

  replaceExpensesAndSharesForGroup: (groupId, expenses, expenseShares, settlements) => {
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
    for (const sh of prev.expenseShares) {
      if (sh.user) userMap.set(sh.userId, sh.user);
    }
    for (const s of settlements) {
      if (s.fromUser) userMap.set(s.fromUserId, s.fromUser);
      if (s.toUser) userMap.set(s.toUserId, s.toUser);
    }
    for (const e of prev.expenses) {
      if (e.groupId !== groupId && e.paidByUser) userMap.set(e.paidBy, e.paidByUser);
    }
    const otherGroupExpenseIds = new Set(
      prev.expenses.filter((e) => e.groupId !== groupId).map((e) => e.id),
    );
    for (const sh of prev.expenseShares) {
      if (otherGroupExpenseIds.has(sh.expenseId) && sh.user) {
        userMap.set(sh.userId, sh.user);
      }
    }
    if (prev.sessionUserId) {
      const self = prev.users.find((u) => u.id === prev.sessionUserId);
      if (self) userMap.set(self.id, self);
    }

    const oldExpenseIds = new Set(prev.expenses.filter((e) => e.groupId === groupId).map((e) => e.id));

    set({
      expenses: [...prev.expenses.filter((e) => e.groupId !== groupId), ...expenses],
      expenseShares: [
        ...prev.expenseShares.filter((sh) => !oldExpenseIds.has(sh.expenseId)),
        ...expenseShares,
      ],
      settlements: [...prev.settlements.filter((s) => s.groupId !== groupId), ...settlements],
      users: Array.from(userMap.values()),
    });
  },

  replaceAllExpensesAndShares: (expenses, expenseShares, settlements) => {
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
    for (const s of settlements) {
      if (s.fromUser) userMap.set(s.fromUserId, s.fromUser);
      if (s.toUser) userMap.set(s.toUserId, s.toUser);
    }
    if (prev.sessionUserId) {
      const self = prev.users.find((u) => u.id === prev.sessionUserId);
      if (self) userMap.set(self.id, self);
    }
    set({
      expenses,
      expenseShares,
      settlements,
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

  getSettlements: (groupId) => get().settlements.filter((s) => s.groupId === groupId),
}), {
  name: 'splitsnap-split-data',
  storage: createJSONStorage(() => zustandMMKVStorage),
  partialize: (state) => ({
    groups: state.groups,
    groupMembers: state.groupMembers,
    expenses: state.expenses,
    expenseShares: state.expenseShares,
    settlements: state.settlements,
    sessionUserId: state.sessionUserId,
  }),
  onRehydrateStorage: () => {
    return () => {
      queueMicrotask(() => {
        useSplitDataStore.setState({ _hydrated: true });
        _resolveHydration();
      });
    };
  },
}));

export { userById };
