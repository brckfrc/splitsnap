import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { BalanceGroupsSheet } from '@/components/dashboard/balance-groups-sheet';
import { ChevronRight } from '@/lib/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDashboardSummary, type OwedGroup } from '@/hooks/use-dashboard-summary';
import { href } from '@/lib/href';
import { formatCurrency, formatRelativeDay } from '@/utils/format';

export function DashboardSummary() {
  const t = useTheme();
  const summary = useDashboardSummary();
  const [sheetData, setSheetData] = useState<{ variant: 'debt' | 'credit'; groups: OwedGroup[] } | null>(null);

  const { balanceBuckets, groupsIOwe, groupsOwingMe, thisMonthBuckets, recentActivity, hasAnyExpenses } = summary;

  const openBalance = (variant: 'debt' | 'credit', groups: OwedGroup[]) => {
    if (groups.length === 0) return;
    if (groups.length === 1) {
      router.push(href(`/groups/${groups[0].group.id}/settlement`));
    } else {
      setSheetData({ variant, groups });
    }
  };

  return (
    <>
      {/* Action Card — standalone CTA at the top, only shown when debt exists */}
      {groupsIOwe.length > 0 && (
        <Pressable
          onPress={() => openBalance('debt', groupsIOwe)}
          style={({ pressed }) => [
            styles.actionCard,
            {
              backgroundColor: `${t.destructive}12`,
              borderColor: `${t.destructive}40`,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.actionCardInner}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: t.destructive }]}>
                Ödenmemiş Borçların
              </Text>
              <Text style={[styles.actionSub, { color: t.mutedForeground }]}>
                {groupsIOwe.length === 1
                  ? groupsIOwe[0].group.name
                  : `${groupsIOwe.length} grupta bekliyor`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              {Object.entries(
                groupsIOwe.reduce<Record<string, number>>((acc, g) => {
                  acc[g.currency] = (acc[g.currency] ?? 0) + g.amount;
                  return acc;
                }, {}),
              ).map(([currency, total]) => (
                <Text key={currency} style={[styles.actionAmount, { color: t.destructive }]}>
                  {formatCurrency(total, currency)}
                </Text>
              ))}
              <Text style={[styles.actionCta, { color: t.destructive }]}>Öde →</Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Overview: General Balance + This Month in one card */}
      <Card>
        <Text style={[styles.sectionTitle, { color: t.mutedForeground }]}>Genel Bakiye</Text>
        {!hasAnyExpenses ? (
          <Text style={[styles.emptyLine, { color: t.mutedForeground }]}>Henüz harcama yok</Text>
        ) : balanceBuckets.length === 0 ? (
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: t.mutedForeground }]}>Borçların temiz</Text>
          </View>
        ) : (
          balanceBuckets.map((bucket) => {
            const creditGroups = groupsOwingMe.filter((g) => g.currency === bucket.currency);
            const debtGroups = groupsIOwe.filter((g) => g.currency === bucket.currency);
            return (
              <View key={bucket.currency} style={styles.balanceBucket}>
                <Pressable
                  style={styles.balanceStat}
                  disabled={bucket.credit <= 0}
                  onPress={() => openBalance('credit', creditGroups)}
                  accessibilityRole="button"
                  accessibilityLabel="Alacak detayı"
                >
                  <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Alacak</Text>
                  <View style={styles.statValueRow}>
                    <Text style={[styles.statValue, { color: t.positive }]}>
                      {formatCurrency(bucket.credit, bucket.currency)}
                    </Text>
                    {bucket.credit > 0 && <ChevronRight size={14} color={t.mutedForeground} />}
                  </View>
                </Pressable>
                <View style={[styles.balanceDivider, { backgroundColor: t.border }]} />
                <Pressable
                  style={styles.balanceStat}
                  disabled={bucket.debt <= 0}
                  onPress={() => openBalance('debt', debtGroups)}
                  accessibilityRole="button"
                  accessibilityLabel="Borç detayı"
                >
                  <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Borç</Text>
                  <View style={styles.statValueRow}>
                    <Text style={[styles.statValue, { color: t.destructive }]}>
                      {formatCurrency(bucket.debt, bucket.currency)}
                    </Text>
                    {bucket.debt > 0 && <ChevronRight size={14} color={t.mutedForeground} />}
                  </View>
                </Pressable>
              </View>
            );
          })
        )}

        <View style={[styles.hDivider, { backgroundColor: t.border }]} />

        <View style={styles.monthRow}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInline, { color: t.mutedForeground }]}>
            Bu ayki harcaman
          </Text>
          {thisMonthBuckets.length === 0 ? (
            <Text style={[styles.emptyLine, { color: t.mutedForeground }]}>—</Text>
          ) : (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              {thisMonthBuckets.map((b) => (
                <Text key={b.currency} style={[styles.monthValue, { color: t.foreground }]}>
                  {formatCurrency(b.amount, b.currency)}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Text style={[styles.sectionTitle, { color: t.mutedForeground, margin: Spacing.four, marginBottom: Spacing.two }]}>
            Son Hareketler
          </Text>
          {recentActivity.map((item, index) => (
            <Pressable
              key={item.expense.id}
              style={({ pressed }) => [
                styles.activityRow,
                index < recentActivity.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: t.border,
                },
                pressed && { backgroundColor: t.accent },
              ]}
              onPress={() =>
                router.push(href(`/groups/${item.groupId}/expenses/${item.expense.id}/edit`))
              }
            >
              <Text style={styles.activityIcon}>{item.icon}</Text>
              <View style={styles.activityMain}>
                <Text style={[styles.activityTitle, { color: t.foreground }]} numberOfLines={1}>
                  {item.expense.title}
                </Text>
                <Text style={[styles.activityMeta, { color: t.mutedForeground }]} numberOfLines={1}>
                  {item.groupName} · {formatRelativeDay(item.expense.createdAt ?? item.expense.date)}
                </Text>
              </View>
              <Text style={[styles.activityAmount, { color: t.foreground }]}>
                {formatCurrency(item.expense.amount, item.currency)}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}

      <BalanceGroupsSheet
        visible={!!sheetData}
        variant={sheetData?.variant ?? 'debt'}
        groups={sheetData?.groups ?? []}
        onClose={() => setSheetData(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  hDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyLine: {
    fontSize: 15,
  },
  balanceBucket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  balanceStat: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  balanceDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 15,
  },
  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  actionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 13,
    marginTop: 2,
  },
  actionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionCta: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  activityIcon: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  activityMain: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: 13,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
