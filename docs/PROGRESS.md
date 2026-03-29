# Progress Log

Detailed development tracking for SplitSnap. This is the living document for recording what was done, decisions made, blockers encountered, and anything noteworthy during each week.

`ROADMAP.md` stays aligned with the archive report: weekly checklist lines only toggle `[x]`, extra work under `### Ekstra`, and instructor-facing weekly notes, video links, and screenshot references under `### Haftalık Notlar` / `### Video Linki` / `### Ekran Görselleri`. Do **not** mark items `[x]` based only on mock or placeholder UI when the milestone is not really met — see `docs/AGENTS.md`. This file is an optional **technical** dev log for implementation detail.

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

**Status:** Roadmap Hafta 2 — **5/6** (`ROADMAP.md`): Auth + oturum + tema + ortak bileşenler tamam; **grup listesi ilk sürüm** maddesi kasıtlı olarak açık (aşağıdaki şablon, bu maddeyi karşılamıyor sayılır).

**Tamamlanan (rapor maddeleriyle uyumlu):**
- [x] Supabase projesi (önceden)
- [x] Supabase Auth entegrasyonu — `src/lib/supabase.ts`, `src/services/auth.ts`
- [x] Kayıt / giriş akışı — `src/app/(auth)/login`, `register`
- [x] Oturum yönetimi — `src/contexts/auth-context.tsx`, `onAuthStateChange`, yönlendirme
- [x] Tema + ortak bileşen iskeleti — `src/theme/tokens.ts`, `src/constants/theme.ts`, `src/components/ui/*`

**Kasıtlı olarak ROADMAP’ta açık bırakılan:**
- [ ] **Grup listesi ekranının ilk sürümü** — Expo tarafında `design/`’e benzer ekranlar ve **Zustand + mock seed** ile şablon var; bu, rapordaki “ilk sürüm” çıktısı olarak işaretlenmedi (veri katmanı Supabase değil, kapsam “taslak”).

**Şablon / mock (PROGRESS’te kayıt; Hafta 3+ ROADMAP kapalı):**
- `(app)` altında grup listesi, detay, harcama ekle/düzenle, settlement, profil gibi ekranlar **yerel mock** ile dolaşılabilir; DB tabloları, RLS ve raporun tanıdığı “tam” haftalık teslimler henüz yok.
- `tsconfig.json` **excludes** `design/` — `npx tsc --noEmit` yalnızca Expo uygulamasını doğrular.

**Notes:**
- Typed routes: `src/lib/href.ts` — dinamik path’ler için geçici cast.
- Auth ekranlarında yardımcı metinler `__DEV__` ile sınırlı.

**Blockers:**
- (none)

---

## Week 3 — Database & Group Structure

**Status:** Not started (roadmap)

**Notes:**
- Şablondaki grup UI’si mock; Supabase `group` / `group_member` şeması ve bağlama yapılınca bu hafta maddeleri `ROADMAP` üzerinden işaretlenecek.

---

## Week 4 — Group Detail & Expense Foundation

**Status:** Not started (roadmap)

**Notes:**
- Mock ekranlar var; “backend ile tam bağlanma” ve rapor tanımındaki temel çıktılar tamamlanınca `[x]`.

---

## Week 5 — Expense Management

**Status:** Not started (roadmap)

---

## Week 6 — Splitting & Calculation

**Status:** Not started (roadmap)

---

## Week 7 — Local Storage & Improvements

**Status:** Not started

---

## Week 8+ — Receipt / OCR / Storage

**Status:** Not started (roadmap Hafta 8 maddeleri)

**Notes:**
- Yerel görsel seçimi / placeholder kod varsa bile “fiş altyapısı” ROADMAP maddesi, Storage + ürün gereksinimleri karşılanana kadar `[x]` yapılmaz.

---

## Week 9 — OCR Integration & UI

**Status:** Not started

---

## Week 10 — Final Polish

**Status:** Not started

---

### Ekstra

- [x] `design/` → Expo: `(auth)` / `(app)` dosya rotaları, token tabanlı UI bileşenleri, **mock** grup/harcama akışı (ROADMAP hafta 3+ ile karıştırılmamalı)
- [x] `tsconfig` `design/` exclude — temiz `tsc`
- [x] `useTheme()` — Tamagui `useTheme` + `getVariableValue` ile token’ları **string**’e çözme (Lucide / native SVG `[object Object]` renk uyarılarını önler); önceki `useMemo` tabanlı optimizasyon korunur
- [x] `GroupsListScreen` inline `totalForGroup` / `memberCount` → pre-computed `useMemo` Map'ler ile O(1) erişim
- [x] **Tamagui** — `tamagui.config.ts`, kök `babel.config.js` (`@tamagui/babel-plugin` + Reanimated sırası), `TamaguiProvider` / `Theme` / Inter fontlar `src/app/_layout.tsx`; Sheet tabanlı grup modalları; çeşitli ekranlar Tamagui + mevcut token’larla hizalı
- [x] **Tamagui Sheet / portal** — `package.json`’da doğrudan `@tamagui/portal` + `overrides`; tek fiziksel kopya (nested `@tamagui/sheet` kopyası `PortalDispatchContext` hatasına yol açıyordu)
- [x] **Zustand + React 19** — `useGroupAggregates` / `useExpenseShares` (`src/hooks/`): kök slice + `useMemo`; `getMembers` / `getExpenses` / `getShares` doğrudan selector olarak kullanılmıyor (sonsuz `getSnapshot` döngüsü önlendi)
- [x] **Kalite script’leri** — `npm run typecheck`, `lint:fix`, `check` (`README` + `AGENTS` validation)
- [x] **Dev login bypass** — `EXPO_PUBLIC_DEV_LOGIN_BYPASS` + `dev-auth-bypass` / `auth-context` / auth ekranları paneli (`__DEV__`); production’da kullanılmamalı

### Gelecek İyileştirmeler (Backlog)

- [ ] **Client-side input validation:** email format kontrolü, password strength (min 6 karakter vb.), expense amount üst limiti
- [ ] **`global.css` temizliği:** `src/constants/theme.ts` içindeki `import '@/global.css'` iOS-only projede gereksiz (zararsız ama temizlik maddesi)
- [ ] **Supabase geçişinde RLS policy review** zorunlu — tüm tablo değişikliklerinde
- [ ] **`expo-secure-store` ile hardened auth adapter** — AsyncStorage yerine Supabase session storage
- [ ] **Auth rate limiting UX:** çok fazla başarısız deneme için client-side feedback / cooldown
