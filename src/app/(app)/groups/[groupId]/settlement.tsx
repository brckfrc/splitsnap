import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, ChevronDown } from '@/lib/icons';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';
import { useTheme } from '@/hooks/use-theme';
import { splitData } from '@/services/split-data';
import { formatCurrencyTry, formatShortDate } from '@/utils/format';
import { calculateBalances, calculateSettlements } from '@/utils/settlement';

export default function SettlementScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';
  const t = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(true);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await splitData.loadExpensesForGroup(gid);
    } catch {
      /* store keeps previous data */
    } finally {
      setRefreshing(false);
    }
  }, [gid]);
  const { user } = useAuth();

  const { group, members, expenses, settlements: pastSettlements } = useGroupAggregates(gid);

  if (!group) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.background }]}>
        <Text style={{ color: t.mutedForeground }}>Grup bulunamadı</Text>
      </SafeAreaView>
    );
  }

  const balances = calculateBalances(members, expenses, pastSettlements, (eid) => splitData.getShares(eid));
  const settlements = calculateSettlements(members, balances);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const myBalance = user ? balances[user.id] ?? 0 : 0;

  const myLedger = user
    ? expenses
        .map((e) => {
          const paid = e.paidBy === user.id ? e.amount : 0;
          const myShare = splitData.getShares(e.id).find((s) => s.userId === user.id)?.amount ?? 0;
          if (paid === 0 && myShare === 0) return null;
          return { id: e.id, title: e.title, icon: e.icon as string | null, date: e.date, amount: e.amount, paid, myShare, net: paid - myShare };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  async function handleSettle(fromUserId: string, toUserId: string, amount: number) {
    Alert.alert(
      'Ödemeyi Onayla',
      `${formatCurrencyTry(amount)} tutarındaki borcun elden veya banka yoluyla ödendiğini onaylıyor musunuz?\n\n(Bu işlem sadece kayıt amaçlıdır, gerçek para transferi yapılmaz.)`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async () => {
            setSubmitting(true);
            try {
              await splitData.addSettlement({
                groupId: gid,
                fromUserId,
                toUserId,
                amount,
              });
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Ödeme kaydedilemedi.';
              Alert.alert('Hata', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Pressable accessibilityLabel="Geri" accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={t.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
          Ödeme Özeti
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET + Spacing.five }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <Text style={[styles.muted, { color: t.mutedForeground }]}>{group.name}</Text>
        <Text style={[styles.big, { color: t.foreground }]}>Toplam: {formatCurrencyTry(total)}</Text>

        {user ? (
          <Card style={{ marginTop: Spacing.four }}>
            <Text style={[styles.cardTitle, { color: t.mutedForeground }]}>Sizin Net Bakiyeniz</Text>
            <Text
              style={[
                styles.balance,
                { color: myBalance > 0 ? t.positive : myBalance < 0 ? t.destructive : t.foreground },
              ]}
            >
              {formatCurrencyTry(myBalance)}
            </Text>
          </Card>
        ) : null}

        <Text style={[styles.section, { color: t.foreground }]}>Üye Bakiyeleri</Text>
        <Card style={{ gap: Spacing.two }}>
          {members.map((m) => (
            <View key={m.userId} style={styles.row}>
              <Text style={{ color: t.foreground, flex: 1, fontWeight: '600' }}>{m.user.name}</Text>
              <Text
                style={{
                  fontWeight: '700',
                  color:
                    (balances[m.userId] ?? 0) > 0
                      ? t.positive
                      : (balances[m.userId] ?? 0) < 0
                        ? t.destructive
                        : t.mutedForeground,
                }}
              >
                {formatCurrencyTry(balances[m.userId] ?? 0)}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={[styles.section, { color: t.foreground }]}>Önerilen Ödemeler</Text>
        {settlements.length === 0 ? (
          <Text style={{ color: t.mutedForeground }}>Herkes dengede görünüyor.</Text>
        ) : (
          <View style={{ gap: Spacing.three }}>
            {settlements.map((s, idx) => (
              <Card key={`${s.from.id}-${s.to.id}-${idx}`}>
                <View style={styles.settleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.foreground, fontWeight: '700' }}>{s.from.name}</Text>
                    <View style={styles.arrowRow}>
                      <ArrowRight size={16} color={t.mutedForeground} />
                      <Text style={{ color: t.mutedForeground }}>{s.to.name}</Text>
                    </View>
                  </View>
                  <Text style={{ color: t.primary, fontWeight: '800', fontSize: 16 }}>
                    {formatCurrencyTry(s.amount)}
                  </Text>
                  {(user?.id === s.from.id || user?.id === s.to.id) && (
                    <Button
                      size="sm"
                      disabled={submitting}
                      onPress={() => handleSettle(s.from.id, s.to.id, s.amount)}
                      variant="secondary"
                    >
                      Ödendi
                    </Button>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={[styles.section, { color: t.foreground, marginTop: Spacing.six }]}>Geçmiş Ödemeler</Text>
        {pastSettlements.length === 0 ? (
          <Text style={{ color: t.mutedForeground }}>Henüz ödeme kaydı bulunmuyor.</Text>
        ) : (
          <View style={{ gap: Spacing.three }}>
            {pastSettlements.map((s) => (
              <Card key={s.id}>
                <View style={styles.settleRow}>
                  <View style={[styles.iconContainer, { backgroundColor: t.positiveMuted }]}>
                    <Check size={20} color={t.positive} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.foreground, fontWeight: '600' }}>
                      {s.fromUser?.name} <Text style={{ color: t.mutedForeground, fontWeight: '400' }}>ödedi</Text> {s.toUser?.name}
                    </Text>
                    <Text style={{ color: t.mutedForeground, fontSize: 12, marginTop: 2 }}>
                      {formatShortDate(s.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ color: t.foreground, fontWeight: '700', fontSize: 15 }}>
                    {formatCurrencyTry(s.amount)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {user && myLedger.length > 0 && (
          <>
            <Pressable
              onPress={() => setLedgerOpen((v) => !v)}
              style={[styles.row, { marginTop: Spacing.six }]}
              accessibilityRole="button"
              accessibilityLabel="Bakiyeniz nasıl oluştu?"
            >
              <Text style={[styles.section, { color: t.foreground, marginTop: 0, flex: 1 }]}>
                Harcama Dökümüm
              </Text>
              <ChevronDown
                size={18}
                color={t.mutedForeground}
                style={{ transform: [{ rotate: ledgerOpen ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {ledgerOpen && (
              <Card style={{ gap: 0, overflow: 'hidden' }}>
                {myLedger.map((entry, idx) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.ledgerRow,
                      idx < myLedger.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
                    ]}
                  >
                    <Text style={{ fontSize: 17, width: 26, textAlign: 'center' }}>{entry.icon ?? '📝'}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.foreground, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {entry.title}
                        <Text style={{ color: t.mutedForeground, fontWeight: '400' }}>{' '}({formatCurrencyTry(entry.amount)})</Text>
                      </Text>
                      <Text style={{ color: t.mutedForeground, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                        {formatShortDate(entry.date)}
                        {entry.paid > 0 ? `  ·  Ödedi ${formatCurrencyTry(entry.paid)}` : ''}
                        {entry.myShare > 0 ? `  ·  Payı ${formatCurrencyTry(entry.myShare)}` : ''}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 13,
                        color: entry.net > 0.01 ? t.positive : entry.net < -0.01 ? t.destructive : t.mutedForeground,
                      }}
                    >
                      {entry.net > 0.01 ? '+' : ''}{formatCurrencyTry(entry.net)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.ledgerRow, styles.ledgerFooter, { borderTopColor: t.border, backgroundColor: `${t.foreground}08` }]}>
                  <Text style={{ flex: 1, color: t.mutedForeground, fontSize: 12, fontWeight: '600' }}>
                    Harcamalar toplamı
                  </Text>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: t.foreground }}>
                    {(() => {
                      const sub = myLedger.reduce((acc, e) => acc + e.net, 0);
                      return `${sub > 0.01 ? '+' : ''}${formatCurrencyTry(sub)}`;
                    })()}
                  </Text>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  iconBtn: { padding: Spacing.two },
  topTitle: { fontSize: 18, fontWeight: '700' },
  body: { padding: Spacing.five, gap: Spacing.four },
  muted: { fontSize: 14 },
  big: { fontSize: 22, fontWeight: '800', marginTop: Spacing.one },
  cardTitle: { fontSize: 13, marginBottom: Spacing.one },
  balance: { fontSize: 28, fontWeight: '800' },
  section: { fontSize: 16, fontWeight: '700', marginTop: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  iconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  ledgerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
