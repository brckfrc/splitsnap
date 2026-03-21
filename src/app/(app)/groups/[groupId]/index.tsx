import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/use-theme';
import { splitData, useSplitDataStore } from '@/services/split-data';
import { formatCurrencyTry, formatShortDate } from '@/utils/format';
import { userNetBalance } from '@/utils/settlement';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const t = useTheme();
  const { user } = useAuth();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';

  const snapshot = useSplitDataStore((s) => ({
    group: s.getGroup(gid),
    members: s.getMembers(gid),
    expenses: s.getExpenses(gid),
  }));

  const { group, members, expenses } = snapshot;

  if (!group) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.background }]}>
        <Text style={{ color: t.mutedForeground }}>Grup bulunamadı</Text>
        <Button variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.four }}>
          Geri
        </Button>
      </SafeAreaView>
    );
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const balance =
    user ? userNetBalance(user.id, expenses, (eid) => splitData.getShares(eid)) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <View style={styles.headerTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={() => router.push(href('/groups'))}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={t.foreground} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
              {group.name}
            </Text>
            {group.description ? (
              <Text style={[styles.sub, { color: t.mutedForeground }]}>{group.description}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { borderColor: `${t.primary}33`, backgroundColor: `${t.primary}0D` }]}>
            <View style={styles.statLabelRow}>
              <Ionicons name="receipt-outline" size={16} color={t.mutedForeground} />
              <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Toplam Harcama</Text>
            </View>
            <Text style={[styles.statValue, { color: t.primary }]}>{formatCurrencyTry(total)}</Text>
          </Card>
          <Card
            style={[
              styles.statCard,
              balance > 0 && { borderColor: `${t.positive}44`, backgroundColor: t.positiveMuted },
              balance < 0 && { borderColor: `${t.destructive}44`, backgroundColor: `${t.destructive}14` },
            ]}
          >
            <View style={styles.statLabelRow}>
              <Ionicons name="trending-up-outline" size={16} color={t.mutedForeground} />
              <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Durumunuz</Text>
            </View>
            <Text
              style={[
                styles.statValue,
                { color: balance > 0 ? t.positive : balance < 0 ? t.destructive : t.foreground },
              ]}
            >
              {formatCurrencyTry(balance)}
            </Text>
          </Card>
        </View>

        <View style={styles.actions}>
          <Button onPress={() => router.push(href(`/groups/${gid}/add-expense`))} accessibilityLabel="Yeni harcama">
            + Harcama Ekle
          </Button>
          <Button variant="secondary" onPress={() => router.push(href(`/groups/${gid}/settlement`))}>
            Ödeme Özeti
          </Button>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: t.foreground }]}>Üyeler</Text>
        <Card style={{ gap: Spacing.three }}>
          {members.map((m) => (
            <View key={m.userId} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                <Text style={{ fontSize: 18 }}>{m.user.avatar ?? '👤'}</Text>
              </View>
              <Text style={[styles.memberName, { color: t.foreground }]}>{m.user.name}</Text>
            </View>
          ))}
        </Card>

        <Text style={[styles.sectionTitle, { color: t.foreground, marginTop: Spacing.five }]}>Harcamalar</Text>
        {expenses.length === 0 ? (
          <Text style={{ color: t.mutedForeground }}>Henüz harcama yok.</Text>
        ) : (
          <View style={{ gap: Spacing.three }}>
            {expenses.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push(href(`/groups/${gid}/expenses/${e.id}/edit`))}
                accessibilityRole="button"
                accessibilityLabel={`Harcama ${e.title}`}
              >
                <Card>
                  <View style={styles.expRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expTitle, { color: t.foreground }]}>{e.title}</Text>
                      <Text style={[styles.expMeta, { color: t.mutedForeground }]}>
                        {formatShortDate(e.date)} · {e.paidByUser?.name ?? '—'}
                      </Text>
                    </View>
                    <Text style={[styles.expAmount, { color: t.primary }]}>{formatCurrencyTry(e.amount)}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.five },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  backBtn: { padding: Spacing.two, marginLeft: -Spacing.two, marginTop: 2 },
  headerTitle: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: Spacing.one },
  statsRow: { flexDirection: 'row', gap: Spacing.three },
  statCard: { flex: 1, padding: Spacing.three },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.one },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
  body: { paddingHorizontal: Spacing.five, paddingTop: Spacing.five, gap: Spacing.three },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: { fontSize: 16, fontWeight: '500' },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  expTitle: { fontSize: 16, fontWeight: '600' },
  expMeta: { fontSize: 13, marginTop: 4 },
  expAmount: { fontSize: 16, fontWeight: '700' },
});
