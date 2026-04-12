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
- [x] Açılış, giriş ve kayıt ekranlarının ilk sürümünün yapılması — `design/figma_template/.../LoginPage.tsx`, `RegisterPage.tsx`, `RootLayout` referansı; üretim uygulamasında karşılıkları `src/app/(auth)/login.tsx`, `register.tsx` ve kök `_layout` akışında

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

**Status:** Roadmap Hafta 2 — **6/6** (`ROADMAP.md`): tüm maddeler tamamlandı.

**Haftalık video:** [Hafta 2 — 29-03-2026](https://youtu.be/ErOGMI0s7SE) (`ROADMAP.md` ile aynı)

**Tamamlanan (rapor maddeleriyle uyumlu):**
- [x] Supabase projesi (önceden)
- [x] Supabase Auth entegrasyonu — `src/lib/supabase.ts`, `src/services/auth.ts`
- [x] Kayıt / giriş akışı — `src/app/(auth)/login`, `register`
- [x] Oturum yönetimi — `src/contexts/auth-context.tsx`, `onAuthStateChange`, yönlendirme
- [x] Tema + ortak bileşen iskeleti — `src/theme/tokens.ts`, `src/constants/theme.ts`, `src/components/ui/*`

- [x] Grup listesi ekranının ilk sürümü — `src/app/(app)/groups/index.tsx`: header, boş durum, grup kartları (sahip rozeti, üye sayısı, toplam tutar), `CreateGroupModal` / `JoinGroupModal` (Tamagui Sheet). Hafta 2 tesliminde liste **mock/Zustand** idi; **Hafta 3**’te aynı ekran Supabase’e bağlandı (`groups-supabase`, `groups-sync`).

**Şablon / mock (PROGRESS’te kayıt; ROADMAP ile karıştırılmamalı):**
- **Gruplar ve üyelik (liste, oluştur, davet kodu):** Hafta 3’ten itibaren **Supabase** (RLS + Realtime). Zustand burada önbellek / UI state.
- **Harcamalar ve paylar:** Hafta 4’ten itibaren **Supabase** (`expenses`, `expense_shares`, `expenses-supabase`, `expenses-sync`, grup segmentinde sync). Zustand önbellek + UI; grup detayda liste, ekleme ve düzenleme akışları uzaktan veriyle çalışır.
- **Settlement / ödeme özeti ekranı:** borç-alacak görünümü ve Hafta 6’daki tam “splitting” ürün hedefi `ROADMAP.md` ile hizalanır; hesaplama çoğunlukla mevcut store + yardımcı fonksiyonlar üzerinden.
- `tsconfig.json` **excludes** `design/` — `npx tsc --noEmit` yalnızca Expo uygulamasını doğrular.

**Notes:**
- Typed routes: `src/lib/href.ts` — dinamik path’ler için geçici cast.
- Kayıt: e-posta onayı açıkken `signUp` sonrası `session === null` ise kullanıcıya doğrulama e-postası hatırlatması (`register.tsx`); ileride Callout bileşeni için backlog’a bakın.

**Blockers:**
- (none)

---

## Week 3 — Database & Group Structure

**Status:** Complete (roadmap Hafta 3 maddeleri + Ekstra)

**Implemented:**
- SQL şema ve RLS: repo’daki `supabase/migrations/20260405140000_week3_core.sql` + `docs/DATABASE.md`
- Uygulama: `src/services/groups-supabase.ts` (fetch, insert `groups`, RPC `join_group_by_invite`), `groups-sync.ts` (Realtime + foreground refetch), `groups.ts` facade; Zustand `replaceGroupsAndMembers` + boş başlangıç `buildEmptySplitStateForUser`
- Auth: dev login bypass kaldırıldı (`dev-auth-bypass`, panel, `EXPO_PUBLIC_DEV_LOGIN_BYPASS` dokümantasyonu)
- Harcamalar Hafta 4’te Supabase’e taşındı (`expenses-supabase`, `expenses-sync`)

---

## Week 4 — Group Detail & Expense Foundation

**Status:** Roadmap Hafta 4 maddeleri tamamlandı (`ROADMAP.md` `[x]`).

**Implemented:**
- `src/services/expenses-supabase.ts` — `fetchExpensesForGroupPayload`, `createExpenseRemote`, `updateExpenseRemote` (eşit bölüşümde tutar değişince pay yenileme), `softDeleteExpenseRemote`; `profiles` ile ödeyen adı; fiş alanı DB’ye yazılmıyor (Hafta 8).
- `src/services/expenses-sync.ts` — `expenses` Realtime (`group_id=eq.{id}`) + AppState refetch; `syncExpensesForGroup` / `stopExpensesBackgroundSync`.
- `src/app/(app)/groups/[groupId]/_layout.tsx` — grup segmentinde expense sync yaşam döngüsü.
- `auth-context.tsx` — çıkışta `stopExpensesBackgroundSync`.
- `split-data-store.ts` + `split-data.ts` — `replaceExpensesAndSharesForGroup`, async `addExpense` / `updateExpense` / `deleteExpense`, `loadExpensesForGroup`.
- `add-expense.tsx`, `edit.tsx` — Supabase; `createdBy`; yükleme durumu.
- `groups-supabase.ts` — `invite_code`, `deleted_at`, üye `role`; grup detayda davet (`Share.share`), yönetici / ayrıldı rozetleri.
- `groups/[groupId]/index.tsx` — üst istatistik kartları ile aynı iki sütun ızgarasında aksiyon butonları (`flexBasis: 0` + hücre sarmalayıcı); solda Ödeme Özeti, sağda + Harcama Ekle; sahip için `#` davet satırı + `UserPlus` paylaşımı; başlık/davet için tek `Text` bloğu ve paylaşım ikonu yokken gereksiz sağ boşluk yok.

**Ek (Nisan 2026 — grup listesi + harcama formu):**
- **Gruplar listesi toplam tutar:** Harcamalar yalnızca grup detay segmentinde sync edildiği için liste ilk açılışta store’da expense yoktu → kartlarda ₺0,00. `groups-sync` artık `loadGroupsFromSupabase` sonrası tüm `group.id` değerleri için `fetchExpensesForGroupsPayload` (tek `expenses` + pay sorguları); `split-data-store` `replaceAllExpensesAndShares`; `split-data.ts` `loadExpensesForAllGroups`. Realtime grup yenilemesinde aynı akış.
- **`DatePickerModal` + `edit.tsx` / `add-expense.tsx`:** Tarih alanı metin yerine iOS/Android native tarih sheet’i (`@react-native-community/datetimepicker`, spinner + sheet düzeni).
- **`add-expense.tsx` UX:** Manuel bölüşümde `Input` `suffix` ile sağda “Kalan: ₺…” (dolu alanda gizlenir); yalnız sayısal giriş ve kişi başı üst sınır (tutarı aşmama); “Kim ödedi?” tek seçili satır + açılır diğer üyeler; kart sırası **önce Harcama Bilgileri**, **altında Fiş Fotoğrafı** (isteğe bağlı).
- **`src/components/ui/input.tsx`:** `suffix` / `onSuffixPress` ile satır içi sağ metin (manuel kalan + dokununca doldurma).

---

## Week 5 — Expense Management

**Status:** Complete (4/4 roadmap items)

**Implemented (Hafta 4 commit'leriyle birlikte):**
- Harcama ekleme: `add-expense.tsx` → `splitData.addExpense` → `createExpenseRemote` (Supabase). Form validasyonu (başlık, tutar, katılımcı kontrolü).
- Harcama düzenleme: `edit.tsx` → `splitData.updateExpense` → `updateExpenseRemote`. Başlık, tutar, tarih güncelleme.
- Harcama silme: `edit.tsx` → onay dialog'u + `splitData.deleteExpense` → `softDeleteExpenseRemote` (soft-delete).
- Ödeyen kişi seçimi: `add-expense.tsx` — tek satır seçili ödeyen + dropdown ile değiştir.
- Katılımcı seçimi: `add-expense.tsx` — `toggleParticipant`, checkbox UI, `selected` Set.
- Eşit bölüşüm: `splitType === 'equal'` → `perEqual` otomatik hesaplama, katılımcı yanında pay gösterimi.
- Manuel bölüşüm: `splitType === 'manual'` → kişi başı input, `suffix` ile kalan miktar, tutar üst sınırı, sayısal giriş kısıtlaması.

**Yapılabilecek ekstralar (Hafta 5):**
- [ ] Pull-to-refresh (grup listesi + grup detay)
- [ ] Harcama silme sonrası toast bildirimi
- [ ] Client-side input validation (login/register + harcama formu inline hatalar)
- [ ] Harcama düzenlemede manuel pay güncelleme (`edit.tsx` — bölüşüm payları)
- [ ] Boş durum iyileştirmeleri (grup detayda harcama yokken CTA)
- [ ] Harcama kartlarına kategori/emoji
- [x] Durumunuz kartı açıklama satırı: bakiye altına "Alacaklısınız" / "Borçlusunuz" / "Eşitsiniz" metni

**Not:** Roadmap maddeleri Hafta 4 commit'leri (`eeb39a8`, `419099d`) kapsamında tamamlandı; Hafta 5 roadmap maddeleri `[x]` olarak işaretlendi.

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

- [x] `design/` → Expo: `(auth)` / `(app)` dosya rotaları, token tabanlı UI bileşenleri; **harcama / settlement** akışı uzun süre yerel mock ile ilerledi. **Gruplar** Hafta 3’ten sonra Supabase — “hepsi mock” sanılmasın (`ROADMAP` / `PROGRESS` hafta satırlarıyla karıştırılmamalı)
- [x] `tsconfig` `design/` exclude — temiz `tsc`
- [x] `useTheme()` — Tamagui `useTheme` + `getVariableValue` ile token’ları **string**’e çözme (Lucide / native SVG `[object Object]` renk uyarılarını önler); önceki `useMemo` tabanlı optimizasyon korunur
- [x] `GroupsListScreen` inline `totalForGroup` / `memberCount` → pre-computed `useMemo` Map'ler ile O(1) erişim
- [x] **Tamagui** — `tamagui.config.ts`, kök `babel.config.js` (`@tamagui/babel-plugin` + Reanimated sırası), `TamaguiProvider` / `Theme` / Inter fontlar `src/app/_layout.tsx`; Sheet tabanlı grup modalları; çeşitli ekranlar Tamagui + mevcut token’larla hizalı
- [x] **Tamagui Sheet / portal** — `package.json`’da doğrudan `@tamagui/portal` + `overrides`; tek fiziksel kopya (nested `@tamagui/sheet` kopyası `PortalDispatchContext` hatasına yol açıyordu)
- [x] **Zustand + React 19** — `useGroupAggregates` / `useExpenseShares` (`src/hooks/`): kök slice + `useMemo`; `getMembers` / `getExpenses` / `getShares` doğrudan selector olarak kullanılmıyor (sonsuz `getSnapshot` döngüsü önlendi)
- [x] **Kalite script’leri** — `npm run typecheck`, `lint:fix`, `check` (`README` + `AGENTS` validation)
- [x] **Dev login bypass** — Hafta 2’de eklenmişti; Hafta 3’te kaldırıldı (yalnızca Supabase Auth)
- [x] **Gruplar listesi — harcama toplamları:** `groups-sync` + batch `fetchExpensesForGroupsPayload` + `replaceAllExpensesAndShares`; liste ekranı ilk girişte doğru toplam (detaya girmeden önce veri).
- [x] **Yeni / düzenle harcama — tarih:** `DatePickerModal` + `add-expense` / `edit` tarih alanı.
- [x] **Yeni harcama — manuel bölüşüm + ödeyen + sıra:** `Input` suffix (kalan), sayısal clamp; tek satır ödeyen + seçici; önce bilgi kartı, altında fiş kartı.
- [x] **`AppToast`:** Ortak `makeToastRenderer` + `displayName` (ESLint `react/display-name`).

### Gelecek İyileştirmeler (Backlog)

- [ ] **Çoklu dil (en / tr):** Uygulama metinleri şu an yalnızca Türkçe; ileride `expo-localization` + i18n katmanı (ör. `i18next` veya benzeri) ile **İngilizce / Türkçe** seçeneği veya cihaz diline göre çeviri
- [x] **Kayıt sonrası bildirim (toast + login yönlendirme):** `register.tsx` artık `react-native-toast-message` ile kısa bildirim gösterip login'e yönlendiriyor; eski kalıcı `info` metni kaldırıldı. `AppToast` bileşeni kök `_layout.tsx`'te render ediliyor.
- [ ] **Client-side input validation:** email format kontrolü, password strength (min 6 karakter vb.), expense amount üst limiti
- [ ] **`global.css` temizliği:** `src/constants/theme.ts` içindeki `import '@/global.css'` iOS-only projede gereksiz (zararsız ama temizlik maddesi)
- [x] **Hosted Supabase RLS düzeltmesi (PostgreSQL 17):** `groups` SELECT politikasına `owner_id = auth.uid()` eklendi (INSERT+RETURNING sırasında SELECT politikası da değerlendirildiği için gerekli); `group_members` SELECT politikasındaki self-referencing subquery `is_group_participant()` SECURITY DEFINER fonksiyonuna yönlendirildi (sonsuz döngü önlemi). Migration + DATABASE.md güncellendi.
- [ ] **Supabase geçişinde RLS policy review** zorunlu — tüm tablo değişikliklerinde
- [ ] **`expo-secure-store` ile hardened auth adapter** — AsyncStorage yerine Supabase session storage
- [ ] **Çoklu ödeyen desteği (split payer):** Şu an bir harcamayı yalnızca tek kişi ödeyebilir (`paidBy: string`). İleride bir ödemeyi birden fazla kişinin karşılaması (ör. A ₺60, B ₺40 ödedi) — `paidBy` → `paidByShares: { userId, amount }[]` dönüşümü, DB şema değişikliği, settlement hesaplama güncellenmesi gerekir.
- [ ] **Auth rate limiting UX:** çok fazla başarısız deneme için client-side feedback / cooldown
- [ ] **Üretim Auth e-postası: custom domain + SMTP (hosted Supabase)** — Zorunlu değil; MVP’de built-in gönderici veya e-posta onayı kapalı test yeterli. Ürün büyüyünce veya `429: email rate limit exceeded` (built-in ~2 e-posta/saat) sorununda: ürün subdomain’i veya kök domain (`splitsnap.borak.dev`, ileride ayrı alan adı) için DNS, Dashboard’da **Custom SMTP** (Resend, SendGrid, Postmark vb.), redirect / site URL ve e-posta şablonlarındaki linklerin aynı domainle uyumu
- [ ] **Davet kodu + tıklanabilir davet linki (grup sahibi paylaşımı):** Şu an `UserPlus` → `Share.share` ile düz metin + `#KOD`. Backend / ürün tarafında **custom domain** (ve istenirse **Universal Links / App Links**) oturduktan sonra: paylaşılan içerikte güvenilir bir **HTTPS join URL**’si (`https://<domain>/join?…` veya benzeri); ikon tıklanınca sheet veya paylaşım sheet’inde link + kod birlikte; link tıklanınca uygulama / web’de gruba katılım akışı. Domain yokken kısa `app.supabase.co` veya rastgele deep link güven vermez; bu yüzden özellik custom domain sonrasına ertelendi.
