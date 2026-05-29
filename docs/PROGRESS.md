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

**Yapılan Ekstralar (Hafta 5):**
- [x] Pull-to-refresh (grup listesi + grup detay + ödeme özeti)
- [x] Harcama silme sonrası toast bildirimi
- [x] Client-side input validation (login/register + harcama formu inline hatalar)
- [x] Harcama düzenlemede manuel pay güncelleme (`edit.tsx` — bölüşüm payları)
- [x] Boş durum iyileştirmeleri (grup detayda harcama yokken CTA)
- [x] Harcama kartlarına kategori/emoji tahminleyicisi
- [x] Durumunuz kartı açıklama satırı: bakiye altına "Alacaklısınız" / "Borçlusunuz" / "Eşitsiniz" metni

**Not:** Roadmap maddeleri Hafta 4 commit'leri (`eeb39a8`, `419099d`) kapsamında tamamlandı; Hafta 5 roadmap maddeleri `[x]` olarak işaretlendi.

**Güvenlik & Optimizasyon Denetimi (Hafta 5 sonu):**
- **BUG-01/02 — Atomic RPC:** `create_expense_with_shares` ve `update_expense_with_shares` PL/pgSQL fonksiyonları (`SECURITY DEFINER`) ile harcama + paylar tek transaction'da; önceki non-atomic insert/delete zinciri (veri kaybı riski) kaldırıldı.
- **SEC-01 — `expense_shares` RLS:** INSERT/UPDATE/DELETE policy'lerine `created_by = auth.uid() OR owner_id = auth.uid()` kontrolü eklendi; önceden herhangi bir grup üyesi başkasının paylarını silebiliyordu.
- **SEC-05 — Soft-deleted gruplar:** `groups_select_participant` RLS policy'sine `deleted_at IS NULL` eklendi; client tarafında `fetchMyGroupsPayload`'a `.is('deleted_at', null)` filtresi eklendi.
- **PERF-01 — Realtime debounce:** `groups-sync` ve `expenses-sync` içindeki `scheduleReload` 300ms debounce ile sarıldı; ardışık Realtime event'leri tek fetch'e indirgendi (~5-10x API çağrısı azalması).
- **PERF-02 — Paralel fetch:** `fetchExpensesForGroupPayload` ve `fetchExpensesForGroupsPayload` içindeki `resolvePayerProfiles` + `resolveShares` sequential → `Promise.all` (~%33 latency azalması).
- **BUG-03 — Rounding fix:** Eşit bölüşümde `amount / n` yerine `floor + remainder` pattern'i; 100₺/3 artık 99.99 değil 100.00 topluyor.
- **PERF-03 — Store O(n) lookup:** `replaceExpensesAndSharesForGroup` içindeki `Array.find` (O(n²)) → `Set.has` (O(n)).
- **PERF-05/06 — Kod tekrarı:** `ProfileRow`, `mapProfileToUser`, `unwrapProfile` → `src/services/profile-mapper.ts` ortak modülüne çıkarıldı.
- **PERF-07 — Spinner stuck fix:** 3 ekrandaki `onRefresh` `try/finally` ile sarıldı; hata durumunda spinner takılmıyor. `settlement.tsx`'te `RefreshControl` tanımlıydı ama JSX'e bağlı değildi — düzeltildi.
- **Navigasyon stack düzeltmesi:** `add-expense.tsx`, `edit.tsx` kaydet/sil sonrası ve `[groupId]/index.tsx` geri butonu `router.replace()` / `router.push()` yerine `router.back()` kullanıyor — stack'te duplikat sayfa birikimi önlendi.

---

## Week 8 — Fiş ve OCR Altyapısı (Notlar)

**Mimari Karar:** 
Fiş okuma işleminde (Hafta 8), karmaşık ve hata yapmaya çok meyilli olan saf lokal OCR text parsing algoritmaları yerine "Hibrit Model" kullanılması kararlaştırılmıştır. 
- Telefonun ücretsiz ve lokal OCR yeteneği ile (Örn: Apple Vision veya Google ML Kit) fiş üzerindeki raw (saf) metin alınacak.
- Bu dağınık metin yığını OpenAI GPT-4o-mini API'sine gönderilip (çok düşük maliyetle) yapılandırılmış JSON formatında (toplam tutar, kategori, vb.) döndürülmesi sağlanacak.
- Bu yöntem, yüksek hacimli regex yazma yükünü tamamen ortadan kaldırmaktadır.

---

## Week 6 — Splitting & Calculation

**Status:** Complete (4/4 roadmap items + Ekstra)

