import type { Expense, ExpenseShare, Group, GroupMember, User } from '@/types';

export const seedUsers: User[] = [
  { id: '1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', avatar: '👨‍💼' },
  { id: '2', name: 'Ayşe Demir', email: 'ayse@example.com', avatar: '👩‍💻' },
  { id: '3', name: 'Mehmet Kaya', email: 'mehmet@example.com', avatar: '👨‍🎨' },
  { id: '4', name: 'Fatma Çelik', email: 'fatma@example.com', avatar: '👩‍🔬' },
  { id: '5', name: 'Ali Öztürk', email: 'ali@example.com', avatar: '👨‍🚀' },
];

export const seedGroups: Group[] = [
  {
    id: '1',
    name: 'Bodrum Tatili 2026',
    description: 'Yaz tatili ortak masraflar',
    createdAt: '2026-03-10T10:00:00Z',
    ownerId: '1',
  },
  {
    id: '2',
    name: 'Ev Arkadaşları',
    description: 'Kiralık ev ortak giderler',
    createdAt: '2026-01-15T09:00:00Z',
    ownerId: '2',
  },
  {
    id: '3',
    name: 'Ofis Kahvaltıları',
    description: 'Haftalık kahvaltı alışverişi',
    createdAt: '2026-02-01T08:00:00Z',
    ownerId: '1',
  },
];

export const seedGroupMembers: GroupMember[] = [
  { groupId: '1', userId: '1', user: seedUsers[0], joinedAt: '2026-03-10T10:00:00Z' },
  { groupId: '1', userId: '2', user: seedUsers[1], joinedAt: '2026-03-10T10:05:00Z' },
  { groupId: '1', userId: '3', user: seedUsers[2], joinedAt: '2026-03-10T10:10:00Z' },
  { groupId: '1', userId: '4', user: seedUsers[3], joinedAt: '2026-03-10T10:15:00Z' },
  { groupId: '2', userId: '2', user: seedUsers[1], joinedAt: '2026-01-15T09:00:00Z' },
  { groupId: '2', userId: '3', user: seedUsers[2], joinedAt: '2026-01-15T09:05:00Z' },
  { groupId: '2', userId: '5', user: seedUsers[4], joinedAt: '2026-01-15T09:10:00Z' },
  { groupId: '3', userId: '1', user: seedUsers[0], joinedAt: '2026-02-01T08:00:00Z' },
  { groupId: '3', userId: '2', user: seedUsers[1], joinedAt: '2026-02-01T08:05:00Z' },
  { groupId: '3', userId: '4', user: seedUsers[3], joinedAt: '2026-02-01T08:10:00Z' },
];

export const seedExpenses: Expense[] = [
  {
    id: 'e1',
    groupId: '1',
    title: 'Otel Rezervasyonu',
    description: '3 gece konaklama',
    amount: 12000,
    date: '2026-03-15T14:00:00Z',
    paidBy: '1',
    paidByUser: seedUsers[0],
    splitType: 'equal',
  },
  {
    id: 'e2',
    groupId: '1',
    title: 'Akşam Yemeği - Deniz Restaurant',
    description: 'İlk gece yemek',
    amount: 2400,
    date: '2026-03-16T20:00:00Z',
    paidBy: '2',
    paidByUser: seedUsers[1],
    splitType: 'equal',
    receiptImageUrl: 'https://images.unsplash.com/photo-1554224311-beee4cb0c3f9?w=400',
  },
  {
    id: 'e3',
    groupId: '1',
    title: 'Market Alışverişi',
    amount: 850,
    date: '2026-03-17T10:00:00Z',
    paidBy: '3',
    paidByUser: seedUsers[2],
    splitType: 'equal',
  },
  {
    id: 'e4',
    groupId: '2',
    title: 'Elektrik Faturası',
    description: 'Şubat ayı',
    amount: 450,
    date: '2026-03-01T12:00:00Z',
    paidBy: '2',
    paidByUser: seedUsers[1],
    splitType: 'equal',
  },
  {
    id: 'e5',
    groupId: '2',
    title: 'İnternet Faturası',
    description: 'Mart ayı',
    amount: 300,
    date: '2026-03-05T09:00:00Z',
    paidBy: '3',
    paidByUser: seedUsers[2],
    splitType: 'equal',
  },
  {
    id: 'e6',
    groupId: '3',
    title: 'Kahvaltı Malzemeleri',
    description: 'Peynir, zeytin, yumurta',
    amount: 420,
    date: '2026-03-18T08:00:00Z',
    paidBy: '1',
    paidByUser: seedUsers[0],
    splitType: 'manual',
  },
];

