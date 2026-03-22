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
}

export interface GroupMember {
  groupId: string;
  userId: string;
  user: User;
  joinedAt: string;
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
  splitType: 'equal' | 'manual';
  receiptImageUrl?: string;
  ocrSuggestions?: {
    merchantName?: string;
    date?: string;
    total?: number;
  };
}

export interface ExpenseShare {
  expenseId: string;
  userId: string;
  user?: User;
  amount: number;
}

export interface Settlement {
  from: User;
  to: User;
  amount: number;
}
