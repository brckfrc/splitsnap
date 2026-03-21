# AGENTS.md

## Must-Follow Constraints

- This project targets **iOS only**. Do not add Android-related configuration, dependencies, or code.
- Framework: **Expo SDK 55** (React Native 0.83) + **TypeScript**. All source files must use `.ts` / `.tsx` extensions. Never create plain `.js` files.
- Backend: **Supabase** (`@supabase/supabase-js`). Do not write custom backend or server code. All Auth, DB, and Storage operations must go through the Supabase client.
- Database schema changes require a migration plan in `docs/` before implementation.
- Receipt OCR must be **on-device** (no cloud OCR APIs). Planned package: **`expo-doc-vision`** in Week 8+ — **not installed in the baseline app**; add it when implementing OCR.
- Never commit `.env` files or Supabase keys. Commit **`.env.example`** only (placeholders). Use **`EXPO_PUBLIC_`** prefixed vars in `.env` for client-safe values.

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (Data API).
- `EXPO_PUBLIC_SUPABASE_KEY` — Supabase **publishable** key (or legacy anon key); same role as in [Supabase + Expo docs](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native).
- Do **not** put the database **direct connection string** in the app.

## Tech Stack

| Layer | Package | Purpose |
|-------|---------|---------|
| Framework | Expo SDK 55 | React Native 0.83, TypeScript built-in |
| Navigation | Expo Router | File-based routing under **`src/app/`** |
| Backend | @supabase/supabase-js | Auth, PostgreSQL, Storage |
| Auth session storage | @react-native-async-storage/async-storage | Default `auth.storage` for Supabase (official Expo tutorial pattern) |
| State Management | Zustand | Client state; persist via MMKV where needed |
| Local Storage | react-native-mmkv + react-native-nitro-modules | Fast key-value; Zustand persist backend |
| Secure Storage | expo-secure-store | Optional: extra-sensitive non-Supabase secrets, or future hardened auth adapter |
| OCR (Week 8+) | expo-doc-vision (to add) | On-device text recognition — install when implementing OCR |
| Image Picker | expo-image-picker | Receipt photo capture/selection |

## Validation Before Finishing

- `npx tsc --noEmit` — must pass with zero TypeScript errors
- `npx expo run:ios` — app must launch without crashes in iOS Simulator
- Supabase RLS (Row Level Security) policies must be reviewed after every table change

## Repo Conventions

- **Expo Router** root: **`src/app/`** (not repo-root `app/`). Each route file maps to a URL segment.
  - Example targets: `src/app/(auth)/login.tsx`, `src/app/(auth)/register.tsx`
  - Tabs / main shell: `src/app/(tabs)/` (or equivalent group)
  - Root layout: `src/app/_layout.tsx`
- Reusable UI: `src/components/`
- Supabase API calls: wrap in `src/services/` — screens must not import the raw client for data access
- Types: `src/types/`
- Zustand stores: `src/stores/`
- Utils: `src/utils/`
- Supabase client factory: `src/lib/supabase.ts` (read env from `process.env.EXPO_PUBLIC_*`)
- Commit messages: Turkish or English, but consistent across the repo

## Important Locations

- `ROADMAP.md` — 10-week checklist (**Turkish**, frozen tasks; only `[x]` and `### Ekstra`)
- `design/` — Figma-aligned **reference UI** (Vite/React prototype; not the production app). Use for layout/tokens when implementing `src/app/`.
- `docs/archive/SplitSnap Tanıtım Raporu.md` — original university report
- `docs/PROGRESS.md` — detailed weekly log
- `docs/OPTIMIZATION-PROMPT.md` — optimization audit prompt
- `docs/SECURITY-PROMPT.md` — security audit prompt

## ROADMAP.md Rules

- Weekly items mirror the report and **must not be edited, reordered, or removed**.
- Allowed: `- [ ]` → `- [x]` for completed items.
- Beyond-plan work: add under `### Ekstra` under that week.

## Change Safety Rules

- Supabase schema: backward-compatible changes; analyze before drop/rename
- Debt/credit logic (`SettlementSummary`): preserve test scenarios when changing
- Navigation: verify all routes after structural changes
- Auth: do not break session flow when changing storage or client setup

## Known Gotchas

- **Expo Go** does not load this project reliably — **MMKV / Nitro** need a **development build**. Use `npm run ios` or `npx expo run:ios`.
- **Storage roles:** AsyncStorage = Supabase auth session (tutorial default). MMKV = app/Zustand persistence. Do not store the same session in two backends without an explicit migration plan.
- **`expo-doc-vision`:** not in `package.json` until Week 8; iOS 13+ and dev client when added.
- Path aliases in `tsconfig.json` must stay in sync with Metro if you add them.
- Receipt uploads: validate size/format before Storage.
- Equal-split math: watch currency rounding.
