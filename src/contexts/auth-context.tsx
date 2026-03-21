import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getSession, mapUser, signOut as authSignOut, subscribeAuth } from '@/services/auth';
import type { AppAuthUser } from '@/services/auth';
import { ensureSplitDataForUser } from '@/services/split-data';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
    setUser(next);
    if (next) {
      ensureSplitDataForUser({ id: next.id, name: next.name, email: next.email, avatar: '👤' });
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
          await SplashScreen.hideAsync().catch(() => {});
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
      setUser(next);
      if (next) {
        ensureSplitDataForUser({ id: next.id, name: next.name, email: next.email, avatar: '👤' });
      }
    });
    return unsub;
  }, []);

  const signOutApp = useCallback(async () => {
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
