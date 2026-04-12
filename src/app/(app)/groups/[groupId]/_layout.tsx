import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { stopExpensesBackgroundSync, syncExpensesForGroup } from '@/services/expenses-sync';

export default function GroupSegmentLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';

  useEffect(() => {
    if (!gid) return;
    void syncExpensesForGroup(gid);
    return () => {
      stopExpensesBackgroundSync();
    };
  }, [gid]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
