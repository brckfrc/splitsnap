# Progress Log

Detailed development tracking for SplitSnap. This is the living document for recording what was done, decisions made, blockers encountered, and anything noteworthy during each week.

`ROADMAP.md` stays frozen and only gets `[x]` marks. All detailed notes go here.

---

## Week 1 — Project Setup & Foundation

**Status:** In progress (5/7 roadmap items done — see **Pending**)

**Roadmap (`ROADMAP.md` Hafta 1) — done:**
- [x] Proje konusunun netleştirilmesi — tanıtım raporu + `docs/` ile net
- [x] GitHub deposunun oluşturulması — `origin/main`, ilk commit hazırlığı
- [x] React Native + TypeScript proje kurulumunun yapılması — Expo SDK 55, `default@sdk-55` şablonu
- [x] Temel klasör yapısının oluşturulması — `src/app/`, `src/components/`, `assets/`, vb.
- [x] Navigation yapısının ilk kurulumu — Expo Router (`src/app/`)

**Roadmap — still open:**
- [ ] Figma üzerinde ilk ekran taslaklarının hazırlanması
- [ ] Açılış, giriş ve kayıt ekranlarının ilk sürümünün yapılması — şablonda genel ekranlar var; SplitSnap giriş/kayıt henüz yok

**Completed (detail):**
- Expo app created with `npx create-expo-app@latest . --template default@sdk-55`
- Dependencies installed: Supabase, Zustand, MMKV, `react-native-nitro-modules`, `expo-secure-store`, `expo-image-picker`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`
- `npx expo install --fix` and `npx expo-doctor` — all checks passed
- First **development build** succeeded: `npx expo run:ios` (Simulator)
- `.env` / `.env.example` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`
- Docs synced: `README.md`, `docs/AGENTS.md`, `ROADMAP.md` archive path, tech stack notes

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