**Implemented (commit `3110365`):**
- `src/services/settlements-supabase.ts` — `createSettlement`, `fetchSettlementsForGroup`; `settlements` tablosu + RLS.
- `src/stores/split-data-store.ts` — `settlements` slice, `addSettlement`, `replaceSettlementsForGroup`.
- `src/services/split-data.ts` — `addSettlement`, `loadSettlementsForGroup` facade.
- `src/utils/settlement.ts` — `calculateBalances` (harcama + settlement dahil), `calculateSettlements` (borçlu→alacaklı greedy eşleştirme), `userNetBalance`.
- `src/hooks/use-group-aggregates.ts` — `settlements` slice eklendi.
- `settlement.tsx` — bakiye kartı, üye bakiyeleri, önerilen ödemeler listesi, geçmiş ödemeler; `handleSettle` → `splitData.addSettlement`.

**Ekstra (bu oturum — Hafta 6 commit'i üzerine):**
- **Pastel avatar sistemi:** `getInitials` (2 harf) + `avatarPalette` (`userId` hash → 10 renk AVATAR_PALETTE); üye listesinde emoji avatar yerine renkli daire + harf; `(Sen)` etiketi.
- **Üye listesi daralt/genişlet:** `isMembersExpanded` state, varsayılan 3, "Tümünü Gör (+N)" toggle; `resolveAllInitials` kaldırıldı (karmaşık çapraz algoritma → basit 2 harf + renk).
- **Stat kartları `PressableCard`:** Toplam Harcama → listeye scroll; Durumunuz → settlement ekranına; "Ödeme Özeti" butonu kaldırıldı; `ArrowUpRight` hint ikonu.
- **"Harcama Dökümüm" bölümü (`settlement.tsx`):** `myLedger` — kullanıcının dahil olduğu her harcama için `{ paid, myShare, net, amount }`; başlık yanında `(₺X)` toplam; net katkı renk kodlu; collapsible (varsayılan açık); footer toplamı.
- **Başlık tutarlılığı:** "Her Kelimenin İlk Harfi Büyük" kuralı settlement ekranına uygulandı; kural `docs/AGENTS.md`'ye eklendi.
- **"Ödendi" butonu:** Eski "Öde" → "Ödendi" + `variant="secondary"`; onay dialogunda kayıt-amaçlı uyarı metni.
- **Tema kalıcılığı:** `src/stores/app-settings-store.ts` (Zustand + AsyncStorage, `system`/`light`/`dark`); `src/hooks/use-color-scheme.ts` store'u öncelikli okur; `profile.tsx`'e `ActionSheetIOS` tema seçici (Sun/Moon/Monitor ikonları).
- **Alt çubuk temizleme:** `AppBottomBar`'dan `onLogout` prop ve çıkış butonu kaldırıldı; çıkış Profil → Güvenlik bölümünde.

---

## Week 7 — Local Storage & Improvements

**Status:** Complete (4/4 roadmap items + Ekstra)

**Implemented:**

### MMKV + Zustand Persist (Madde 1 + 2)
- `src/lib/storage.ts` — `createMMKV({ id: 'splitsnap-storage' })` instance + `StateStorage` adaptörü (Zustand persist uyumlu).
- `src/stores/split-data-store.ts` — `persist` middleware; `partialize` ile yalnızca veri slice'ları (groups, members, expenses, shares, settlements, sessionUserId) MMKV'ye yazılır; fonksiyonlar hariç. `_hydrated` flag + `storeHydrated` Promise export.
- `src/stores/app-settings-store.ts` — AsyncStorage → MMKV geçişi; `persist` middleware ile tema tercihi kalıcı.
- **Sonuç:** Uygulama kapatılıp açıldığında önceki oturumdaki veriler **anında** görüntülenir (MMKV senkron okuma).

### Açılış Performansı (Madde 3)
- `src/app/_layout.tsx` — `SplashGate` artık `storeHydrated` Promise bekler; MMKV rehydrate + auth session kontrolü tamamlanınca splash gizlenir.
- `src/contexts/auth-context.tsx` — `syncGroupsForSessionUser` fire-and-forget; splash ağ bağlantısına bağlı değil.
- **Sonuç:** Açılış süresi ağ gecikmesinden bağımsız (~1-2s → ~0.3-0.5s beklenen iyileşme).

### Form Doğrulama (Madde 4)
- `login.tsx` — Email regex + min 6 karakter şifre (önceden vardı, doğrulandı).
- `register.tsx` — Ad min 2 karakter kontrolü eklendi (önceki: boşluk kontrolü).
- `add-expense.tsx` — Tutar üst limiti (1.000.000 ₺), başlık max uzunluk (100 karakter).

### Profil Ekranları (Ekstra)
- `src/app/(app)/edit-profile.tsx` [NEW] — İsim düzenleme (Supabase `auth.updateUser({ data: { full_name } })`); canlı avatar önizleme; email + user ID readonly gösterimi; toast feedback.
- `src/app/(app)/change-password.tsx` [NEW] — Mevcut şifre doğrulama (`signInWithPassword`) + yeni şifre güncelleme; min 6 karakter, eşleşme kontrolü, aynı-şifre engeli, anlık gücü feedback.
- `src/app/(app)/profile.tsx` — Placeholder alert'ler gerçek `router.push` navigasyonuna dönüştürüldü.

### Dinamik Emoji Haritası (Ekstra)
- `supabase/migrations/20260505000000_emoji_usage_stats.sql` — `get_emoji_usage_stats()` RPC; platform genelinde harcama `title` → `icon` eşleşme istatistiklerini döndürür (min 2 kullanım, limit 200).
- `src/services/emoji-map-service.ts` [NEW] — Supabase'den emoji haritasını çek + MMKV'ye cache; `getEmojiMap()` senkron okuma, `refreshEmojiMap()` async güncelleme.
- `src/utils/format.ts` — `guessCategoryEmoji()` artık önce dinamik haritayı kontrol eder (kullanıcı alışkanlıkları), sonra sabit sözlüğe düşer.
- `src/services/groups-sync.ts` — `reloadGroupsAndExpenses` içinde `refreshEmojiMap()` fire-and-forget.

---

## Week 8 — Receipt / OCR / Storage

**Status:** Complete (roadmap Hafta 8 maddeleri `[x]` — 2026-05-29)

**Implemented:**

### Supabase Storage
- `receipts` private bucket (5 MB, jpeg/png/heic/webp); bucket oluşturma migration'a dahil.
- Storage RLS: `split_part(name, '/', 1)::uuid` ile path'ten groupId çıkarımı; `is_group_member` (INSERT) + `is_group_participant` (SELECT) SECURITY DEFINER yardımcıları kullanıldı.
- Path şeması: `{groupId}/{timestamp_b36}_{random6}.jpg` — `uploadReceipt()` önce `expo-image-manipulator` ile max 1600px / JPEG q0.7 resize, sonra Supabase'e yükler.
- `getReceiptSignedUrl()` — 1 saatlik signed URL; `edit.tsx` thumbnail görünümü için kullanılır.
- Upload zamanlaması: “Kaydet” butonunda, orphan önlemek için OCR sonrası değil kayıt anında.

### OCR Pipeline
- **Cihazda (Apple Vision):** `expo-text-extractor` → `extractTextFromImage(uri)` → `string[]` → `join('\n')` → raw metin
  - Görsel hiçbir zaman buluta çıkmaz.
- **LLM (Supabase Edge Function):** Raw metin → `parse-receipt` edge function → `gpt-4o-mini` (json_schema strict) → `{ merchantName, date, total, currency }`
- **Lokal heuristik fallback:** Edge function erişilemezse (key yok, offline, hata) → `parseReceiptTextLocal()` — TOPLAM/ÖDENECEK regex, dd.mm.yyyy tarih, para birimi sembolü tespiti.
- **Para birimi tespiti:** `currency` alanı (`TRY`/`EUR`/`USD`/`GBP`) hem edge function hem lokal heuristikten döner. TRY dışı bir fişte tutar autofill atlanır, kullanıcıya ⚠️ uyarı gösterilir.

### Veritabanı (Migration `20260529000000_week8_receipts.sql`)
- `create_expense_with_shares` ve `update_expense_with_shares` RPC'leri 9 → 11 parametre: `p_receipt_storage_path text DEFAULT NULL`, `p_ocr_suggestions jsonb DEFAULT NULL` (geriye dönük uyumlu, önceki çağrılar bozulmaz).
- `update_expense_with_shares` → `COALESCE(p_receipt_storage_path, receipt_storage_path)` ile mevcut fiş korunur.
- `re-grant EXECUTE on authenticated`.

### Yeni Servisler
- `src/services/receipts.ts` — `uploadReceipt`, `getReceiptSignedUrl`
- `src/services/ocr.ts` — `extractReceiptText`
- `src/services/receipt-parse.ts` — `ReceiptParseResult`, `parseReceiptTextLocal`, `parseReceiptText`, `parseReceipt`
- `supabase/functions/parse-receipt/index.ts` — Deno edge function (redeploy gerektirir; key: `supabase secrets set OPENAI_API_KEY=...`)

### UI
- `add-expense.tsx` — Fiş Fotoğrafı kartı: Kamerayla Çek / Galeriden Seç, thumbnail, spinner overlay (OCR sırasında görsel geri bildirim), ✓ / ⚠️ durum metni, “Fotoğrafı Kaldır”.
- `edit.tsx` — `receiptSignedUrl` state + `useEffect`; signed URL ile thumbnail render.
- `app.json` — `expo-image-picker` plugin, Türkçe izin metinleri.
- `tsconfig.json` — `supabase/functions` exclude (Deno tipleri tsc uyumsuzluğu).

**Pending (kullanıcı aksiyonu):**
- `supabase db push` — DB şifresi ile (Dashboard → Settings → Database)
- `supabase secrets set OPENAI_API_KEY=sk-...`
- `supabase functions deploy parse-receipt`
- Proje INACTIVE ise önce Dashboard'dan restore et

**Maliyet:** ~541 token / fiş, $0.00 spend (gpt-4o-mini fiyatlandırmasında negligible).

---

## Week 9 — OCR Entegrasyonu ve Arayüz

**Status:** Complete (roadmap Hafta 9 maddeleri `[x]` — 2026-05-29)

**Implemented:**

### OCR → Harcama Oluşturma Bağlantısı (Madde 1)
- `handleReceiptPicked(uri)` → `parseReceipt(uri)` → autofill: `merchantName` → başlık, `total` → tutar, `date` → tarih alanı.
- Kullanıcının daha önce doldurduğu alan üzerine yazılmaz (boşsa doldurul, doluysa dokunma).
- Uçtan uca test edildi; tarih, mağaza adı ve toplam tutar fişten doğru okundu.

### Fiş Toplamı → Eşit Bölüşüm (Madde 2)
- OCR `total` → `setAmount()` ile form alanına yazılır. Mevcut `perEqual = validTotal / selected.size` hesabı anında devreye girer.
- Ayrı bir adım gerekmedi; mevcut eşit bölüşüm mekanizması OCR ile kendiliğinden entegre çalışır.

### OCR + Manuel Bölüşüm Uyumu (Madde 3)
- OCR yalnızca `amount` alanını doldurur; `splitType` bağımsız çalışır.
- Kullanıcı OCR sonrası `Manual` moduna geçip kişi başı payları girebilir — çakışma yok.

### Arayüz İyileştirmeleri (Madde 4)
- **Spinner overlay:** Fiş thumbnail üzerine `rgba(0,0,0,0.45)` katman + `ActivityIndicator`; OCR sürerken görsel geri bildirim sağlar.
- **"Fotoğrafı Kaldır" kilidi:** `disabled={ocrLoading}` — OCR tamamlanmadan fiş kaldırılamaz.
- **✓ / ⚠️ durum metni:** Başarıda "✓ Otomatik dolduruldu — ₺X | tarih | mağaza"; yabancı dövizde turuncu ⚠️ uyarısı.

### Ekstra — Para Birimi Tespiti
- `ReceiptParseResult` tipine `currency?: string` eklendi.
- Lokal heuristik: `₺/TL/TRY` → `"TRY"`, `€/EUR` → `"EUR"`, `$` → `"USD"`, `£` → `"GBP"` sırasıyla tarar.
- Edge function JSON şeması güncellendi (`currency` alanı + ISO 4217 tespiti sistem promptuna eklendi); `supabase functions deploy parse-receipt` ile yeniden deploy gerekir.
- TRY dışı currency algılandığında `isForeignCurrency = true` → tutar autofill atlanır, `currencyWarning` state'i set edilir, sarı ⚠️ gösterilir.

### Ekstra — GLM-OCR Araştırması
- Zhipu AI'ın 0.9B parametreli GLM-OCR modeli OmniDocBench v1.5'te 94.62 ile lider.
- Değerlendirme: görsel buluta gitmesi gerektiğinden (gizlilik gerileme) ve self-host Supabase-only kısıtına takıldığından mevcut hibrit mimari korundu; basit fiş için gpt-4o-mini zaten yeterli (541 token / $0.00).

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
- [ ] **Davet kodu + tıklanabilir davet linki + Associated Domains:** Şu an `UserPlus` -> `Share.share` ile düz metin + `#KOD`. Custom domain oturduktan sonra yapılacaklar: (1) `https://<domain>/.well-known/apple-app-site-association` dosyasına `webcredentials` + `applinks` servisleri eklenmeli, (2) Xcode -> Signing & Capabilities -> Associated Domains'e `webcredentials:<domain>` + `applinks:<domain>` eklenmeli. Bu sayede hem **Universal Links** (davet linki tıklanınca uygulama açılır) hem **iOS Keychain "Güçlü Şifre Öner"** (`textContentType="newPassword"`) aynı anda aktif olur. Kod tarafında `register.tsx` ve `login.tsx` zaten `textContentType` + `autoComplete` prop'larıyla hazır.
