# Sprint #1: Expo SDK 57 & Tamagui Upgrade (July 2026)

- **Expo SDK 57 Upgrade:** Upgraded to SDK 57 (React Native 0.86, React 19.2.3) for improved stability.
- **Tamagui Duplicate Context Fix:** Aligned all Tamagui packages to `2.5.1` using `overrides` in `package.json`. This fixed duplicate context resolution crashes within Sheet portals.
- **Realtime Connection Fix:** Resolved race conditions and memory leaks on Fast Refresh in `groups-sync.ts` by making channel teardown asynchronous and cleaning up dangling channels via `supabase.getChannels()`.
