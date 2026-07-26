import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ChevronRight, Users } from '@/lib/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { useSplitDataStore } from '@/stores/split-data-store';
import type { Group } from '@/types';
import { formatCurrencyTry } from '@/utils/format';

type QuickAddGroupSheetProps = {
  visible: boolean;
  groups: Group[];
  onClose: () => void;
};

const INITIAL_VISIBLE = 5;

function groupInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function QuickAddGroupSheet({ visible, groups, onClose }: QuickAddGroupSheetProps) {
  const t = useTheme();
  const expenses = useSplitDataStore((s) => s.expenses);
  const groupMembers = useSplitDataStore((s) => s.groupMembers);
  const [expanded, setExpanded] = useState(false);

  // Per-group aggregates: total spend, member count, last activity (for recency sort).
  const { memberCounts, totals, sorted } = useMemo(() => {
    const totalsMap: Record<string, number> = {};
    const lastActivity: Record<string, number> = {};
    for (const e of expenses) {
      totalsMap[e.groupId] = (totalsMap[e.groupId] ?? 0) + e.amount;
      const ts = new Date(e.date).getTime();
      if (!Number.isNaN(ts) && ts > (lastActivity[e.groupId] ?? 0)) {
        lastActivity[e.groupId] = ts;
      }
    }

    const countsMap: Record<string, number> = {};
    for (const m of groupMembers) {
      if (m.leftAt) continue;
      countsMap[m.groupId] = (countsMap[m.groupId] ?? 0) + 1;
    }

    const recencyOf = (g: Group) => lastActivity[g.id] ?? (new Date(g.createdAt).getTime() || 0);
    const sortedGroups = [...groups].sort((a, b) => recencyOf(b) - recencyOf(a));

    return { memberCounts: countsMap, totals: totalsMap, sorted: sortedGroups };
  }, [expenses, groupMembers, groups]);

  const hasMore = sorted.length > INITIAL_VISIBLE;
  const visibleGroups = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);

  const handleSelect = (groupId: string) => {
    onClose();
    setExpanded(false);
    router.push(href(`/groups/${groupId}/add-expense`));
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setExpanded(false);
        onClose();
      }}
      title="Grup Seç"
    >
      <ScrollView
        style={{ maxHeight: 380 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.one }}
      >
        {visibleGroups.map((g) => (
          <Pressable
            key={g.id}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: t.accent },
            ]}
            onPress={() => handleSelect(g.id)}
          >
            <View style={[styles.avatar, { backgroundColor: t.accent }]}>
              <Text style={[styles.avatarText, { color: t.foreground }]}>{groupInitials(g.name)}</Text>
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.groupName, { color: t.foreground }]} numberOfLines={1}>
                {g.name}
              </Text>
              <View style={styles.metaRow}>
                <Users size={13} color={t.mutedForeground} />
                <Text style={[styles.metaText, { color: t.mutedForeground }]}>
                  {memberCounts[g.id] ?? 0} kişi
                </Text>
                <Text style={[styles.metaDot, { color: t.mutedForeground }]}>·</Text>
                <Text style={[styles.metaText, { color: t.mutedForeground }]}>
                  {formatCurrencyTry(totals[g.id] ?? 0)}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={t.mutedForeground} />
          </Pressable>
        ))}

        {hasMore && !expanded && (
          <Pressable
            style={({ pressed }) => [
              styles.expandBtn,
              pressed && { backgroundColor: t.accent },
            ]}
            onPress={() => setExpanded(true)}
          >
            <Text style={[styles.expandText, { color: t.primary }]}>
              Tüm gruplar ({sorted.length})
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowMain: {
    flex: 1,
    gap: 3,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaText: {
    fontSize: 13,
  },
  metaDot: {
    fontSize: 13,
    marginHorizontal: 2,
  },
  expandBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
    borderRadius: 12,
  },
  expandText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
