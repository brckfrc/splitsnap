import { useMemo } from 'react';

import { useSplitDataStore } from '@/stores/split-data-store';
import type { Expense, Group } from '@/types';
import { expenseEnteredAt } from '@/utils/expense';
import { guessCategoryEmoji } from '@/utils/format';
import { userNetBalance } from '@/utils/settlement';

const THIS_MONTH_START = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
})();

export type BalanceBucket = {
  currency: string;
  credit: number;
  debt: number;
};

export type OwedGroup = {
  group: Group;
  amount: number;
  currency: string;
};

export type RecentActivity = {
  expense: Expense;
  groupId: string;
  groupName: string;
  currency: string;
  icon: string;
};

export type DashboardSummary = {
  balanceBuckets: BalanceBucket[];
  groupsIOwe: OwedGroup[];
  groupsOwingMe: OwedGroup[];
  thisMonthBuckets: { currency: string; amount: number }[];
  recentActivity: RecentActivity[];
  hasAnyExpenses: boolean;
};

const RECENT_LIMIT = 3;

/**
 * Derives cross-group dashboard aggregates from root store slices.
 * Subscribes only to root slice arrays (not derived selectors) to satisfy
 * the React 19 + Zustand useSyncExternalStore snapshot-stability rule.
 */
export function useDashboardSummary(): DashboardSummary {
  const sessionUserId = useSplitDataStore((s) => s.sessionUserId);
  const groups = useSplitDataStore((s) => s.groups);
  const groupMembers = useSplitDataStore((s) => s.groupMembers);
  const expenses = useSplitDataStore((s) => s.expenses);
  const expenseShares = useSplitDataStore((s) => s.expenseShares);
  const expensePayers = useSplitDataStore((s) => s.expensePayers);
  const settlements = useSplitDataStore((s) => s.settlements);

  return useMemo((): DashboardSummary => {
    if (!sessionUserId) {
      return {
        balanceBuckets: [],
        groupsIOwe: [],
        groupsOwingMe: [],
        thisMonthBuckets: [],
        recentActivity: [],
        hasAnyExpenses: false,
      };
    }

    // Build lookup maps once so userNetBalance callbacks are O(1).
    const sharesByExpense: Record<string, typeof expenseShares> = {};
    for (const sh of expenseShares) {
      (sharesByExpense[sh.expenseId] ??= []).push(sh);
    }
    const payersByExpense: Record<string, typeof expensePayers> = {};
    for (const p of expensePayers) {
      (payersByExpense[p.expenseId] ??= []).push(p);
    }
    const getShares = (id: string) => sharesByExpense[id] ?? [];
    const getPayers = (id: string) => payersByExpense[id] ?? [];

    // Groups the session user is an active member of.
    const myGroupIds = new Set(
      groupMembers
        .filter((m) => m.userId === sessionUserId && !m.leftAt)
        .map((m) => m.groupId),
    );
    const myGroups = groups.filter((g) => myGroupIds.has(g.id));

    // Per-currency credit/debt accumulation.
    const creditByCurrency: Record<string, number> = {};
    const debtByCurrency: Record<string, number> = {};
    const groupsIOwe: OwedGroup[] = [];
    const groupsOwingMe: OwedGroup[] = [];

    for (const group of myGroups) {
      const currency = group.currency ?? 'TRY';
      const groupExpenses = expenses.filter((e) => e.groupId === group.id);
      const groupSettlements = settlements.filter((s) => s.groupId === group.id);

      const net = userNetBalance(
        sessionUserId,
        groupExpenses,
        groupSettlements,
        getShares,
        getPayers,
      );

      if (net > 0.01) {
        creditByCurrency[currency] = (creditByCurrency[currency] ?? 0) + net;
        groupsOwingMe.push({ group, amount: net, currency });
      } else if (net < -0.01) {
        debtByCurrency[currency] = (debtByCurrency[currency] ?? 0) + Math.abs(net);
        groupsIOwe.push({ group, amount: Math.abs(net), currency });
      }
    }

    const allCurrencies = new Set([
      ...Object.keys(creditByCurrency),
      ...Object.keys(debtByCurrency),
    ]);
    const balanceBuckets: BalanceBucket[] = Array.from(allCurrencies).map((c) => ({
      currency: c,
      credit: creditByCurrency[c] ?? 0,
      debt: debtByCurrency[c] ?? 0,
    }));

    // Sort both lists by amount descending.
    groupsIOwe.sort((a, b) => b.amount - a.amount);
    groupsOwingMe.sort((a, b) => b.amount - a.amount);

    // This-month: sum of my expense shares within myGroups.
    const thisMonthRaw: Record<string, number> = {};
    for (const sh of expenseShares) {
      if (sh.userId !== sessionUserId) continue;
      const expense = expenses.find((e) => e.id === sh.expenseId);
      if (!expense || !myGroupIds.has(expense.groupId)) continue;
      const ts = new Date(expense.date).getTime();
      if (Number.isNaN(ts) || ts < THIS_MONTH_START) continue;
      const currency = groups.find((g) => g.id === expense.groupId)?.currency ?? 'TRY';
      thisMonthRaw[currency] = (thisMonthRaw[currency] ?? 0) + sh.amount;
    }
    const thisMonthBuckets = Object.entries(thisMonthRaw).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    // Recent activity: last RECENT_LIMIT expenses across my groups, ordered by
    // when they were entered rather than when the money was spent — a receipt
    // typed in today belongs at the top even if it is weeks old.
    const groupMetaById: Record<string, { name: string; currency: string }> = {};
    for (const g of myGroups) groupMetaById[g.id] = { name: g.name, currency: g.currency ?? 'TRY' };

    const recentActivity: RecentActivity[] = expenses
      .filter((e) => myGroupIds.has(e.groupId) && !e.deletedAt)
      .sort((a, b) => expenseEnteredAt(b) - expenseEnteredAt(a))
      .slice(0, RECENT_LIMIT)
      .map((e) => ({
        expense: e,
        groupId: e.groupId,
        groupName: groupMetaById[e.groupId]?.name ?? '',
        currency: groupMetaById[e.groupId]?.currency ?? 'TRY',
        icon: (e.icon as string | null | undefined) ?? guessCategoryEmoji(e.title),
      }));

    const hasAnyExpenses = expenses.some((e) => myGroupIds.has(e.groupId));

    return { balanceBuckets, groupsIOwe, groupsOwingMe, thisMonthBuckets, recentActivity, hasAnyExpenses };
  }, [
    sessionUserId,
    groups,
    groupMembers,
    expenses,
    expenseShares,
    expensePayers,
    settlements,
  ]);
}
