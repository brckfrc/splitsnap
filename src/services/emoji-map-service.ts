/**
 * Dynamic emoji map service.
 *
 * Fetches platform-wide emoji usage stats from Supabase and caches them
 * in MMKV for instant access. The map is refreshed once per app launch
 * (during group sync) and used by the expense form to provide smarter
 * emoji suggestions based on actual user behavior.
 */

import { mmkv } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const MMKV_KEY = '@splitsnap/emoji_map';

/** keyword → emoji (highest usage wins) */
export type EmojiMap = Record<string, string>;

let _cachedMap: EmojiMap | null = null;

/**
 * Returns the current emoji map from memory cache or MMKV.
 * Falls back to an empty object if nothing is cached yet.
 */
export function getEmojiMap(): EmojiMap {
  if (_cachedMap) return _cachedMap;

  const raw = mmkv.getString(MMKV_KEY);
  if (raw) {
    try {
      _cachedMap = JSON.parse(raw) as EmojiMap;
      return _cachedMap;
    } catch {
      // corrupt data — ignore
    }
  }

  return {};
}

/**
 * Fetches emoji usage stats from Supabase and updates MMKV + memory cache.
 * Called once per app launch during group sync (fire-and-forget).
 */
export async function refreshEmojiMap(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('get_emoji_usage_stats');

    if (error || !data) return;

    // Build a keyword → emoji map. The RPC returns results ordered by
    // usage_count DESC, so the first occurrence of each keyword wins.
    const map: EmojiMap = {};
    for (const row of data as { keyword: string; icon: string; usage_count: number }[]) {
      const key = row.keyword?.toLowerCase()?.trim();
      if (key && row.icon && !map[key]) {
        map[key] = row.icon;
      }
    }

    _cachedMap = map;
    mmkv.set(MMKV_KEY, JSON.stringify(map));
  } catch {
    // Non-critical — keep stale cache
  }
}
