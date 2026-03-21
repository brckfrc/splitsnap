import type { Expense, ExpenseShare, GroupMember, Settlement } from '@/types';

export function calculateBalances(
  members: GroupMember[],
  expenses: Expense[],
  getShares: (expenseId: string) => ExpenseShare[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  members.forEach((m) => {
    balances[m.userId] = 0;
  });

  expenses.forEach((expense) => {
    if (balances[expense.paidBy] !== undefined) {
      balances[expense.paidBy] += expense.amount;
    }
    const shares = getShares(expense.id);
    shares.forEach((share) => {
      if (balances[share.userId] !== undefined) {
        balances[share.userId] -= share.amount;
      }
    });
  });

  return balances;
}

export function calculateSettlements(
  members: GroupMember[],
  balances: Record<string, number>,
): Settlement[] {
  const settlements: Settlement[] = [];

  const creditors = members
    .filter((m) => balances[m.userId] > 0)
    .map((m) => ({ user: m.user, amount: balances[m.userId] }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = members
    .filter((m) => balances[m.userId] < 0)
    .map((m) => ({ user: m.user, amount: -balances[m.userId] }))
    .sort((a, b) => b.amount - a.amount);

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const settleAmount = Math.min(creditor.amount, debtor.amount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount: settleAmount,
      });
    }

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return settlements;
}

export function userNetBalance(
  userId: string,
  expenses: Expense[],
  getShares: (expenseId: string) => ExpenseShare[],
): number {
  let paid = 0;
  let owes = 0;
  expenses.forEach((expense) => {
    if (expense.paidBy === userId) paid += expense.amount;
    const shares = getShares(expense.id);
    const mine = shares.find((s) => s.userId === userId);
    if (mine) owes += mine.amount;
  });
  return paid - owes;
}
