# AGENTS.md

## Must-Follow Constraints

- This project **ships for iOS only**. Do not add Android-specific features, dependencies, or branching logic for Android as a supported target. The Expo template may still include `android` / `web` blocks in `app.json` and scripts like `npm run android` / `npm run web` — treat those as **template defaults**, not product requirements (see `README.md`).
- Framework: **Expo SDK 55** (React Native 0.83) + **TypeScript**. All application code under **`src/`** must use `.ts` / `.tsx`. Do not add new plain `.js` files under `src/`. Exceptions: existing tooling (e.g. `scripts/*.js`) and config files the toolchain requires.
- Backend: **Supabase** (`@supabase/supabase-js`). Do not write custom backend or server code. All Auth, DB, and Storage operations must go through the Supabase client.
- Database schema changes require a migration plan in `docs/` before implementation.
- Receipt OCR must be **on-device** (no cloud OCR APIs). Planned package: **`expo-doc-vision`** in Week 8+ — **not installed in the baseline app**; add it when implementing OCR.
- Never commit `.env` files or Supabase keys. Commit **`.env.example`** only (placeholders). Use **`EXPO_PUBLIC_`** prefixed vars in `.env` for client-safe values.

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (Data API).
- `EXPO_PUBLIC_SUPABASE_KEY` — Supabase **publishable** key (or legacy anon key); same role as in [Supabase + Expo docs](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native).
- Do **not** put the database **direct connection string** in the app.
- `EXPO_PUBLIC_DEV_LOGIN_BYPASS` — Optional. Only `true` or `1` has an effect, and **only when `__DEV__` is true** (Metro / simulator dev). Shows a **login + register** shortcut that sets a **local mock user** without a Supabase JWT; `onAuthStateChange` null events are ignored until sign-out. **Do not enable** in release builds, EAS production env, or store submissions. Remove reliance on this once normal Supabase login is enough for day-to-day dev.

### Dev login bypass (implementation map)

- Flag + mock user: [`src/lib/dev-auth-bypass.ts`](../src/lib/dev-auth-bypass.ts)
- Session / listener handling: [`src/contexts/auth-context.tsx`](../src/contexts/auth-context.tsx)
- UI (auth screens only): [`src/components/auth/dev-login-bypass-panel.tsx`](../src/components/auth/dev-login-bypass-panel.tsx)

## Tech Stack

| Layer | Package | Purpose |
|-------|---------|---------|
| Framework | Expo SDK 55 | React Native 0.83, TypeScript built-in |
| Navigation | Expo Router | File-based routing under **`src/app/`** |
| Backend | @supabase/supabase-js | Auth, PostgreSQL, Storage |
| Auth session storage | @react-native-async-storage/async-storage | Default `auth.storage` for Supabase (official Expo tutorial pattern) |
| State Management | Zustand | Client state (package installed; add `src/stores/` and usage when implementing features) |
| Local Storage | react-native-mmkv + react-native-nitro-modules | Fast key-value; Zustand persist backend |
| Secure Storage | expo-secure-store | Optional: extra-sensitive non-Supabase secrets, or future hardened auth adapter |
| OCR (Week 8+) | expo-doc-vision (to add) | On-device text recognition — install when implementing OCR |
| Image Picker | expo-image-picker | Receipt photo capture/selection |
| UI system | tamagui + @tamagui/babel-plugin | `TamaguiProvider`, themes/tokens in [`tamagui.config.ts`](../../tamagui.config.ts); **Sheet** for bottom modals; **Inter** via `expo-font` in root layout. Root `package.json` must list **`@tamagui/portal`** (same version as `tamagui`) + **`overrides`** so npm hoists a **single** `@tamagui/portal` — otherwise `Sheet` modal resolves a nested copy and **`PortalDispatchContext` is null** at runtime. **Do not** add a second `PortalProvider` in `_layout` (duplicate `shouldAddRootHost` breaks portals). |
| Icons | lucide-react-native + react-native-svg | Lucide icons with string `color` (avoids Tamagui themed icon Variable → SVG warnings) |

## Validation Before Finishing

- **`npm run check`** — preferred: runs `typecheck` + `lint` in one step (same as `npm run typecheck` then `npm run lint`)
- `npm run typecheck` — `tsc --noEmit`; root `tsconfig.json` **excludes** `design/` (Vite prototype is reference-only)
- `npm run lint` / `npm run lint:fix` — ESLint via Expo (`lint:fix` applies safe auto-fixes)
- `npx expo run:ios` — app must launch without crashes in iOS Simulator
- Supabase RLS (Row Level Security) policies must be reviewed after every table change

## Repo Conventions

**Target layout** — create these paths as you implement; not every folder exists in a fresh clone.

- **Expo Router** root: **`src/app/`** (not repo-root `app/`). Each route file maps to a URL segment.
  - Example targets: `src/app/(auth)/login.tsx`, `src/app/(auth)/register.tsx`
  - Signed-in shell: `src/app/(app)/` (tabs + stack under one layout); auth: `src/app/(auth)/`
  - Root layout: `src/app/_layout.tsx` — wraps the tree with **TamaguiProvider** + **Theme** (system light/dark) and loads **Inter** fonts before hiding the splash screen.
