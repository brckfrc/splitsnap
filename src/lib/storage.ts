/**
 * MMKV-backed storage layer.
 *
 * Provides:
 * 1. A shared MMKV instance (`mmkv`) for direct key-value access.
 * 2. A Zustand-compatible `StateStorage` adapter (`zustandMMKVStorage`) so
 *    stores can use `persist(…, { storage: createJSONStorage(() => zustandMMKVStorage) })`.
 */

import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/** App-wide MMKV instance — encrypted with default iOS Keychain protection. */
export const mmkv: MMKV = createMMKV({ id: 'splitsnap-storage' });

/**
 * Zustand `StateStorage` adapter backed by MMKV.
 * Synchronous under the hood but satisfies the async interface Zustand expects.
 */
export const zustandMMKVStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return mmkv.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },
  removeItem: (name: string): void => {
    mmkv.remove(name);
  },
};
