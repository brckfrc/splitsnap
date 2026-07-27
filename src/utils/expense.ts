import type { Expense } from '@/types';

/**
 * Expenses carry two different dates: `date` is when the money was spent (the
 * date on the receipt, chosen by the user) and `createdAt` is when the row was
 * entered into the app. These diverge whenever someone types in an old receipt.
 */
export type ExpenseSortKey = 'spent' | 'entered';

/**
 * Timestamp used for "most recently entered" ordering. Falls back to the
 * expense date for rows cached in MMKV before `createdAt` was mapped, so a
 * stale cache degrades to the old ordering instead of sorting as epoch 0.
 */
export function expenseEnteredAt(expense: Expense): number {
  return new Date(expense.createdAt ?? expense.date).getTime();
}

/** Timestamp of when the money was spent. */
export function expenseSpentAt(expense: Expense): number {
  return new Date(expense.date).getTime();
}

/** Returns a new array sorted newest-first by the requested key. */
export function sortExpenses<T extends Expense>(expenses: T[], key: ExpenseSortKey): T[] {
  const at = key === 'entered' ? expenseEnteredAt : expenseSpentAt;
  return [...expenses].sort((a, b) => at(b) - at(a));
}
