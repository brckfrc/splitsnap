/**
 * Pending invite store — persists an invite code across the auth flow.
 *
 * Flow:
 *   1. User taps a universal link while unauthenticated.
 *   2. invite/[code].tsx stores the code here and redirects to /login.
 *   3. After login, groups/index.tsx reads + clears the code and auto-joins.
 */

import { mmkv } from '@/lib/storage';

const KEY = 'pendingInviteCode';

export const pendingInviteStore = {
  set(code: string): void {
    mmkv.set(KEY, code.trim().toUpperCase());
  },
  get(): string | undefined {
    return mmkv.getString(KEY) ?? undefined;
  },
  clear(): void {
    mmkv.remove(KEY);
  },
};
