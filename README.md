# SplitSnap

Shared expense tracking for groups (friends, roommates, trips). **iOS-first** app built with **Expo SDK 55**, **React Native**, **TypeScript**, **Expo Router**, and **Supabase**.

> Project roadmap and university scope: [`ROADMAP.md`](ROADMAP.md) (Turkish). Agent / workflow rules: [`docs/AGENTS.md`](docs/AGENTS.md).

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
- **Supabase client (to add):** `src/lib/supabase.ts`
- **Docs:** [`docs/`](docs/)

## Scripts

| Command | Description |
|--------|-------------|
| `npm start` | Start Metro (use with dev build on simulator/device) |
| `npm run ios` | Build and run iOS dev client |
| `npm run lint` | ESLint via Expo |
| `npm run reset-project` | Template helper — moves starter to `app-example` (use with care) |

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase + Expo](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
