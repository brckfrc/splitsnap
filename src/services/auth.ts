import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type AppAuthUser = {
  id: string;
  email: string;
  name: string;
};

function mapUser(user: SupabaseUser | null): AppAuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const nameFromMeta =
    typeof meta?.full_name === 'string'
      ? meta.full_name
      : typeof meta?.name === 'string'
        ? meta.name
        : null;
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    name: nameFromMeta?.trim() || email.split('@')[0] || 'Kullanıcı',
  };
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email: string, password: string): Promise<{ user: AppAuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: mapUser(data.user), error };
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ user: AppAuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  return { user: mapUser(data.user), error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function subscribeAuth(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export { mapUser };
