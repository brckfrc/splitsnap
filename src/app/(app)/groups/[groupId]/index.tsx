import { ArrowLeft, Receipt, TrendingUp, UserPlus } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { href } from '@/lib/href';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';
import { useTheme } from '@/hooks/use-theme';
import { splitData } from '@/services/split-data';
import { formatCurrencyTry, formatShortDate } from '@/utils/format';
import { userNetBalance } from '@/utils/settlement';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const t = useTheme();
  const { user } = useAuth();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';

  const { group, members, expenses } = useGroupAggregates(gid);

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

  const isOwner = Boolean(user && user.id === group.ownerId);
  const inviteCode = group.inviteCode;
  const groupName = group.name;

  async function shareInviteCode() {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `SplitSnap — "${groupName}" grubuna katılmak için davet kodu: #${inviteCode}`,
      });
    } catch {
      /* kullanıcı iptal */
    }
  }

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
            <ArrowLeft size={22} color={t.foreground} />
          </Pressable>
          <View style={styles.headerTitleRow}>
            <Text
              style={[
                styles.headerTitleText,
                isOwner && inviteCode ? styles.headerTitleTextBesideShare : null,
              ]}
              selectable={Boolean(isOwner && inviteCode)}
              accessibilityLabel={
                isOwner && inviteCode ? `Grup ${group.name}, davet kodu ${inviteCode}` : undefined
              }
            >
              <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header" numberOfLines={1}>
                {group.name}
              </Text>
              {isOwner && inviteCode ? (
                <>
                  {'\n'}
                  <Text style={[styles.inviteHint, { color: t.mutedForeground }]}>#{inviteCode.toUpperCase()}</Text>
                </>
              ) : null}
              {group.description ? (
                <>
                  {'\n'}
                  <Text style={[styles.sub, { color: t.mutedForeground }]}>{group.description}</Text>
                </>
              ) : null}
            </Text>
            {isOwner && inviteCode ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Davet kodunu paylaş"
                onPress={() => void shareInviteCode()}
                style={({ pressed }) => [
                  styles.inviteIconBtn,
                  { backgroundColor: pressed ? `${t.primary}22` : 'transparent' },
                ]}
              >
                <UserPlus size={22} color={t.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { borderColor: `${t.primary}33`, backgroundColor: `${t.primary}0D` }]}>
            <View style={styles.statLabelRow}>
              <Receipt size={16} color={t.mutedForeground} />
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
              <TrendingUp size={16} color={t.mutedForeground} />
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
          <View style={styles.actionCell}>
            <Button
              style={styles.actionButtonFill}
              variant="secondary"
              onPress={() => router.push(href(`/groups/${gid}/settlement`))}
            >
              Ödeme Özeti
            </Button>
          </View>
          <View style={styles.actionCell}>
            <Button
              style={styles.actionButtonFill}
              onPress={() => router.push(href(`/groups/${gid}/add-expense`))}
              accessibilityLabel="Yeni harcama"
            >
              + Harcama Ekle
            </Button>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: t.foreground }]}>Üyeler</Text>
        <Card style={{ gap: Spacing.three }}>
          {members.map((m) => {
            const isAdmin = m.role === 'admin' || m.userId === group.ownerId;
            const left = Boolean(m.leftAt);
            return (
              <View
                key={m.userId}
                style={[styles.memberRow, left && { opacity: 0.55 }]}
              >
                <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                  <Text style={{ fontSize: 18 }}>{m.user.avatar ?? '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: t.foreground }]}>{m.user.name}</Text>
                  <View style={styles.memberMeta}>
                    {isAdmin ? (
                      <Text style={[styles.badge, { color: t.primary, borderColor: `${t.primary}55` }]}>Yönetici</Text>
                    ) : null}
                    {left ? (
                      <Text style={[styles.badge, { color: t.mutedForeground, borderColor: t.border }]}>Ayrıldı</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
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
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  backBtn: { padding: Spacing.two, marginLeft: -Spacing.two, marginTop: 2 },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
    gap: 0,
  },
  headerTitleText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  headerTitleTextBesideShare: { marginRight: Spacing.two },
  inviteIconBtn: {
    padding: Spacing.two,
    marginTop: 2,
    marginLeft: 'auto',
    marginRight: -Spacing.two,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    includeFontPadding: false,
    marginLeft: -2,
  },
  inviteHint: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
    includeFontPadding: false,
  },
  sub: { fontSize: 14, marginTop: Spacing.one, includeFontPadding: false },
  statsRow: { flexDirection: 'row', gap: Spacing.three, alignSelf: 'stretch' },
  statCard: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, padding: Spacing.three },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.one },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.three, alignSelf: 'stretch' },
  actionCell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  actionButtonFill: { alignSelf: 'stretch', width: '100%' },
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
  memberMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: 4 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
