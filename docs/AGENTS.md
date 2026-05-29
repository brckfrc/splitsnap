# AGENTS.md

## Must-Follow Constraints

- This project **ships for iOS only**. Do not add Android-specific features, dependencies, or branching logic for Android as a supported target. The Expo template may still include `android` / `web` blocks in `app.json` and scripts like `npm run android` / `npm run web` — treat those as **template defaults**, not product requirements (see `README.md`).
- Framework: **Expo SDK 55** (React Native 0.83) + **TypeScript**. All application code under **`src/`** must use `.ts` / `.tsx`. Do not add new plain `.js` files under `src/`. Exceptions: existing tooling (e.g. `scripts/*.js`) and config files the toolchain requires.
- Backend: **Supabase** (`@supabase/supabase-js`). Do not write custom backend or server code. All Auth, DB, and Storage operations must go through the Supabase client.
- Database schema changes require a migration plan in [`docs/DATABASE.md`](./DATABASE.md) (or an update to that file) before implementation.
- Receipt OCR: **hybrid** approach. Image→text: **on-device** via `expo-text-extractor` (Apple Vision, installed Week 8). Text→JSON: **Supabase Edge Function `parse-receipt`** → `gpt-4o-mini` (key stored as Supabase secret `OPENAI_API_KEY` — never in client bundle, never `EXPO_PUBLIC_`). Falls back to local heuristic when the edge function is unavailable. Supabase Edge Functions are permitted for the OCR/LLM proxy (they are part of the Supabase platform, not a custom server).
- Never commit `.env` files or Supabase keys. Commit **`.env.example`** only (placeholders). Use **`EXPO_PUBLIC_`** prefixed vars in `.env` for client-safe values.

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL (Data API).
- `EXPO_PUBLIC_SUPABASE_KEY` — Supabase **publishable** key (or legacy anon key); same role as in [Supabase + Expo docs](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native).
- Do **not** put the database **direct connection string** in the app.
- `OPENAI_API_KEY` — **Supabase secret only** (`supabase secrets set OPENAI_API_KEY=sk-...`). Used exclusively by the `parse-receipt` Edge Function. Must **never** appear in `.env`, `EXPO_PUBLIC_*`, or be committed to git.

## Tech Stack

| Layer | Package | Purpose |
|-------|---------|---------|
| Framework | Expo SDK 55 | React Native 0.83, TypeScript built-in |
| Navigation | Expo Router | File-based routing under **`src/app/`** |
| Backend | @supabase/supabase-js | Auth, PostgreSQL, Storage |
| Auth session storage | @react-native-async-storage/async-storage | Default `auth.storage` for Supabase (official Expo tutorial pattern) |
| State Management | Zustand | Client state; store’lar **`src/stores/`** altında (ör. [`split-data-store.ts`](../src/stores/split-data-store.ts)); yeni özellikler için aynı düzeni izle |
| Local Storage | react-native-mmkv + react-native-nitro-modules | Fast key-value; Zustand persist backend |
| Secure Storage | expo-secure-store | Optional: extra-sensitive non-Supabase secrets, or future hardened auth adapter |
| OCR (Week 8) | expo-text-extractor (installed) | On-device text recognition — Apple Vision on iOS, ML Kit on Android. Was listed as "expo-doc-vision" in earlier notes; that package does not exist. |
| Image resize | expo-image-manipulator (installed) | Resize receipt images before upload (~1600px, jpeg q0.7) |
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
- Supabase API calls: wrap in `src/services/` — screens must not import the raw client for data access (groups: [`groups-supabase.ts`](../src/services/groups-supabase.ts), sync: [`groups-sync.ts`](../src/services/groups-sync.ts))
- Types: `src/types/`
- Zustand stores: `src/stores/` (ör. `split-data-store.ts`); yeni slice’lar burada
- **Localization:** Şu an UI string’leri **Türkçe** sabit; **en / tr** i18n planı `docs/PROGRESS.md` backlog’unda — yeni ekranlarda çeviri katmanı yoksa Türkçe ile devam et veya i18n eklendiğinde anahtarları ortak sözlüğe taşı
- **Türkçe başlık yazım kuralı:** Ekran başlıkları, section başlıkları ve kart başlıkları (`sectionTitle`, `cardTitle`, `topTitle`, `section` stillerindeki `Text` bileşenleri) **Her Kelimenin İlk Harfi Büyük** olarak yazılır — örn. "Üye Bakiyeleri", "Harcama Dökümüm", "Önerilen Ödemeler". İstisna: `profile.tsx` ALL CAPS settings stili (`HESAP`, `UYGULAMA`, `GÜVENLİK`) kasıtlıdır, dokunma.
- **Zustand + React 19:** `useSyncExternalStore` requires stable snapshots. Do **not** use `useSplitDataStore((s) => ({ ... }))` or selectors that call `getMembers` / `getExpenses` / `getShares` (they `.filter()` → new array every read → infinite loop / “getSnapshot should be cached”). Use root slices + `useMemo`, or [`useGroupAggregates`](../src/hooks/use-group-aggregates.ts) and [`useExpenseShares`](../src/hooks/use-expense-shares.ts). For multi-field objects with stable inner refs, `useShallow` from `zustand/react/shallow` is also valid.
- Utils: `src/utils/`
- Supabase client factory: `src/lib/supabase.ts` (read env from `process.env.EXPO_PUBLIC_*`)
- Commit messages: Turkish or English, but consistent across the repo

## Important Locations

- `ROADMAP.md` — 10-week checklist (**Turkish**). Agents: only `[x]` on weekly items and additions under `### Ekstra`. **Do not** edit content under `### Haftalık Notlar`, `### Video Linki`, or `### Ekran Görselleri` (student / instructor only).
- `design/figma_template/` — Figma-aligned **reference UI** (Vite/React prototype; not the production app). Use for layout/tokens when implementing `src/app/`. Screenshots: `design/figma_screenshots/`.
- `docs/archive/SplitSnap Tanıtım Raporu.md` — original university report
- `docs/DATABASE.md` — PostgreSQL / Supabase ER diyagramı, tablolar, RLS stratejisi ve backend planı (tek kaynak)
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
- **Expo Go** does not load this project reliably — **MMKV / Nitro** need a **development build**. Use `npm run ios` or `npx expo run:ios`.
- **Storage roles:** AsyncStorage = Supabase auth session (tutorial default). MMKV = app/Zustand persistence. Do not store the same session in two backends without an explicit migration plan.
- **OCR package:** `expo-text-extractor` (installed, Week 8). Earlier notes mention `expo-doc-vision` — that package does not exist; ignore any reference to it.
- Path aliases in `tsconfig.json` must stay in sync with Metro if you add them.
- Receipt uploads: validate size/format before Storage.
- Equal-split math: watch currency rounding.
