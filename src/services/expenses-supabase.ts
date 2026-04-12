import { supabase } from '@/lib/supabase';
import type { Expense, ExpenseShare, User } from '@/types';

type ProfileRow = {
  display_name: string;
  email: string | null;
  avatar_url: string | null;
};

type ExpenseRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  amount: string | number;
  expense_date: string;
  paid_by: string;
  created_by: string;
  split_type: string;
  receipt_storage_path: string | null;
  ocr_suggestions: OcrJson | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

type ProfileIdRow = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
};

type OcrJson = {
  merchant_name?: string;
  date?: string;
  total?: number;
  merchantName?: string;
};

type ShareRow = {
  expense_id: string;
  user_id: string;
  amount: string | number;
  profiles?: ProfileRow | ProfileRow[] | null;
};

function parseAmount(v: string | number): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function mapProfileToUser(userId: string, p: ProfileRow | null | undefined): User {
  if (!p) {
    return { id: userId, name: 'Kullanıcı', email: '', avatar: '👤' };
  }
  return {
    id: userId,
    name: p.display_name || 'Kullanıcı',
    email: p.email ?? '',
    avatar: p.avatar_url ?? '👤',
  };
}

function unwrapProfile(profiles: ShareRow['profiles']): ProfileRow | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

function mapOcrSuggestions(json: OcrJson | null | undefined): Expense['ocrSuggestions'] {
  if (!json) return undefined;
  return {
    merchantName: json.merchantName ?? json.merchant_name,
    date: json.date,
    total: json.total,
  };
}

function mapExpenseRow(row: ExpenseRow, payerById: Map<string, ProfileRow>): Expense {
  const payerProf = payerById.get(row.paid_by) ?? null;
  const paidByUser = mapProfileToUser(row.paid_by, payerProf);
  const dateStr = row.expense_date.slice(0, 10);
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    description: row.description ?? undefined,
    amount: parseAmount(row.amount),
    date: dateStr,
    paidBy: row.paid_by,
    paidByUser,
    createdBy: row.created_by,
    splitType: row.split_type === 'manual' ? 'manual' : 'equal',
    receiptImageUrl: row.receipt_storage_path ?? undefined,
    ocrSuggestions: mapOcrSuggestions(row.ocr_suggestions),
    updatedAt: row.updated_at ?? undefined,
    deletedAt: row.deleted_at,
  };
}

function mapShareRow(row: ShareRow): ExpenseShare {
  const prof = unwrapProfile(row.profiles);
  return {
    expenseId: row.expense_id,
    userId: row.user_id,
    user: mapProfileToUser(row.user_id, prof),
    amount: parseAmount(row.amount),
  };
}

const EXPENSE_COLUMNS = `
  id,
  group_id,
  title,
  description,
  amount,
  expense_date,
  paid_by,
  created_by,
  split_type,
  receipt_storage_path,
  ocr_suggestions,
  created_at,
  updated_at,
  deleted_at
`;

async function resolvePayerProfiles(payerIds: string[]): Promise<Map<string, ProfileRow>> {
  const payerById = new Map<string, ProfileRow>();
  if (payerIds.length === 0) return payerById;

  const { data: profRows, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url')
    .in('id', payerIds);
  if (pErr) throw new Error(pErr.message);
  for (const p of (profRows ?? []) as ProfileIdRow[]) {
    payerById.set(p.id, {
      display_name: p.display_name,
      email: p.email,
      avatar_url: p.avatar_url,
    });
  }
  return payerById;
}

async function resolveShares(expenseIds: string[]): Promise<ExpenseShare[]> {
  if (expenseIds.length === 0) return [];

  const { data: shRows, error: sErr } = await supabase
    .from('expense_shares')
    .select('expense_id, user_id, amount, profiles:user_id(display_name, email, avatar_url)')
    .in('expense_id', expenseIds);

  if (sErr) throw new Error(sErr.message);
  return ((shRows ?? []) as ShareRow[]).map(mapShareRow);
}

export async function fetchExpensesForGroupPayload(groupId: string): Promise<{
  expenses: Expense[];
  expenseShares: ExpenseShare[];
}> {
  const { data: expRows, error: eErr } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false });

  if (eErr) throw new Error(eErr.message);

  const rawExpenses = (expRows ?? []) as ExpenseRow[];
  const payerById = await resolvePayerProfiles([...new Set(rawExpenses.map((r) => r.paid_by))]);
  const expenses = rawExpenses.map((row) => mapExpenseRow(row, payerById));
  const expenseShares = await resolveShares(expenses.map((e) => e.id));
  return { expenses, expenseShares };
}

