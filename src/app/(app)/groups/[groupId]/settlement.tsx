import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight } from '@/lib/icons';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExpenseLedgerSheet, type LedgerEntry } from '@/components/settlement/expense-ledger-sheet';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';
import { useTheme } from '@/hooks/use-theme';
import { splitData } from '@/services/split-data';
import { formatCurrencyTry, formatShortDate } from '@/utils/format';
import { calculateBalances, calculateSettlements } from '@/utils/settlement';
import { MONEY_EPSILON } from '@/utils/validation';

export default function SettlementScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';
  const t = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  /** Suggestion row currently being recorded, so only that button spins. */
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  /** A ref, not state: it has to flip synchronously inside the tap handler. */
  const dialogOpen = useRef(false);
  const [ledgerOpen, setLedgerOpen] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
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

  const balances = calculateBalances(
    members,
    expenses,
    pastSettlements,
    (eid) => splitData.getShares(eid),
    (eid) => splitData.getPayers(eid),
  );
  const settlements = calculateSettlements(members, balances);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const myBalance = user ? balances[user.id] ?? 0 : 0;

  const myLedger: LedgerEntry[] = user
    ? expenses
        .map((e) => {
          const paid = splitData.getPayers(e.id).find((p) => p.userId === user.id)?.amount ?? 0;
          const myShare = splitData.getShares(e.id).find((s) => s.userId === user.id)?.amount ?? 0;
          if (paid === 0 && myShare === 0) return null;
          return { id: e.id, title: e.title, icon: e.icon as string | null, date: e.date, amount: e.amount, paid, myShare, net: paid - myShare };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const detailEntry = myLedger.find((e) => e.id === detailId) ?? null;
  const nameFor = (userId: string) =>
    members.find((m) => m.userId === userId)?.user.name ?? 'Bilinmeyen';

  /**
   * The breakdown has to account for settlements too, otherwise its total is a
   * different number than the net balance shown at the top of the screen and
   * nothing on the screen names the difference.
   *
   * `net` is deliberately the same expression `calculateBalances` uses (credit for
   * paying, debit for being paid) rather than a simpler in/out flag, so the rows
   * add up to the headline figure by construction. It matters for the one case the
   * flag would get wrong: `settlements` has no `from_user_id <> to_user_id`
   * constraint, and a row pointing at yourself nets to zero in the balance.
   */
  const mySettlementLedger = user
    ? pastSettlements
        .filter((s) => s.fromUserId === user.id || s.toUserId === user.id)
        .map((s) => {
          const outgoing = s.fromUserId === user.id;
          // The joined profile, not nameFor(): the counterpart may have left the
          // group, and a past payment still has to read as a payment to someone.
          const other = outgoing
            ? s.toUser?.name ?? nameFor(s.toUserId)
            : s.fromUser?.name ?? nameFor(s.fromUserId);
          return {
            id: s.id,
            title: outgoing ? `Siz → ${other}` : `${other} → Siz`,
            date: s.createdAt,
            amount: s.amount,
            net:
              (s.fromUserId === user.id ? s.amount : 0) -
              (s.toUserId === user.id ? s.amount : 0),
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const expenseNet = myLedger.reduce((acc, e) => acc + e.net, 0);
  const settlementNet = mySettlementLedger.reduce((acc, s) => acc + s.net, 0);
  const showBreakdown = !!user && (myLedger.length > 0 || mySettlementLedger.length > 0);

  // Anything under half a kuruş formats as 0,00, so it must not be shown with a
  // sign or a debt colour just because of accumulated float drift.
  const roundToZero = (value: number) => (Math.abs(value) < 0.005 ? 0 : value);
  const signed = (value: number) => {
    const v = roundToZero(value);
    return `${v > 0 ? '+' : ''}${formatCurrencyTry(v)}`;
  };
  const netColor = (value: number) => {
    const v = roundToZero(value);
    return v > 0 ? t.positive : v < 0 ? t.destructive : t.mutedForeground;
  };

  async function save(key: string, fromUserId: string, toUserId: string, amount: number) {
    setPendingKey(key);
    try {
      await splitData.addSettlement({ groupId: gid, fromUserId, toUserId, amount });
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Ödeme kaydedilemedi.');
    } finally {
      setPendingKey(null);
      dialogOpen.current = false;
    }
  }

  /**
   * Re-derives the suggestion from fresh data after the user confirms.
   *
   * A rendered suggestion can be minutes old, and suggestions are recomputed from
   * net balances, so acting on a stale one records more than the payer actually
   * owes. That flips them into credit and makes every number on the screen look
   * wrong for a reason the screen never explains. Overpaying is still allowed —
   * people do settle up generously — it just has to be a choice.
   */
  async function confirmSettle(key: string, fromUserId: string, toUserId: string, shownAmount: number) {
    setPendingKey(key);
    try {
      await splitData.loadExpensesForGroup(gid);
    } catch {
      // Offline: better to record against slightly old data than to block the payment.
    }
    setPendingKey(null);

    const freshMembers = splitData.getMembers(gid);
    const freshBalances = calculateBalances(
      freshMembers,
      splitData.getExpenses(gid),
      splitData.getSettlements(gid),
      (eid) => splitData.getShares(eid),
      (eid) => splitData.getPayers(eid),
    );
    const fresh = calculateSettlements(freshMembers, freshBalances).find(
      (s) => s.from.id === fromUserId && s.to.id === toUserId,
    );

    if (!fresh) {
      Alert.alert(
        'Bu Borç Kapanmış',
        `${nameFor(fromUserId)} → ${nameFor(toUserId)} ödemesi artık önerilmiyor; aradan başka bir kayıt geçmiş olabilir. Yine de kaydederseniz ters yönde bir borç oluşur.`,
        [
          { text: 'Vazgeç', style: 'cancel', onPress: () => { dialogOpen.current = false; } },
          {
            text: 'Yine de kaydet',
            style: 'destructive',
            onPress: () => void save(key, fromUserId, toUserId, shownAmount),
          },
        ],
        { onDismiss: () => { dialogOpen.current = false; } },
      );
      return;
    }

    if (Math.abs(fresh.amount - shownAmount) > MONEY_EPSILON) {
      Alert.alert(
        'Tutar Değişmiş',
        `Bu borç ekranda ${formatCurrencyTry(shownAmount)} görünüyordu, şu an ${formatCurrencyTry(fresh.amount)}. Arada yeni bir harcama veya ödeme kaydedilmiş.`,
        [
          { text: 'Vazgeç', style: 'cancel', onPress: () => { dialogOpen.current = false; } },
          {
            text: `${formatCurrencyTry(fresh.amount)} kaydet`,
            onPress: () => void save(key, fromUserId, toUserId, fresh.amount),
          },
          {
            text: `Yine de ${formatCurrencyTry(shownAmount)}`,
            onPress: () => void save(key, fromUserId, toUserId, shownAmount),
          },
        ],
        { onDismiss: () => { dialogOpen.current = false; } },
      );
      return;
    }

    await save(key, fromUserId, toUserId, shownAmount);
  }

  function handleSettle(key: string, fromUserId: string, toUserId: string, amount: number) {
    // Set before the Alert opens, not after it is confirmed, so repeated taps
    // can't stack confirmation dialogs on top of each other.
    if (dialogOpen.current) return;
    dialogOpen.current = true;

    Alert.alert(
      'Ödemeyi Onayla',
      `${formatCurrencyTry(amount)} tutarındaki borcun elden veya banka yoluyla ödendiğini onaylıyor musunuz?\n\n(Bu işlem sadece kayıt amaçlıdır, gerçek para transferi yapılmaz.)`,
      [
        { text: 'İptal', style: 'cancel', onPress: () => { dialogOpen.current = false; } },
        { text: 'Kaydet', onPress: () => void confirmSettle(key, fromUserId, toUserId, amount) },
      ],
      { onDismiss: () => { dialogOpen.current = false; } },
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
                {
                  color:
                    roundToZero(myBalance) > 0
                      ? t.positive
                      : roundToZero(myBalance) < 0
                        ? t.destructive
                        : t.foreground,
                },
              ]}
            >
              {formatCurrencyTry(roundToZero(myBalance))}
            </Text>
          </Card>
        ) : null}

        <Text style={[styles.section, { color: t.foreground }]}>Üye Bakiyeleri</Text>
        <Card style={{ gap: Spacing.two }}>
          {members.map((m) => (
            <View key={m.userId} style={styles.row}>
              <Text style={{ color: t.foreground, flex: 1, fontWeight: '600' }}>{m.user.name}</Text>
              <Text style={{ fontWeight: '700', color: netColor(balances[m.userId] ?? 0) }}>
                {formatCurrencyTry(roundToZero(balances[m.userId] ?? 0))}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={[styles.section, { color: t.foreground }]}>Önerilen Ödemeler</Text>
        {settlements.length === 0 ? (
          <Text style={{ color: t.mutedForeground }}>Herkes dengede görünüyor.</Text>
        ) : (
          <View style={{ gap: Spacing.three }}>
            {settlements.map((s, idx) => {
              const key = `${s.from.id}-${s.to.id}-${idx}`;
              return (
              <Card key={key}>
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
                      disabled={pendingKey !== null && pendingKey !== key}
                      loading={pendingKey === key}
                      onPress={() => handleSettle(key, s.from.id, s.to.id, s.amount)}
                      variant="secondary"
                    >
                      {user?.id === s.from.id ? 'Öde' : 'Ödendi'}
                    </Button>
                  )}
                </View>
              </Card>
              );
            })}
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

        {showBreakdown && (
          <>
            <Pressable
              onPress={() => setLedgerOpen((v) => !v)}
              style={[styles.row, { marginTop: Spacing.six }]}
              accessibilityRole="button"
              accessibilityLabel="Bakiyeniz nasıl oluştu?"
            >
              <Text style={[styles.section, { color: t.foreground, marginTop: 0, flex: 1 }]}>
                Bakiye Dökümünüz
              </Text>
              <ChevronDown
                size={18}
                color={t.mutedForeground}
                style={{ transform: [{ rotate: ledgerOpen ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {ledgerOpen && (
              <Card style={{ gap: 0, overflow: 'hidden' }}>
                {/*
                  Only the date and total go on the meta line. "Ödedi X · Payı Y"
                  used to live here too and got truncated on most rows; it is in
                  the detail sheet now, where it has room to be readable.
                */}
                {myLedger.map((entry, idx) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => setDetailId(entry.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.title} detayı`}
                    style={({ pressed }) => [
                      styles.ledgerRow,
                      pressed && { backgroundColor: t.accent },
                      (idx < myLedger.length - 1 || mySettlementLedger.length > 0) && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: t.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 17, width: 26, textAlign: 'center' }}>{entry.icon ?? '📝'}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.foreground, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={{ color: t.mutedForeground, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                        {formatShortDate(entry.date)}  ·  {formatCurrencyTry(entry.amount)}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: netColor(entry.net) }}>
                      {signed(entry.net)}
                    </Text>
                    <ChevronRight size={16} color={t.mutedForeground} />
                  </Pressable>
                ))}

                {mySettlementLedger.length > 0 && (
                  <>
                    <View style={[styles.ledgerGroupHeader, { backgroundColor: `${t.foreground}05` }]}>
                      <Text style={{ color: t.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>
                        KAYITLI ÖDEMELER
                      </Text>
                    </View>
                    {mySettlementLedger.map((entry, idx) => (
                      <View
                        key={entry.id}
                        style={[
                          styles.ledgerRow,
                          idx < mySettlementLedger.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: t.border,
                          },
                        ]}
                      >
                        <View style={[styles.ledgerBadge, { backgroundColor: t.positiveMuted }]}>
                          <Check size={13} color={t.positive} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: t.foreground, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {entry.title}
                          </Text>
                          <Text style={{ color: t.mutedForeground, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                            {formatShortDate(entry.date)}  ·  {formatCurrencyTry(entry.amount)}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: netColor(entry.net) }}>
                          {signed(entry.net)}
                        </Text>
                        {/* Aligns with the expense rows, which are inset by a chevron. */}
                        <View style={{ width: 16 }} />
                      </View>
                    ))}
                  </>
                )}

                <View style={[styles.ledgerFooterBlock, { borderTopColor: t.border, backgroundColor: `${t.foreground}08` }]}>
                  <View style={styles.ledgerFooterRow}>
                    <Text style={{ flex: 1, color: t.mutedForeground, fontSize: 12 }}>Harcamalar</Text>
                    <Text style={{ fontWeight: '600', fontSize: 13, color: t.foreground }}>
                      {signed(expenseNet)}
                    </Text>
                  </View>
                  {mySettlementLedger.length > 0 && (
                    <View style={styles.ledgerFooterRow}>
                      <Text style={{ flex: 1, color: t.mutedForeground, fontSize: 12 }}>Ödemeler</Text>
                      <Text style={{ fontWeight: '600', fontSize: 13, color: t.foreground }}>
                        {signed(settlementNet)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.ledgerFooterRow, styles.ledgerNetRow, { borderTopColor: t.border }]}>
                    <Text style={{ flex: 1, color: t.foreground, fontSize: 13, fontWeight: '700' }}>
                      Net bakiyeniz
                    </Text>
                    <Text style={{ fontWeight: '800', fontSize: 14, color: netColor(myBalance) }}>
                      {signed(myBalance)}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <ExpenseLedgerSheet
        entry={detailEntry}
        payers={detailEntry ? splitData.getPayers(detailEntry.id) : []}
        shares={detailEntry ? splitData.getShares(detailEntry.id) : []}
        currentUserId={user?.id ?? ''}
        groupId={gid}
        nameFor={nameFor}
        onClose={() => setDetailId(null)}
      />
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
  ledgerGroupHeader: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  ledgerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerFooterBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.three,
    // Lines the amounts up with the rows' net column, which is inset by the
    // chevron (16) plus its gap that the footer doesn't have.
    paddingRight: Spacing.three + Spacing.two + 16,
    paddingVertical: Spacing.two,
  },
  ledgerFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 3,
  },
  ledgerNetRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
  },
});
