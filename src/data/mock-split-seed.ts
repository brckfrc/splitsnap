import type { Expense, ExpenseShare, Group, GroupMember, User } from '@/types';

/** Empty split state for a signed-in user (groups/members/expenses from Supabase). */
export function buildEmptySplitStateForUser(profile: User) {
  return {
    users: [profile],
    groups: [] as Group[],
    groupMembers: [] as GroupMember[],
    expenses: [] as Expense[],
    expenseShares: [] as ExpenseShare[],
  };
}
