import type { Expense, ExpenseShare, ExpensePayer, GroupMember, Settlement, SettlementSuggestion } from '@/types';

export function calculateBalances(
  members: GroupMember[],
  expenses: Expense[],
  settlements: Settlement[],
  getShares: (expenseId: string) => ExpenseShare[],
  getPayers: (expenseId: string) => ExpensePayer[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  members.forEach((m) => {
    balances[m.userId] = 0;
  });

  expenses.forEach((expense) => {
    const payers = getPayers(expense.id);
    payers.forEach((payer) => {
      if (balances[payer.userId] !== undefined) {
        balances[payer.userId] += payer.amount;
      }
    });

    const shares = getShares(expense.id);
    shares.forEach((share) => {
      if (balances[share.userId] !== undefined) {
        balances[share.userId] -= share.amount;
      }
    });
  });

  settlements.forEach((settlement) => {
    if (balances[settlement.fromUserId] !== undefined) {
      balances[settlement.fromUserId] += settlement.amount;
    }
    if (balances[settlement.toUserId] !== undefined) {
      balances[settlement.toUserId] -= settlement.amount;
    }
  });

  return balances;
}

export function calculateSettlements(
  members: GroupMember[],
  balances: Record<string, number>,
): SettlementSuggestion[] {
  const settlements: SettlementSuggestion[] = [];

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
  settlements: Settlement[],
  getShares: (expenseId: string) => ExpenseShare[],
  getPayers: (expenseId: string) => ExpensePayer[],
): number {
  let paid = 0;
  let owes = 0;
  expenses.forEach((expense) => {
    const payers = getPayers(expense.id);
    const minePaid = payers.find((p) => p.userId === userId);
    if (minePaid) paid += minePaid.amount;

    const shares = getShares(expense.id);
    const mineOwes = shares.find((s) => s.userId === userId);
    if (mineOwes) owes += mineOwes.amount;
  });
  
  settlements.forEach((settlement) => {
    if (settlement.fromUserId === userId) paid += settlement.amount;
    if (settlement.toUserId === userId) owes += settlement.amount;
  });

  return paid - owes;
}
