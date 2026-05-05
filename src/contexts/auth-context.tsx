import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getSession, mapUser, signOut as authSignOut, subscribeAuth } from '@/services/auth';
import type { AppAuthUser } from '@/services/auth';
import { stopExpensesBackgroundSync } from '@/services/expenses-sync';
import { stopGroupsBackgroundSync, syncGroupsForSessionUser } from '@/services/groups-sync';
import { clearSplitSessionData, ensureSplitDataForUser } from '@/services/split-data';

type AuthContextValue = {
  user: AppAuthUser | null;
  initializing: boolean;
  refreshSession: () => Promise<void>;
  signOutApp: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppAuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshSession = useCallback(async () => {
    const session = await getSession();
    const next = mapUser(session?.user ?? null);
    if (next) {
      setUser(next);
      const profile = { id: next.id, name: next.name, email: next.email, avatar: '👤' };
      ensureSplitDataForUser(profile);
      // Fire-and-forget: don't block splash on network sync.
      // MMKV cache will show stale data while this refreshes in background.
      syncGroupsForSessionUser(profile).catch(() => {});
    } else {
      stopGroupsBackgroundSync();
      stopExpensesBackgroundSync();
      clearSplitSessionData();
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
        setUser(next);
        const profile = { id: next.id, name: next.name, email: next.email, avatar: '👤' };
        ensureSplitDataForUser(profile);
        void syncGroupsForSessionUser(profile);
        return;
      }
      stopGroupsBackgroundSync();
      stopExpensesBackgroundSync();
      clearSplitSessionData();
      setUser(null);
    });
    return unsub;
  }, []);

  const signOutApp = useCallback(async () => {
    stopGroupsBackgroundSync();
    stopExpensesBackgroundSync();
    clearSplitSessionData();
    await authSignOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      refreshSession,
      signOutApp,
    }),
    [user, initializing, refreshSession, signOutApp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
