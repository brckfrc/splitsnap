/**
 * Account service — sensitive account-level operations.
 */

import { supabase } from '@/lib/supabase';

/**
 * Permanently deletes the current user's account via the `delete-account`
 * Edge Function. The function anonymizes the profile and disables login so the
 * account can never be accessed again, while shared expense history is retained
 * in anonymized form (Apple Guideline 5.1.1(v)).
 *
 * The caller is responsible for signing out afterwards.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) {
    throw new Error(error.message ?? 'Hesap silinemedi.');
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error) || 'Hesap silinemedi.');
  }
}
