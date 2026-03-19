# AGENTS.md

## Must-Follow Constraints

- This project targets **iOS only**. Do not add Android-related configuration, dependencies, or code.
- Framework: **Expo SDK 55** (React Native 0.83) + **TypeScript**. All source files must use `.ts` / `.tsx` extensions. Never create plain `.js` files.
- Backend: **Supabase** (`@supabase/supabase-js`). Do not write custom backend or server code. All Auth, DB, and Storage operations must go through the Supabase client.
- Database schema changes require a migration plan in `docs/` before implementation.
- OCR must run **on-device** via `expo-doc-vision` (iOS Vision framework). Do not use external OCR services or APIs.
- Never commit `.env` files or Supabase keys. Use `EXPO_PUBLIC_` prefixed env vars in `.env`.

## Tech Stack

| Layer | Package | Purpose |
|-------|---------|---------|
| Framework | Expo SDK 55 | React Native 0.83, TypeScript built-in |
| Navigation | Expo Router | File-based routing in `app/` directory |
| Backend | @supabase/supabase-js | Auth, PostgreSQL, Storage |
| State Management | Zustand | Client state, persist middleware with MMKV |
| Local Storage | react-native-mmkv | Fast synchronous storage, Zustand persist backend |
| Secure Storage | expo-secure-store | Auth tokens only (iOS Keychain) |
| OCR | expo-doc-vision | On-device text recognition (Week 8+) |
| Image Picker | expo-image-picker | Receipt photo capture/selection |

## Validation Before Finishing

- `npx tsc --noEmit` — must pass with zero TypeScript errors
- `npx expo run:ios` — app must launch without crashes in iOS Simulator
- Supabase RLS (Row Level Security) policies must be reviewed after every table change

## Repo Conventions

- **Expo Router file-based routing**: screens live in `app/` directory. Each file becomes a route automatically.
  - `app/(auth)/login.tsx`, `app/(auth)/register.tsx` — auth screens
  - `app/(tabs)/` — main tab navigation after login
  - `app/_layout.tsx` — root layout
- Reusable UI components: `src/components/`
- Supabase calls must be wrapped in `src/services/` — screen components must not call the Supabase client directly
- Type definitions are centralized in `src/types/`
- Zustand stores live in `src/stores/`
- Utility functions in `src/utils/`
- Supabase client initialization in `src/lib/supabase.ts`
- Commit messages may be in Turkish or English, but must be consistent across the repo

## Important Locations

- `ROADMAP.md` — 10-week development roadmap and task checklist (**must remain in Turkish** — it is derived from the university project report)
- `docs/archive/SplitSnap Tanıtım Raporu.md` — original project report (Turkish), data models and architecture plan
- `docs/PROGRESS.md` — detailed weekly progress log, decisions, blockers (the living tracking document)
- `docs/OPTIMIZATION-PROMPT.md` — optimization audit prompt
- `docs/SECURITY-PROMPT.md` — security audit prompt

## ROADMAP.md Rules

- `ROADMAP.md` items are frozen — they mirror the university project report exactly and **must not be edited, reordered, or removed**.
- The only allowed change to existing items is marking them complete: `- [ ]` → `- [x]`.
- Any work done beyond the original plan must be added under a `### Ekstra` heading below the relevant week.
- This ensures the roadmap stays identical to the submitted report while making extra progress visible.

## Change Safety Rules

- Supabase table schema must remain backward-compatible; perform impact analysis before dropping or renaming columns
- When modifying debt/credit calculation logic (`SettlementSummary`), preserve existing test scenarios
- Navigation structure breaking changes require verifying all screens
- Auth flow changes must not break existing session management

## Known Gotchas

- **Expo Go does not work** for this project — `react-native-mmkv` and `expo-doc-vision` require native modules. Always use **dev client** (`npx expo run:ios`).
- Supabase session tokens must be stored via `expo-secure-store` (passed as custom storage adapter to Supabase client). Never use AsyncStorage for tokens.
- `expo-doc-vision` requires iOS 13.0+ and Expo Dev Client.
- If `tsconfig.json` uses path aliases, they must stay in sync with `metro.config.js`.
- Receipt images uploaded to Supabase Storage need file size and format validation.
- Watch for penny rounding inconsistencies in equal-split calculations.
