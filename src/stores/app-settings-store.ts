import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandMMKVStorage } from '@/lib/storage';

export type AppThemeMode = 'system' | 'light' | 'dark';

type AppSettingsState = {
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(persist(
  (set) => ({
    themeMode: 'system' as AppThemeMode,
    setThemeMode: (mode) => {
      set({ themeMode: mode });
    },
  }),
  {
    name: 'splitsnap-app-settings',
    storage: createJSONStorage(() => zustandMMKVStorage),
    partialize: (state) => ({ themeMode: state.themeMode }),
  },
));
