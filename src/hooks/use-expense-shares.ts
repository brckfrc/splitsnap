import { useMemo } from 'react';

import { useSplitDataStore } from '@/services/split-data';

/**
 * Tek harcama payları — `getShares` her çağrıda yeni dizi üretir; selector olarak kullanılmamalı
 * (React 19 / useSyncExternalStore uyarısı). Kök `expenseShares` + `useMemo`.
 */
export function useExpenseShares(expenseId: string) {
  const expenseShares = useSplitDataStore((s) => s.expenseShares);
  return useMemo(
    () => expenseShares.filter((sh) => sh.expenseId === expenseId),
    [expenseShares, expenseId],
  );
}
