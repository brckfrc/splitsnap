import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { DEV_PREVIEW_USER, isDevLoginBypassEnabled } from '@/lib/dev-auth-bypass';
import { getSession, mapUser, signOut as authSignOut, subscribeAuth } from '@/services/auth';
import type { AppAuthUser } from '@/services/auth';
import { ensureSplitDataForUser } from '@/services/split-data';

type AuthContextValue = {
  user: AppAuthUser | null;
  initializing: boolean;
  refreshSession: () => Promise<void>;
  signOutApp: () => Promise<void>;
  /** Dev only: skip Supabase and set a local preview user. No-op if bypass is disabled. */
  enterDevPreviewUser: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  /** When true, ignore Supabase `null` session updates so preview user is not cleared. */
  const devPreviewActiveRef = useRef(false);

  const refreshSession = useCallback(async () => {
    const session = await getSession();
    const next = mapUser(session?.user ?? null);
    if (next) {
      devPreviewActiveRef.current = false;
      setUser(next);
      ensureSplitDataForUser({ id: next.id, name: next.name, email: next.email, avatar: '👤' });
    } else if (!devPreviewActiveRef.current) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshSession();
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  useEffect(() => {
    const unsub = subscribeAuth((session) => {
      const next = mapUser(session?.user ?? null);
      if (next) {
        devPreviewActiveRef.current = false;
        setUser(next);
        ensureSplitDataForUser({ id: next.id, name: next.name, email: next.email, avatar: '👤' });
        return;
      }
      if (devPreviewActiveRef.current) {
        return;
      }
      setUser(null);
    });
    return unsub;
  }, []);

  const enterDevPreviewUser = useCallback(() => {
    if (!isDevLoginBypassEnabled()) return;
    devPreviewActiveRef.current = true;
    const next: AppAuthUser = {
      id: DEV_PREVIEW_USER.id,
      email: DEV_PREVIEW_USER.email,
      name: DEV_PREVIEW_USER.name,
    };
    setUser(next);
    ensureSplitDataForUser({ id: next.id, name: next.name, email: next.email, avatar: '👤' });
  }, []);

  const signOutApp = useCallback(async () => {
    devPreviewActiveRef.current = false;
    await authSignOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      refreshSession,
      signOutApp,
      enterDevPreviewUser,
    }),
    [user, initializing, refreshSession, signOutApp, enterDevPreviewUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
