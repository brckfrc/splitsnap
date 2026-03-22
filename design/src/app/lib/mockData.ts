import { User, Group, GroupMember, Expense, ExpenseShare } from '../types';

export const mockUsers: User[] = [
  { id: '1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', avatar: '👨‍💼' },
  { id: '2', name: 'Ayşe Demir', email: 'ayse@example.com', avatar: '👩‍💻' },
  { id: '3', name: 'Mehmet Kaya', email: 'mehmet@example.com', avatar: '👨‍🎨' },
  { id: '4', name: 'Fatma Çelik', email: 'fatma@example.com', avatar: '👩‍🔬' },
  { id: '5', name: 'Ali Öztürk', email: 'ali@example.com', avatar: '👨‍🚀' },
];

export const mockGroups: Group[] = [
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

export const mockGroupMembers: GroupMember[] = [
  // Bodrum Tatili
  { groupId: '1', userId: '1', user: mockUsers[0], joinedAt: '2026-03-10T10:00:00Z' },
  { groupId: '1', userId: '2', user: mockUsers[1], joinedAt: '2026-03-10T10:05:00Z' },
  { groupId: '1', userId: '3', user: mockUsers[2], joinedAt: '2026-03-10T10:10:00Z' },
  { groupId: '1', userId: '4', user: mockUsers[3], joinedAt: '2026-03-10T10:15:00Z' },
  // Ev Arkadaşları
  { groupId: '2', userId: '2', user: mockUsers[1], joinedAt: '2026-01-15T09:00:00Z' },
  { groupId: '2', userId: '3', user: mockUsers[2], joinedAt: '2026-01-15T09:05:00Z' },
  { groupId: '2', userId: '5', user: mockUsers[4], joinedAt: '2026-01-15T09:10:00Z' },
  // Ofis Kahvaltıları
  { groupId: '3', userId: '1', user: mockUsers[0], joinedAt: '2026-02-01T08:00:00Z' },
  { groupId: '3', userId: '2', user: mockUsers[1], joinedAt: '2026-02-01T08:05:00Z' },
  { groupId: '3', userId: '4', user: mockUsers[3], joinedAt: '2026-02-01T08:10:00Z' },
];

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    groupId: '1',
    title: 'Otel Rezervasyonu',
    description: '3 gece konaklama',
    amount: 12000,
    date: '2026-03-15T14:00:00Z',
    paidBy: '1',
    paidByUser: mockUsers[0],
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
    paidByUser: mockUsers[1],
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
    paidByUser: mockUsers[2],
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
    paidByUser: mockUsers[1],
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
    paidByUser: mockUsers[2],
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
    paidByUser: mockUsers[0],
    splitType: 'manual',
  },
];

export const mockExpenseShares: ExpenseShare[] = [
  // e1 - Otel (4 kişi eşit)
  { expenseId: 'e1', userId: '1', user: mockUsers[0], amount: 3000 },
  { expenseId: 'e1', userId: '2', user: mockUsers[1], amount: 3000 },
  { expenseId: 'e1', userId: '3', user: mockUsers[2], amount: 3000 },
  { expenseId: 'e1', userId: '4', user: mockUsers[3], amount: 3000 },
  // e2 - Yemek (4 kişi eşit)
  { expenseId: 'e2', userId: '1', user: mockUsers[0], amount: 600 },
  { expenseId: 'e2', userId: '2', user: mockUsers[1], amount: 600 },
  { expenseId: 'e2', userId: '3', user: mockUsers[2], amount: 600 },
  { expenseId: 'e2', userId: '4', user: mockUsers[3], amount: 600 },
  // e3 - Market (4 kişi eşit)
  { expenseId: 'e3', userId: '1', user: mockUsers[0], amount: 212.5 },
  { expenseId: 'e3', userId: '2', user: mockUsers[1], amount: 212.5 },
  { expenseId: 'e3', userId: '3', user: mockUsers[2], amount: 212.5 },
  { expenseId: 'e3', userId: '4', user: mockUsers[3], amount: 212.5 },
  // e4 - Elektrik (3 kişi eşit)
  { expenseId: 'e4', userId: '2', user: mockUsers[1], amount: 150 },
  { expenseId: 'e4', userId: '3', user: mockUsers[2], amount: 150 },
  { expenseId: 'e4', userId: '5', user: mockUsers[4], amount: 150 },
  // e5 - İnternet (3 kişi eşit)
  { expenseId: 'e5', userId: '2', user: mockUsers[1], amount: 100 },
  { expenseId: 'e5', userId: '3', user: mockUsers[2], amount: 100 },
  { expenseId: 'e5', userId: '5', user: mockUsers[4], amount: 100 },
  // e6 - Kahvaltı (manuel)
  { expenseId: 'e6', userId: '1', user: mockUsers[0], amount: 140 },
  { expenseId: 'e6', userId: '2', user: mockUsers[1], amount: 140 },
  { expenseId: 'e6', userId: '4', user: mockUsers[3], amount: 140 },
];

// Current logged in user (mock)
export const currentUser: User = mockUsers[0];

// Helper functions
export function getGroupMembers(groupId: string): GroupMember[] {
  return mockGroupMembers.filter((m) => m.groupId === groupId);
}

export function getGroupExpenses(groupId: string): Expense[] {
  return mockExpenses.filter((e) => e.groupId === groupId);
}

export function getExpenseShares(expenseId: string): ExpenseShare[] {
  return mockExpenseShares.filter((s) => s.expenseId === expenseId);
}
