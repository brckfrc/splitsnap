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
  const sessionUserId = useSplitDataStore((s) => s.sessionUserId);
  const group = useSplitDataStore((s) => s.getGroup(groupId));
  const groupMembers = useSplitDataStore((s) => s.groupMembers);
  const allExpenses = useSplitDataStore((s) => s.expenses);
  const allSettlements = useSplitDataStore((s) => s.settlements);

  const members = useMemo(() => {
    const raw = groupMembers.filter((m) => m.groupId === groupId);
    return raw.sort((a, b) => {
      if (a.userId === sessionUserId) return -1;
      if (b.userId === sessionUserId) return 1;

      const aIsAdmin = a.role === 'admin' || a.userId === group?.ownerId;
      const bIsAdmin = b.role === 'admin' || b.userId === group?.ownerId;
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      if (!a.leftAt && b.leftAt) return -1;
      if (a.leftAt && !b.leftAt) return 1;

      return a.user.name.localeCompare(b.user.name);
    });
  }, [groupMembers, groupId, sessionUserId, group?.ownerId]);

  const expenses = useMemo(
    () => allExpenses.filter((e) => e.groupId === groupId),
    [allExpenses, groupId],
  );

  const settlements = useMemo(
    () => allSettlements.filter((s) => s.groupId === groupId),
    [allSettlements, groupId],
  );

  return { group, members, expenses, settlements };
}
