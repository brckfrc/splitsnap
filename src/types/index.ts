export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  ownerId: string;
  inviteCode?: string;
  currency?: string;
  deletedAt?: string | null;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  user: User;
  joinedAt: string;
  /** Present when synced from Supabase; omitted in local-only mock flows. */
  leftAt?: string | null;
  /** Group role from Supabase (`admin` | `member`). */
  role?: 'admin' | 'member';
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  date: string;
  paidBy: string;
  paidByUser?: User;
  createdBy?: string;
  splitType: 'equal' | 'manual';
  receiptImageUrl?: string;
  ocrSuggestions?: {
    merchantName?: string;
    date?: string;
    total?: number;
  };
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ExpenseShare {
  expenseId: string;
  userId: string;
  user?: User;
  amount: number;
}

/** Computed "who should pay whom" suggestion from calculateSettlements(). */
export interface SettlementSuggestion {
  from: User;
  to: User;
  amount: number;
}

/** DB-backed payment record (settlements table). */
export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: User;
  toUser?: User;
  amount: number;
  note?: string;
  createdAt: string;
  deletedAt?: string | null;
}