export async function fetchExpensesForGroupsPayload(groupIds: string[]): Promise<{
  expenses: Expense[];
  expenseShares: ExpenseShare[];
}> {
  if (groupIds.length === 0) return { expenses: [], expenseShares: [] };

  const { data: expRows, error: eErr } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .in('group_id', groupIds)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false });

  if (eErr) throw new Error(eErr.message);

  const rawExpenses = (expRows ?? []) as ExpenseRow[];
  const payerById = await resolvePayerProfiles([...new Set(rawExpenses.map((r) => r.paid_by))]);
  const expenses = rawExpenses.map((row) => mapExpenseRow(row, payerById));
  const expenseShares = await resolveShares(expenses.map((e) => e.id));
  return { expenses, expenseShares };
}

export type CreateExpenseInput = {
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  expenseDate: string;
  paidBy: string;
  createdBy: string;
  splitType: 'equal' | 'manual';
  shares: { userId: string; amount: number }[];
};

export async function createExpenseRemote(input: CreateExpenseInput): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('empty_title');
  if (input.amount <= 0) throw new Error('invalid_amount');
  if (input.shares.length === 0) throw new Error('no_shares');

  const dateStr = input.expenseDate.slice(0, 10);

  const { data: exp, error: insErr } = await supabase
    .from('expenses')
    .insert({
      group_id: input.groupId,
      title,
      description: input.description?.trim() || null,
      amount: input.amount,
      expense_date: dateStr,
      paid_by: input.paidBy,
      created_by: input.createdBy,
      split_type: input.splitType,
      receipt_storage_path: null,
      ocr_suggestions: null,
    })
    .select('id')
    .single();

  if (insErr || !exp) {
    throw new Error(insErr?.message ?? 'insert_failed');
  }

  const expenseId = (exp as { id: string }).id;

  const shareRows = input.shares.map((s) => ({
    expense_id: expenseId,
    user_id: s.userId,
    amount: s.amount,
  }));

  const { error: shErr } = await supabase.from('expense_shares').insert(shareRows);

  if (shErr) {
    await supabase.from('expenses').delete().eq('id', expenseId);
    throw new Error(shErr.message);
  }
}

export type UpdateExpenseInput = {
  expenseId: string;
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  expenseDate: string;
  splitType: 'equal' | 'manual';
};

export async function updateExpenseRemote(input: UpdateExpenseInput): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error('empty_title');
  if (input.amount <= 0) throw new Error('invalid_amount');
  const dateStr = input.expenseDate.slice(0, 10);

  const { error: upErr } = await supabase
    .from('expenses')
    .update({
      title,
      description: input.description?.trim() || null,
      amount: input.amount,
      expense_date: dateStr,
    })
    .eq('id', input.expenseId);

  if (upErr) throw new Error(upErr.message);

  if (input.splitType === 'equal') {
    const { data: sh, error: selErr } = await supabase
      .from('expense_shares')
      .select('user_id')
      .eq('expense_id', input.expenseId);

    if (selErr) throw new Error(selErr.message);
    const userIds = ((sh ?? []) as { user_id: string }[]).map((r) => r.user_id);
    if (userIds.length === 0) return;

    const each = input.amount / userIds.length;
    const { error: delErr } = await supabase.from('expense_shares').delete().eq('expense_id', input.expenseId);
    if (delErr) throw new Error(delErr.message);

    const newRows = userIds.map((user_id) => ({
      expense_id: input.expenseId,
      user_id,
      amount: each,
    }));
    const { error: insErr } = await supabase.from('expense_shares').insert(newRows);
    if (insErr) throw new Error(insErr.message);
  }
}

export async function softDeleteExpenseRemote(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', expenseId);

  if (error) throw new Error(error.message);
}
