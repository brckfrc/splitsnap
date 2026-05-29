import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // Surfaced instead of crashing: `createClient` throws synchronously on an empty
  // URL, which would otherwise abort the whole app at startup (SIGABRT) on builds
  // where the EXPO_PUBLIC_SUPABASE_* env vars weren't provided (e.g. EAS without
  // the production environment variables set).
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY. ' +
      'Supabase calls will fail until these are configured for this build.',
  );
}

// Use harmless placeholders when unconfigured so module evaluation never throws.
// Requests will fail gracefully and `isSupabaseConfigured` lets the UI react.
export const supabase = createClient(
  supabaseUrl || 'https://unconfigured.supabase.co',
  supabaseKey || 'unconfigured-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
