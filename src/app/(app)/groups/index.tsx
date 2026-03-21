import { router } from 'expo-router';
import { ChevronRight, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateGroupModal } from '@/components/modals/create-group-modal';
import { JoinGroupModal } from '@/components/modals/join-group-modal';
import { Button } from '@/components/ui/button';
import { PressableCard } from '@/components/ui/card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/use-theme';
import { groupsService } from '@/services/groups';
import { useSplitDataStore } from '@/services/split-data';
import type { Group } from '@/types';
import { formatCurrencyTry } from '@/utils/format';

const EMPTY_GROUPS: Group[] = [];

export default function GroupsListScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | undefined>();

  const allGroups = useSplitDataStore((s) => s.groups);
  const expenses = useSplitDataStore((s) => s.expenses);
  const groupMembers = useSplitDataStore((s) => s.groupMembers);

  const groups = useMemo(() => {
    if (!user) return EMPTY_GROUPS;
    const ids = new Set(groupMembers.filter((m) => m.userId === user.id).map((m) => m.groupId));
    return allGroups.filter((g) => ids.has(g.id));
  }, [user, allGroups, groupMembers]);

  const groupTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.groupId] = (map[e.groupId] ?? 0) + e.amount;
    }
    return map;
  }, [expenses]);

  const groupMemberCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of groupMembers) {
      map[m.groupId] = (map[m.groupId] ?? 0) + 1;
    }
    return map;
  }, [groupMembers]);

  function openCreate() {
    setNewName('');
    setNewDesc('');
    setCreateOpen(true);
  }

  function submitCreate() {
    if (!user) return;
    const owner = { id: user.id, name: user.name, email: user.email, avatar: '👤' };
    groupsService.create({
      name: newName,
      description: newDesc,
      ownerId: user.id,
      owner,
    });
    setCreateOpen(false);
  }

  function submitJoin() {
    if (!user) return;
    setJoinError(undefined);
    const u = { id: user.id, name: user.name, email: user.email, avatar: '👤' };
    const ok = groupsService.join({ groupId: joinCode.trim(), user: u });
    if (!ok) {
      setJoinError('Grup bulunamadı veya zaten üyesiniz.');
      return;
    }
    setJoinOpen(false);
    setJoinCode('');
  }

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
              Gruplarım
            </Text>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>Merhaba, {firstName} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <Button variant="secondary" size="sm" onPress={() => setJoinOpen(true)} accessibilityLabel="Gruba katıl">
              Katıl
            </Button>
            <Button size="sm" onPress={openCreate} accessibilityLabel="Grup oluştur">
              + Oluştur
            </Button>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: APP_TAB_BAR_CONTENT_INSET }]}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <View style={styles.empty} accessibilityLabel="Grup yok">
            <Text style={styles.emptyEmoji}>🏖️</Text>
            <Text style={[styles.emptyTitle, { color: t.foreground }]}>Henüz grup yok</Text>
            <Text style={[styles.emptyBody, { color: t.mutedForeground }]}>
              Arkadaşlarınızla ortak harcamaları takip etmek için bir grup oluşturun veya mevcut bir gruba katılın
            </Text>
            <View style={styles.emptyActions}>
              <Button onPress={openCreate}>Grup Oluştur</Button>
              <Button variant="secondary" onPress={() => setJoinOpen(true)}>
                Gruba Katıl
              </Button>
            </View>
          </View>
        ) : (
          groups.map((group: Group) => (
            <PressableCard
              key={group.id}
              onPress={() => router.push(href(`/groups/${group.id}`))}
              accessibilityLabel={`Grup ${group.name}`}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.groupName, { color: t.foreground }]}>{group.name}</Text>
                    {user && group.ownerId === user.id ? (
                      <View style={[styles.badge, { backgroundColor: `${t.primary}18` }]}>
                        <Text style={[styles.badgeText, { color: t.primary }]}>Sahip</Text>
                      </View>
                    ) : null}
                  </View>
                  {group.description ? (
                    <Text style={[styles.desc, { color: t.mutedForeground }]} numberOfLines={2}>
                      {group.description}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Users size={16} color={t.mutedForeground} />
                      <Text style={[styles.metaText, { color: t.mutedForeground }]}>
                        {groupMemberCounts[group.id] ?? 0} kişi
                      </Text>
                    </View>
                    <Text style={[styles.total, { color: t.primary }]}>{formatCurrencyTry(groupTotals[group.id] ?? 0)}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={t.mutedForeground} />
              </View>
            </PressableCard>
          ))
        )}
      </ScrollView>

      <CreateGroupModal
        visible={createOpen}
        name={newName}
        description={newDesc}
        onChangeName={setNewName}
        onChangeDescription={setNewDesc}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreate}
      />
      <JoinGroupModal
        visible={joinOpen}
        code={joinCode}
        onChangeCode={setJoinCode}
        onClose={() => {
          setJoinOpen(false);
          setJoinError(undefined);
        }}
        onSubmit={submitJoin}
        error={joinError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: Spacing.one },
  headerActions: { flexDirection: 'row', gap: Spacing.two, flexShrink: 0 },
  list: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    gap: Spacing.four,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardMain: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  groupName: { fontSize: 18, fontWeight: '600' },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 14, marginTop: Spacing.two, marginBottom: Spacing.three },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14 },
  total: { fontSize: 15, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.seven,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyBody: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  emptyActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four, flexWrap: 'wrap', justifyContent: 'center' },
});