export const seedExpenseShares: ExpenseShare[] = [
  { expenseId: 'e1', userId: '1', user: seedUsers[0], amount: 3000 },
  { expenseId: 'e1', userId: '2', user: seedUsers[1], amount: 3000 },
  { expenseId: 'e1', userId: '3', user: seedUsers[2], amount: 3000 },
  { expenseId: 'e1', userId: '4', user: seedUsers[3], amount: 3000 },
  { expenseId: 'e2', userId: '1', user: seedUsers[0], amount: 600 },
  { expenseId: 'e2', userId: '2', user: seedUsers[1], amount: 600 },
  { expenseId: 'e2', userId: '3', user: seedUsers[2], amount: 600 },
  { expenseId: 'e2', userId: '4', user: seedUsers[3], amount: 600 },
  { expenseId: 'e3', userId: '1', user: seedUsers[0], amount: 212.5 },
  { expenseId: 'e3', userId: '2', user: seedUsers[1], amount: 212.5 },
  { expenseId: 'e3', userId: '3', user: seedUsers[2], amount: 212.5 },
  { expenseId: 'e3', userId: '4', user: seedUsers[3], amount: 212.5 },
  { expenseId: 'e4', userId: '2', user: seedUsers[1], amount: 150 },
  { expenseId: 'e4', userId: '3', user: seedUsers[2], amount: 150 },
  { expenseId: 'e4', userId: '5', user: seedUsers[4], amount: 150 },
  { expenseId: 'e5', userId: '2', user: seedUsers[1], amount: 100 },
  { expenseId: 'e5', userId: '3', user: seedUsers[2], amount: 100 },
  { expenseId: 'e5', userId: '5', user: seedUsers[4], amount: 100 },
  { expenseId: 'e6', userId: '1', user: seedUsers[0], amount: 140 },
  { expenseId: 'e6', userId: '2', user: seedUsers[1], amount: 140 },
  { expenseId: 'e6', userId: '4', user: seedUsers[3], amount: 140 },
];

const MOCK_ANCHOR_USER_ID = '1';

function cloneSeed() {
  const users = seedUsers.map((u) => ({ ...u }));
  const userById = Object.fromEntries(users.map((u) => [u.id, u])) as Record<string, User>;
  const groups = seedGroups.map((g) => ({ ...g }));
  const groupMembers = seedGroupMembers.map((m) => ({
    ...m,
    user: { ...userById[m.userId] },
  }));
  const expenses = seedExpenses.map((e) => ({
    ...e,
    paidByUser: e.paidByUser ? { ...userById[e.paidBy] } : undefined,
  }));
  const expenseShares = seedExpenseShares.map((s) => ({
    ...s,
    user: s.user ? { ...userById[s.userId] } : undefined,
  }));
  return { users, groups, groupMembers, expenses, expenseShares, userById };
}

function remapUserId(
  state: ReturnType<typeof cloneSeed>,
  fromId: string,
  toId: string,
  profile: User,
) {
  const { users, groups, groupMembers, expenses, expenseShares } = state;
  const filteredUsers = users.filter((u) => u.id !== fromId && u.id !== toId);
  filteredUsers.push(profile);
  const byId = Object.fromEntries(filteredUsers.map((u) => [u.id, u])) as Record<string, User>;

  const nextGroups = groups.map((g) => ({
    ...g,
    ownerId: g.ownerId === fromId ? toId : g.ownerId,
  }));

  const nextMembers = groupMembers.map((m) => {
    const userId = m.userId === fromId ? toId : m.userId;
    const user = byId[userId] ?? m.user;
    return { ...m, userId, user };
  });

  const nextExpenses = expenses.map((e) => ({
    ...e,
    paidBy: e.paidBy === fromId ? toId : e.paidBy,
    paidByUser: byId[e.paidBy === fromId ? toId : e.paidBy],
  }));

  const nextShares = expenseShares.map((s) => {
    const userId = s.userId === fromId ? toId : s.userId;
    return {
      ...s,
      userId,
      user: byId[userId],
    };
  });

  return {
    users: filteredUsers,
    groups: nextGroups,
    groupMembers: nextMembers,
    expenses: nextExpenses,
    expenseShares: nextShares,
  };
}

export function buildInitialSplitStateForUser(profile: User) {
  const cloned = cloneSeed();
  return remapUserId(cloned, MOCK_ANCHOR_USER_ID, profile.id, profile);
}

export { MOCK_ANCHOR_USER_ID };
