# SplitSnap

Shared expense tracking for groups (friends, roommates, trips). **iOS-first** app built with **Expo SDK 55**, **React Native**, **TypeScript**, **Expo Router**, and **Supabase**.

## Project Tracking

**Primary tracking document:** [`ROADMAP.md`](ROADMAP.md) — weekly progress, notes, screenshots, and video links

## Weekly Progress Videos

**Playlist (all weeks):** [YouTube playlist](https://youtube.com/playlist?list=PLfh_d_SOW477Ie0rM6Yj5QWix_al3jvDc&si=DfWwp8XzHfQsel_b)

| Week | Video |
|------|-------|
| 1 | [Week 1 Video](https://youtu.be/uZ3RfGsreec?si=huxHxwlchSmuWuN4) |

## Requirements

- **Node.js** 20.19+ (Expo SDK 55)
- **macOS + Xcode** for iOS Simulator
- A **Supabase** project (URL + publishable/anon key)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and fill in:

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_KEY`

   Never commit `.env`.

3. **Run on iOS (development build)**

   This project uses **native modules** (e.g. MMKV). Use a **development build**, not Expo Go:

   ```bash
   npm run ios
   ```

   Or: `npx expo run:ios`

   First run generates native projects via prebuild (if `ios/` is ignored in git, this is expected on each fresh clone).

## Project layout

- **Routes / screens:** [`src/app/`](src/app/) — Expo Router (file-based routing)
- **UI components:** [`src/components/`](src/components/)
- **Design reference (Figma export prototype):** [`design/figma_template/`](design/figma_template/) — Vite/React bundle; [`design/figma_screenshots/`](design/figma_screenshots/) for PNGs. Use for visuals when building RN screens (not run in production).
- **Supabase & data layer (to add):** `src/lib/supabase.ts` plus `src/services/`, `src/stores/`, etc. — see [`docs/AGENTS.md`](docs/AGENTS.md) (target layout; not all paths exist until implemented).
- **Docs:** [`docs/`](docs/)

## Scripts

| Command | Description |
|--------|-------------|
| `npm start` | Start Metro (use with dev build on simulator/device) |
| `npm run ios` | Build and run iOS dev client |
| `npm run lint` | ESLint via Expo |
| `npm run reset-project` | Template helper — moves starter to `app-example` (use with care) |
| `npm run android` | Expo template — **not** a supported product target (iOS-only scope; see `docs/AGENTS.md`) |
| `npm run web` | Expo web — optional preview only; not the production target |

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase + Expo](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
