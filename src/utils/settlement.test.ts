import { describe, expect, it } from '@jest/globals';
import type { Expense, ExpensePayer, ExpenseShare, GroupMember, Settlement } from '@/types';

import { calculateBalances, calculateSettlements, userNetBalance } from './settlement';

const member = (id: string): GroupMember => ({
  groupId: 'g',
  userId: id,
  user: { id, name: id, email: `${id}@example.com` },
  joinedAt: '2026-01-01',
});

const expense = (id: string, amount: number): Expense => ({
  id,
  groupId: 'g',
  title: id,
  amount,
  date: '2026-11-01',
  splitType: 'equal',
});

const settlement = (from: string, to: string, amount: number): Settlement => ({
  id: `${from}-${to}-${amount}`,
  groupId: 'g',
  fromUserId: from,
  toUserId: to,
  amount,
  createdAt: '2026-11-02',
});

/** Builds the lookup callbacks the store passes in, from plain tables. */
function ledger(rows: { expenseId: string; payers: Record<string, number>; shares: Record<string, number> }[]) {
  const payers = (expenseId: string): ExpensePayer[] =>
    Object.entries(rows.find((r) => r.expenseId === expenseId)?.payers ?? {}).map(([userId, amount]) => ({
      expenseId,
      userId,
      amount,
    }));
  const shares = (expenseId: string): ExpenseShare[] =>
    Object.entries(rows.find((r) => r.expenseId === expenseId)?.shares ?? {}).map(([userId, amount]) => ({
      expenseId,
      userId,
      amount,
    }));
  return { payers, shares };
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

// The local seed's "Test grubu", plus the ₺100 expense from the 2026-11-22 UI pass.
// The server leaves the extra kuruş of an equal split with the payer.
const members = ['deniz', 'mert', 'sude'].map(member);
const expenses = [expense('kafe', 1500), expense('yemek', 3000), expense('yeni', 100)];
const { payers, shares } = ledger([
  { expenseId: 'kafe', payers: { deniz: 1500 }, shares: { deniz: 500, mert: 500, sude: 500 } },
  { expenseId: 'yemek', payers: { deniz: 3000 }, shares: { deniz: 1000, mert: 1000, sude: 1000 } },
  { expenseId: 'yeni', payers: { deniz: 100 }, shares: { deniz: 33.34, mert: 33.33, sude: 33.33 } },
]);

describe('calculateBalances', () => {
  it('credits payers and debits shares', () => {
    const balances = calculateBalances(members, expenses, [], shares, payers);
    expect(balances.deniz).toBeCloseTo(3066.66, 2);
    expect(balances.mert).toBeCloseTo(-1533.33, 2);
    expect(balances.sude).toBeCloseTo(-1533.33, 2);
  });

  it('always sums to zero across the group', () => {
    const balances = calculateBalances(members, expenses, [settlement('mert', 'deniz', 700)], shares, payers);
    expect(sum(Object.values(balances))).toBeCloseTo(0, 6);
  });

  it('moves a recorded payment from debtor to creditor', () => {
    const balances = calculateBalances(members, expenses, [settlement('mert', 'deniz', 1533.33)], shares, payers);
    expect(balances.mert).toBeCloseTo(0, 2);
    expect(balances.deniz).toBeCloseTo(1533.33, 2);
    expect(balances.sude).toBeCloseTo(-1533.33, 2);
  });

  it('starts every member at zero with no activity', () => {
    expect(calculateBalances(members, [], [], shares, payers)).toEqual({ deniz: 0, mert: 0, sude: 0 });
  });

  it('splits credit between several payers of one expense', () => {
    const multi = ledger([
      { expenseId: 'x', payers: { deniz: 60, mert: 30 }, shares: { deniz: 30, mert: 30, sude: 30 } },
    ]);
    const balances = calculateBalances(members, [expense('x', 90)], [], multi.shares, multi.payers);
    expect(balances).toEqual({ deniz: 30, mert: 0, sude: -30 });
  });
});

describe('userNetBalance', () => {
  it('matches the group balance for each member', () => {
    const recorded = [settlement('sude', 'deniz', 500)];
    const balances = calculateBalances(members, expenses, recorded, shares, payers);
    for (const m of members) {
      expect(userNetBalance(m.userId, expenses, recorded, shares, payers)).toBeCloseTo(balances[m.userId], 6);
    }
  });
});

describe('calculateSettlements', () => {
  it('suggests each debtor pays the creditor', () => {
    const balances = calculateBalances(members, expenses, [], shares, payers);
    const suggestions = calculateSettlements(members, balances);
    expect(suggestions).toHaveLength(2);
    for (const s of suggestions) {
      expect(s.to.id).toBe('deniz');
      expect(s.amount).toBeCloseTo(1533.33, 2);
    }
  });

  it('settles the headline balances exactly when paid', () => {
    const balances = calculateBalances(members, expenses, [], shares, payers);
    const paid = calculateSettlements(members, balances).map((s) => settlement(s.from.id, s.to.id, s.amount));
    const after = calculateBalances(members, expenses, paid, shares, payers);
    for (const value of Object.values(after)) expect(value).toBeCloseTo(0, 6);
    expect(calculateSettlements(members, after)).toEqual([]);
  });

  it('chains debts through more than one creditor', () => {
    const four = ['a', 'b', 'c', 'd'].map(member);
    const suggestions = calculateSettlements(four, { a: 70, b: 30, c: -60, d: -40 });
    const total = sum(suggestions.map((s) => s.amount));
    expect(total).toBeCloseTo(100, 6);
    const received = (id: string) => sum(suggestions.filter((s) => s.to.id === id).map((s) => s.amount));
    const sent = (id: string) => sum(suggestions.filter((s) => s.from.id === id).map((s) => s.amount));
    expect(received('a')).toBeCloseTo(70, 6);
    expect(received('b')).toBeCloseTo(30, 6);
    expect(sent('c')).toBeCloseTo(60, 6);
    expect(sent('d')).toBeCloseTo(40, 6);
  });

  it('ignores floating-point dust below one kuruş', () => {
    const two = ['a', 'b'].map(member);
    expect(calculateSettlements(two, { a: 0.004, b: -0.004 })).toEqual([]);
  });
});
