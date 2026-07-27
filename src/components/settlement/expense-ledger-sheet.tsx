/**
 * Detail view for a single row of the settlement screen's "Harcama Dökümüm".
 *
 * The ledger row only has space for the expense, its date and the net effect on
 * your balance; who paid, who it was split between and how that net was derived
 * all live here instead of being truncated into an 11pt meta line.
 */

import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import type { ExpensePayer, ExpenseShare } from '@/types';
import { formatCurrencyTry, formatLongDate } from '@/utils/format';

export type LedgerEntry = {
  id: string;
  title: string;
  icon: string | null;
  date: string;
  amount: number;
  /** How much of the expense the current user fronted. */
  paid: number;
  /** How much of the expense the current user is responsible for. */
  myShare: number;
  /** `paid - myShare`: the effect of this expense on the user's balance. */
  net: number;
};

type Props = {
  entry: LedgerEntry | null;
  payers: ExpensePayer[];
  shares: ExpenseShare[];
  currentUserId: string;
  groupId: string;
  nameFor: (userId: string) => string;
  onClose: () => void;
};

export function ExpenseLedgerSheet({
  entry,
  payers,
  shares,
  currentUserId,
  groupId,
  nameFor,
  onClose,
}: Props) {
  const t = useTheme();

  const netColor =
    entry && entry.net > 0.01 ? t.positive : entry && entry.net < -0.01 ? t.destructive : t.mutedForeground;

  // The `border` token is tuned for card edges against the page background and
  // all but disappears *inside* a card in dark mode (#1c1c1e on #121214). These
  // rules are structural, separating the people lists from the net breakdown, so
  // they're derived from the muted foreground to stay visible on both themes.
  const divider = `${t.mutedForeground}40`;

  const openExpense = () => {
    if (!entry) return;
    onClose();
    router.push(href(`/groups/${groupId}/expenses/${entry.id}/edit`));
  };

  const renderPeople = (people: { userId: string; amount: number }[]) =>
    people.map((p) => (
      <View key={p.userId} style={styles.personRow}>
        <Text style={[styles.personName, { color: t.foreground }]} numberOfLines={1}>
          {nameFor(p.userId)}
          {p.userId === currentUserId ? (
            <Text style={{ color: t.mutedForeground, fontWeight: '400' }}> (Sen)</Text>
          ) : null}
        </Text>
        <Text style={[styles.personAmount, { color: t.foreground }]}>{formatCurrencyTry(p.amount)}</Text>
      </View>
    ));

  return (
    <BottomSheet visible={entry !== null} onClose={onClose} title="Harcama Detayı">
      {entry ? (
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <Text style={styles.icon}>{entry.icon ?? '📝'}</Text>
            <View style={styles.titleText}>
              <Text style={[styles.title, { color: t.foreground }]}>{entry.title}</Text>
              <Text style={[styles.date, { color: t.mutedForeground }]}>{formatLongDate(entry.date)}</Text>
            </View>
            <Text style={[styles.total, { color: t.foreground }]}>{formatCurrencyTry(entry.amount)}</Text>
          </View>

          {payers.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockLabel, { color: t.mutedForeground }]}>Ödeyen</Text>
              {renderPeople(payers)}
            </View>
          ) : null}

          {shares.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.blockLabel, { color: t.mutedForeground }]}>
                Paylaşanlar ({shares.length})
              </Text>
              {renderPeople(shares)}
            </View>
          ) : null}

          <View style={[styles.summary, { borderTopColor: divider }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.mutedForeground }]}>Ödediğin</Text>
              <Text style={[styles.summaryValue, { color: t.foreground }]}>
                {formatCurrencyTry(entry.paid)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.mutedForeground }]}>Payına düşen</Text>
              <Text style={[styles.summaryValue, { color: t.foreground }]}>
                {formatCurrencyTry(entry.myShare)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.netRow, { borderTopColor: divider }]}>
              <Text style={[styles.netLabel, { color: t.foreground }]}>Bakiyene etkisi</Text>
              <Text style={[styles.netValue, { color: netColor }]}>
                {entry.net > 0.01 ? '+' : ''}
                {formatCurrencyTry(entry.net)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={openExpense}
            style={({ pressed }) => [
              styles.openBtn,
              { borderColor: t.border, backgroundColor: pressed ? t.accent : 'transparent' },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.openBtnText, { color: t.primary }]}>Harcamayı Aç</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  icon: {
    fontSize: 26,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  date: {
    fontSize: 13,
  },
  total: {
    fontSize: 17,
    fontWeight: '700',
  },
  block: {
    marginTop: Spacing.five,
    gap: Spacing.two,
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  personName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  personAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  summary: {
    marginTop: Spacing.five,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  netRow: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  netValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  openBtn: {
    marginTop: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  openBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
