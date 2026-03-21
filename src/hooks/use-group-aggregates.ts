import { useMemo } from 'react';

import { useSplitDataStore } from '@/services/split-data';

/**
 * Grup detayı / settlement için store verisi.
 *
 * React 19 + `useSyncExternalStore` (Zustand): Selector'dan her çağrıda yeni `{}` veya
 * `.filter()` ile yeni dizi döndürmek snapshot'ı sürekli "değişti" saydırır → sonsuz döngü.
 * Bu yüzden kök state slice'larına abone olup filtrelemeyi `useMemo` ile yapıyoruz.
 */
export function useGroupAggregates(groupId: string) {
  const group = useSplitDataStore((s) => s.getGroup(groupId));
  const groupMembers = useSplitDataStore((s) => s.groupMembers);
  const allExpenses = useSplitDataStore((s) => s.expenses);

  const members = useMemo(
    () => groupMembers.filter((m) => m.groupId === groupId),
    [groupMembers, groupId],
  );

  const expenses = useMemo(
    () => allExpenses.filter((e) => e.groupId === groupId),
    [allExpenses, groupId],
  );

  return { group, members, expenses };
}