- Reusable UI: `src/components/` — shared primitives under `ui/`; `useTheme()` in [`src/hooks/use-theme.ts`](../src/hooks/use-theme.ts) reads Tamagui theme values (with fallbacks to [`src/theme/tokens.ts`](../src/theme/tokens.ts)).
- Babel: root [`babel.config.js`](../../babel.config.js) must keep **`react-native-reanimated/plugin` last** and include `@tamagui/babel-plugin` pointing at `tamagui.config.ts`.
- Supabase API calls: wrap in `src/services/` — screens must not import the raw client for data access
- Types: `src/types/`
- Zustand stores: `src/stores/`
- **Zustand + React 19:** `useSyncExternalStore` requires stable snapshots. Do **not** use `useSplitDataStore((s) => ({ ... }))` or selectors that call `getMembers` / `getExpenses` / `getShares` (they `.filter()` → new array every read → infinite loop / “getSnapshot should be cached”). Use root slices + `useMemo`, or [`useGroupAggregates`](../src/hooks/use-group-aggregates.ts) and [`useExpenseShares`](../src/hooks/use-expense-shares.ts). For multi-field objects with stable inner refs, `useShallow` from `zustand/react/shallow` is also valid.
- Utils: `src/utils/`
- Supabase client factory: `src/lib/supabase.ts` (read env from `process.env.EXPO_PUBLIC_*`)
- Commit messages: Turkish or English, but consistent across the repo

## Important Locations

- `ROADMAP.md` — 10-week checklist (**Turkish**). Agents: only `[x]` on weekly items and additions under `### Ekstra`. **Do not** edit content under `### Haftalık Notlar`, `### Video Linki`, or `### Ekran Görselleri` (student / instructor only).
- `design/figma_template/` — Figma-aligned **reference UI** (Vite/React prototype; not the production app). Use for layout/tokens when implementing `src/app/`. Screenshots: `design/figma_screenshots/`.
- `docs/archive/SplitSnap Tanıtım Raporu.md` — original university report
- `docs/PROGRESS.md` — detailed weekly log
- `docs/OPTIMIZATION-PROMPT.md` — optimization audit prompt
- `docs/SECURITY-PROMPT.md` — security audit prompt

## ROADMAP.md Rules

- Weekly checklist items mirror the report and **must not be edited, reordered, or removed** (wording).
- Allowed for agents: `- [ ]` → `- [x]` for completed items; new bullets under **`### Ekstra`** for out-of-plan work.
- **Human-only sections (agents must not add, remove, or change text here):** under each week, **`### Haftalık Notlar`**, **`### Video Linki`**, and **`### Ekran Görselleri`** — used for weekly narrative, demo links, and screenshot references for the course instructor.

### When not to tick `ROADMAP.md`

- **Do not** mark a weekly item `[x]` based only on **mock data**, **placeholder UI**, or a **template/scaffold** that does not meet the milestone as written in the report (e.g. groups/expenses without Supabase-backed persistence and the intended flows).
- **Do not** update `ROADMAP.md` to “catch up” appearances when the implementation is exploratory or incomplete relative to that week’s definition.
- Record that work in **`docs/PROGRESS.md`** instead (what exists, what is mock, what is missing). Optional short note under the relevant week’s **`### Ekstra`** in `ROADMAP.md` is allowed if it helps reviewers (without ticking the formal checklist items).

## Change Safety Rules

- Supabase schema: backward-compatible changes; analyze before drop/rename
- Debt/credit logic (`SettlementSummary`): preserve test scenarios when changing
- Navigation: verify all routes after structural changes
- Auth: do not break session flow when changing storage or client setup

## Known Gotchas

- **Tamagui portals / Sheet:** `TamaguiProvider` already wraps `PortalProvider` (`shouldAddRootHost`). If Metro still throws `PortalDispatchContext cannot be null`, the usual cause is **two physical copies** of `@tamagui/portal` under `node_modules` (e.g. nested under `@tamagui/sheet`). Fix: direct dep + `overrides` in [`package.json`](../../package.json) so only **one** `@tamagui/portal` exists at the repo root. Never add a **second** `PortalProvider` in `_layout`. For **Lucide** / native SVG, `useTheme()` must resolve Tamagui variables to strings — [`use-theme.ts`](../src/hooks/use-theme.ts) uses `getVariableValue` so `color={t.primary}` is never an object.
- **Dev login bypass** (`EXPO_PUBLIC_DEV_LOGIN_BYPASS`): mock user only; no RLS-backed identity. Turn off when testing real auth flows; never ship with this flag set in production env profiles.
- **Expo Go** does not load this project reliably — **MMKV / Nitro** need a **development build**. Use `npm run ios` or `npx expo run:ios`.
- **Storage roles:** AsyncStorage = Supabase auth session (tutorial default). MMKV = app/Zustand persistence. Do not store the same session in two backends without an explicit migration plan.
- **`expo-doc-vision`:** not in `package.json` until Week 8; iOS 13+ and dev client when added.
- Path aliases in `tsconfig.json` must stay in sync with Metro if you add them.
- Receipt uploads: validate size/format before Storage.
- Equal-split math: watch currency rounding.
