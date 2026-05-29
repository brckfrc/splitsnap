import { ArrowLeft, ArrowUpRight, Receipt, TrendingUp, UserPlus } from '@/lib/icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, PressableCard } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { splitData } from '@/services/split-data';
import { formatCurrencyTry, formatShortDate } from '@/utils/format';
import { userNetBalance } from '@/utils/settlement';

const AVATAR_PALETTE = [
  { bg: '#F4B8C1', text: '#7A2E38' },
  { bg: '#F9C9A0', text: '#7A3D0A' },
  { bg: '#F5E4A0', text: '#6B5100' },
  { bg: '#A8E6CF', text: '#1A5C42' },
  { bg: '#A8D8F0', text: '#1A4A6B' },
  { bg: '#C8B8F0', text: '#3D2475' },
  { bg: '#F0C4B0', text: '#6B2E18' },
  { bg: '#B8DFC8', text: '#1E4D35' },
  { bg: '#B0CCF0', text: '#1A3A6B' },
  { bg: '#F0B8D8', text: '#6B1A45' },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarPalette(userId: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const t = useTheme();
  const { user } = useAuth();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';

  const { group, members, expenses, settlements } = useGroupAggregates(gid);

  const scrollRef = useRef<ScrollView>(null);
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
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
    user ? userNetBalance(user.id, expenses, settlements, (eid) => splitData.getShares(eid)) : 0;

  const isOwner = Boolean(user && user.id === group.ownerId);
  const inviteCode = group.inviteCode;
  const groupName = group.name;

  async function shareInviteCode() {
    if (!inviteCode) return;
    const url = `https://splitsnap.borak.dev/invite/${inviteCode.toUpperCase()}`;
    try {
      await Share.share({
        url,   // iOS — link olarak paylaşılır (Messages, WhatsApp vs. önizleme gösterir)
        message: `SplitSnap — "${groupName}" grubuna katılmak için:\n${url}`,
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
            onPress={() => router.back()}
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
          <PressableCard
            style={[styles.statCard, { borderColor: `${t.primary}33`, backgroundColor: `${t.primary}0D` }]}
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            accessibilityLabel="Harcamalar listesine git"
          >
            <View style={styles.statLabelRow}>
              <Receipt size={16} color={t.mutedForeground} />
              <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Toplam Harcama</Text>
            </View>
            <Text style={[styles.statValue, { color: t.primary }]}>{formatCurrencyTry(total)}</Text>
          </PressableCard>
          <PressableCard
            style={[
              styles.statCard,
              balance > 0 && { borderColor: `${t.positive}44`, backgroundColor: t.positiveMuted },
              balance < 0 && { borderColor: `${t.destructive}44`, backgroundColor: `${t.destructive}14` },
            ]}
            onPress={() => router.push(href(`/groups/${gid}/settlement`))}
            accessibilityLabel="Ödeme özetine git"
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.statHint, { color: t.mutedForeground }]}>
                {balance > 0.01 ? 'Alacaklısınız' : balance < -0.01 ? 'Borçlusunuz' : 'Eşitsiniz'}
              </Text>
              <ArrowUpRight size={14} color={t.mutedForeground} style={{ opacity: 0.6 }} />
            </View>
          </PressableCard>
        </View>

        <View style={styles.actions}>
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
        ref={scrollRef}
        contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: t.foreground }]}>Üyeler</Text>
        <Card style={{ gap: Spacing.three }}>
          {(() => {
            const displayed = isMembersExpanded ? members : members.slice(0, 3);
            return displayed.map((m) => {
              const isAdmin = m.role === 'admin' || m.userId === group.ownerId;
              const left = Boolean(m.leftAt);
              const isMe = user?.id === m.userId;
              const initials = getInitials(m.user.name);
              const { bg, text: avatarText } = avatarPalette(m.userId);
              return (
              <View
                key={m.userId}
                style={[
                  styles.memberRow,
                  left && { opacity: 0.55 },
                  isMe && {
                    backgroundColor: t.background === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.12)',
                    borderRadius: 8,
                    paddingHorizontal: Spacing.three,
                    paddingVertical: Spacing.two,
                    marginHorizontal: -Spacing.three,
                  },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: bg }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: avatarText, letterSpacing: 0.5 }}>
                    {initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: t.foreground }]}>
                    {m.user.name} {isMe && <Text style={{ color: t.mutedForeground, fontWeight: '400' }}>(Sen)</Text>}
                  </Text>
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
          });
          })()}
          {members.length > 3 && (
            <Pressable
              onPress={() => setIsMembersExpanded(!isMembersExpanded)}
              style={{ paddingTop: Spacing.two, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, marginTop: Spacing.one }}
            >
              <Text style={{ color: t.primary, fontWeight: '600' }}>
                {isMembersExpanded ? 'Daha Az Göster' : `Tümünü Gör (+${members.length - 3} kişi)`}
              </Text>
            </Pressable>
          )}
        </Card>

        <Text style={[styles.sectionTitle, { color: t.foreground, marginTop: Spacing.five }]}>Harcamalar</Text>
        {expenses.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.seven, gap: Spacing.four }}>
            <Text style={{ fontSize: 48 }}>🧾</Text>
            <Text style={{ color: t.mutedForeground, textAlign: 'center', fontSize: 16 }}>Bu grupta henüz harcama bulunmuyor.</Text>
            <Button
              onPress={() => router.push(href(`/groups/${gid}/add-expense`))}
            >
              İlk Harcamayı Ekle
            </Button>
          </View>
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
                    <View style={[styles.iconContainer, { backgroundColor: t.inputBackground }]}>
                      <Text style={{ fontSize: 24 }}>{e.icon || '📝'}</Text>
                    </View>
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
  statHint: { fontSize: 11, marginTop: 2 },
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
  iconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
