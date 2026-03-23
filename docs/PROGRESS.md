# Progress Log

Detailed development tracking for SplitSnap. This is the living document for recording what was done, decisions made, blockers encountered, and anything noteworthy during each week.

`ROADMAP.md` stays aligned with the archive report: weekly checklist lines only toggle `[x]`, extra work under `### Ekstra`, and **instructor-facing** weekly notes, video links, and screenshot references under `### Haftalık Notlar` / `### Video Linki` / `### Ekran Görselleri` (filled by the student). This file is an optional **technical** dev log; use it for implementation detail if you want it separate from the roadmap.

---

## Week 1 — Project Setup & Foundation

**Status:** Complete (7/7 roadmap items)

**Roadmap (`ROADMAP.md` Hafta 1) — all done:**
- [x] Proje konusunun netleştirilmesi — tanıtım raporu + `docs/` ile net
- [x] GitHub deposunun oluşturulması — `origin/main`, ilk commit hazırlığı
- [x] React Native + TypeScript proje kurulumunun yapılması — Expo SDK 55, `default@sdk-55` şablonu
- [x] Temel klasör yapısının oluşturulması — `src/app/`, `src/components/`, `assets/`, vb.
- [x] Navigation yapısının ilk kurulumu — Expo Router (`src/app/`)
- [x] Figma üzerinde ilk ekran taslaklarının hazırlanması — tasarım dosyası + `design/figma_template/` referans projesi (`design/figma_screenshots/`)
- [x] Açılış, giriş ve kayıt ekranlarının ilk sürümünün yapılması — `design/figma_template/src/app/components/pages/LoginPage.tsx`, `RegisterPage.tsx`, `RootLayout` ile splash/akış referansı; üretim uygulamasında RN ekranları Hafta 2’de `src/app/(auth)/` altına taşınacak

**Completed (detail):**
- Expo app created with `npx create-expo-app@latest . --template default@sdk-55`
- Dependencies installed: Supabase, Zustand, MMKV, `react-native-nitro-modules`, `expo-secure-store`, `expo-image-picker`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`
- `npx expo install --fix` and `npx expo-doctor` — all checks passed
- First **development build** succeeded: `npx expo run:ios` (Simulator)
- `.env` / `.env.example` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`
- Docs synced: `README.md`, `docs/AGENTS.md`, `ROADMAP.md` archive path, tech stack notes
- **`design/figma_template/`** — Figma-aligned reference UI (Vite + React + Tailwind): login, register, group list/detail, add expense, settlement, profile, modals; see `design/figma_template/README.md` and `design/figma_template/guidelines/`; static shots in `design/figma_screenshots/`

**Decisions:**
- **Expo SDK 55** over bare React Native CLI — official path, faster setup, EAS option later.
- **Expo Router** with routes under **`src/app/`** (template default for this repo).
- **@supabase/supabase-js** for Auth, PostgreSQL, Storage.
- **AsyncStorage** for Supabase `auth.storage` — matches Supabase Expo tutorial; package installed.
- **MMKV + nitro-modules** for fast local storage / future Zustand persist (not for duplicating Supabase session without a plan).
- **expo-secure-store** installed for optional hardening or non-auth secrets later.
- **expo-doc-vision** deferred to Week 8+ — not in baseline `package.json` until OCR work starts.
- **expo-image-picker** for receipt photos when implementing that flow.
- **Dev client only** — MMKV requires native code; use `npm run ios` / `npx expo run:ios`, not Expo Go for full stack.

**Notes:**
- Native folders `ios/` / `android/` are gitignored; regenerate with `expo prebuild` / `expo run:ios` on clone.
- `design/figma_template/` and `design/figma_screenshots/` are tracked in git as design reference (not in `.gitignore`).
- `ROADMAP.md` usage note now points to `docs/archive/SplitSnap Tanıtım Raporu.md` for Section 7 alignment.

**Blockers:**
- (none)

---

## Week 2 — Authentication & Theme

**Status:** In progress (1/6 roadmap items)

**Roadmap (`ROADMAP.md` Hafta 2) — done:**
- [x] Supabase projesinin oluşturulması — proje + Data API URL ve publishable key `.env` içinde

**Roadmap — still open:**
- [ ] Supabase Auth entegrasyonunun yapılması
- [ ] Kullanıcı kayıt ve giriş akışının çalışır hale getirilmesi
- [ ] Oturum yönetimi mantığının kurulması
- [ ] Temel uygulama tema ve ortak bileşen yapısının oluşturulması (SplitSnap teması / tasarım sistemi)
- [ ] Grup listesi ekranının ilk sürümünün hazırlanması

**Completed (detail):**
- Supabase dashboard project created; client env vars documented in `.env.example`

**Notes:**
- Next: `src/lib/supabase.ts`, AsyncStorage `auth.storage`, auth screens in `src/app/(auth)/`

**Blockers:**
- (none)

---

## Week 3 — Database & Group Structure

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 4 — Group Detail & Expense Foundation

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 5 — Expense Management

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 6 — Splitting & Calculation

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 7 — Local Storage & Improvements

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 8 — Receipt & OCR Infrastructure

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 9 — OCR Integration & UI

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 10 — Final Polish & Submission

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)
