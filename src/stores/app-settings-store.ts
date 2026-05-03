import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type AppThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@splitsnap/theme_mode';

// Synchronous in-memory cache so the hook is never async
let _cachedMode: AppThemeMode = 'system';

// Load from AsyncStorage on startup and update the store
AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    _cachedMode = saved as AppThemeMode;
    // Push to the store after the initial read
    useAppSettingsStore.setState({ themeMode: _cachedMode });
  }
}).catch(() => {/* ignore read errors */});

type AppSettingsState = {
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => void;
};

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  themeMode: _cachedMode,
  setThemeMode: (mode) => {
    _cachedMode = mode;
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {/* ignore write errors */});
    set({ themeMode: mode });
  },
}));
