# SplitSnap Post-Release Roadmap & Backlog

This document tracks the active backlog, future enhancements, and recent updates for SplitSnap.

## Active Status
- **Pending before submission:** the Sprint #3 migrations (`20260727215500`, `20260727223000`) have to be pushed to the hosted database, and Build 13 predates both the `MONEY_EPSILON` change and the Sprint #4 settlement work, so it needs a rebuild. Push the migrations **first**: the server is stricter than the shipped client either way, and the order only affects which error a user sees in the gap. See **Where to start next** near the bottom for the full sequence.
- **Current Version:** `v1.2.0` (Build 13, pending submission). `v1.0.0` is the version live on the App Store: `v1.1.0` / Build 12 was submitted but its review was cancelled before approval, so it never shipped and its changes are folded into the 1.2.0 release notes.
- **Framework:** Expo SDK 57 (React Native 0.86.0) + React 19 + TypeScript
- **Backend:** Supabase (Auth, DB, Edge Functions, Storage)

---

### Future Enhancements & Backlog

> Findings below marked **[Audit 2026-07-27]** came out of a full codebase sweep (architecture, money math, backend security, UX). The critical ones were re-verified against source before being written down. See **Suggested Order & Dependencies** near the bottom for what blocks what.

### 🔐 Security & Data Integrity

*This section is new. Group isolation itself holds: a non-member cannot read another group's rows through RLS, no secrets ship in the client bundle (only the Supabase URL and anon key), and the `delete-account` edge function verifies its JWT properly. The gaps are all about **write integrity inside a group** and about **cost**.*

- [ ] **[High] An Old Client Editing an Expense Reassigns Who Paid It:** [Found 2026-07-28 while checking old-build compatibility]
  - **The bug:** when `p_payers` is empty, `update_expense_with_shares` deletes every payer row and inserts a single one for **`auth.uid()`** — the person doing the editing — for the full amount (`20260726172500_split_payer.sql:250-253`, preserved verbatim in `20260727215500`). Any client that predates multi-payer sends no `p_payers`, so a v1.0.0 user who edits nothing but the title of someone else's expense silently becomes its sole payer, and on a multi-payer expense the split is flattened. `expenses.paid_by` is not touched by the RPC, so afterwards the two disagree: `paid_by` still names the original payer while balances follow `expense_payers`.
  - **Not caught by the audit:** the payer total still equals the amount, so every group keeps summing to zero and `expense_integrity_audit.sql` stays clean. It is wrong attribution, not broken arithmetic — which is exactly why nobody would notice until someone disputes who paid.
  - **Already live.** This shipped with the multi-payer migration and is reachable in production today; it is not introduced by the write-integrity work. v1.0.0 is the version on the App Store, so it is reachable by real users right now.
  - **Fix:** treat an empty `p_payers` on *update* as "leave the payers alone" instead of "reset them to me". Capture the existing rows before the delete; keep them if they still sum to the new amount, pro-rate them if the amount changed (`split-data.ts:191-206` already does exactly this client-side), and only fall back to a single payer when there were none. The current client always sends payers, so this changes nothing for new builds — it just stops old ones from rewriting history.
- [ ] **[Medium] `settlements` Rows Are Neither Immutable Nor Sanity-Checked:** [Audit 2026-07-27]
  - **The gap:** `20260412140000_week4_expenses.sql:208-228`. The comment above the policy says settlements are immutable, but the policy allows a party to the settlement to UPDATE the whole row, `amount` included.
  - **Also missing, found 2026-07-27:** the table has `settlements_amount_positive` but **no `from_user_id <> to_user_id` check**, even though `friend_requests` got exactly that constraint (`week3_core.sql:29`). A payment to yourself nets to zero in `calculateBalances`, so it can't corrupt a balance, but it can be inserted straight through PostgREST and would then sit in Geçmiş Ödemeler as a payment that means nothing. `settlement.tsx` derives the breakdown with the same expression as the balance math specifically so such a row can't desync the two.
  - **Fix:** one migration — restrict UPDATE to `deleted_at` only (trigger or `WITH CHECK` freezing `amount`, `from_user_id`, `to_user_id`) and add the distinct-users constraint.
- [ ] **[Medium] Direct `expenses` Table Writes Allow an Arbitrary `paid_by`:** [Audit 2026-07-27]
  - **The gap:** `20260412140000_week4_expenses.sql:86-122`. The INSERT policy checks active membership and `created_by = auth.uid()`, but never constrains `paid_by`; the UPDATE policy doesn't pin `paid_by`, `created_by` or `group_id`. A member can bypass the RPC and write an expense attributed to someone else.
  - **Fix:** `WITH CHECK` that `paid_by` is an active member of `group_id`, or revoke direct table writes entirely and force everything through the RPCs.
- [ ] **[Medium] Hardened Auth Storage:** *(moved here from Core Features, it's a security item)*
  - **Description:** Supabase sessions live in `AsyncStorage` (`src/lib/supabase.ts:29`), readable from a device backup or a compromised device. Move to a custom storage adapter over `expo-secure-store`. Note that `expo-secure-store` is **already installed and listed as a plugin but never used**, so this is half-configured today.
- [ ] **[Low] An Equal Split Under One Kuruş per Person Is Now Rejected:** [Found 2026-07-28]
  - **The gap:** the equal-split branch in `split-data.ts` (`:102-109` and `:168-175`) does not filter zero-amount shares the way the manual branch does. When `amount / n < 0.01` — a 2-kuruş expense across three people — it produces `[0.01, 0, 0]`, and `validate_expense_allocations` rejects any share `<= 0`. Affects every build, not just old ones.
  - **Fix:** filter zeros in the equal branch too. The remaining rows still sum to the total, so validation passes. Absurd amounts, one-line fix, and it removes a raw RPC error from a path the client could have handled.
- [ ] **[Low] Assorted Backend Hardening:** [Audit 2026-07-27]
  - `delete-account/index.ts:78,89` returns internal `detail: err.message` to the client on 500; log server-side and return a generic error instead.
  - `get_emoji_usage_stats` (`20260505000000_emoji_usage_stats.sql`) has no explicit `search_path`, `REVOKE` or `GRANT`. It's `SECURITY INVOKER` so RLS still filters it, but it's the only function not locked down like the others.
  - [x] ~~`.gitignore` covers `.env` and `.env*.local` but not `.env.*`, so a stray `.env.staging` could be committed. Add `.env.*` with a `!.env.example` exception.~~
  - `profiles.email` is readable by co-group members and is selected by the client. Drop it from group-scoped projections unless it's actually needed.
- [ ] **[Low] Confirm Intent: Former Members Keep Full Read Access:** [Audit 2026-07-27]
  - `is_group_participant` deliberately ignores `left_at`, so someone who leaves a group can still read its expenses, settlements and receipt images. `docs/DATABASE.md` §9 documents this as intentional (they need to see history they were part of), but it's worth an explicit product decision now that receipts contain photos. If it should be revoked on leave, the SELECT policies need `is_group_member` instead.

### 🚀 Core Features & Logic

- [ ] **[High] Onboarding & Verification Flow Upgrade:**
  - **Description:** Re-enable email confirmation in Supabase and handle the unconfirmed session UX state gracefully. Display a modern email verification waiting screen, followed by a profile customization wizard (display name, currency preferences, and UI theme selection) that all new sign-ups must go through.
  - **Note:** The onboarding wizard is architecturally decoupled from login/signup: both standard signup and social OAuth (Google/Apple) signups will route first-time users here to complete their profiles before accessing groups. The avatar picker is split out into its own item below.
- [ ] **[High] Social & Passwordless Sign-In (Sosyal ve Şifresiz Giriş Seçenekleri):**
  - **Description:** Implement native OAuth sign-in options for Google and Apple, and passwordless authentication using 1-time OTP codes (or Magic Links) via email. On iOS, use native Apple Sign-In (`expo-apple-authentication`) and native Google Sign-In (`@react-native-google-signin/google-signin`). Integrate with Supabase Auth using identity tokens (`signInWithIdToken`).
  - **Prerequisites:** Developer account setups: Apple Developer Program (App ID config, Services ID, and key generation) and Google Cloud Console (OAuth Client IDs for iOS, Android, and Web), plus configuring Supabase Auth settings.
- [ ] **[High] Password Reset Flow (missing entirely):** [Audit 2026-07-27]
  - **Description:** There is no "Şifremi unuttum" anywhere in the app: no UI, no `resetPasswordForEmail` call, no deep-link handler for the recovery link. A user who forgets their password today is permanently locked out with no self-service path. Needs a request screen, the Supabase recovery email template, a deep-link route that opens a set-new-password screen, and reuse of the existing `validateNewPassword` + strength meter.
- [ ] **[Medium] Profile Avatars (not built at all):** [Audit 2026-07-27]
  - **Description:** `profiles.avatar_url` exists in the schema and `mapProfileToUser` reads it, but nothing ever writes it and every surface renders initials instead. (`horizontal-avatar-picker.tsx` is unrelated despite the name; it selects which members share an expense.) Real avatars need an image picker, a new Storage bucket with its own RLS, resize-on-upload, and a display component with an initials fallback.
  - **Watch out:** the upload path must use the ArrayBuffer approach, not `Blob`. See the receipt upload bug in Recent Updates; the exact same React Native `FormData` serialisation trap applies here.
- [ ] **[Medium] Localization (en / tr):**
  - **Description:** Add English/Turkish multi-language support based on device locale or user preference.
  - **Scope check (2026-07-27):** roughly 200 string literals contain Turkish-specific characters, and the real count including ASCII-only strings ("Grup", "Toplam", …) is likely north of 400, spread across ~10.5k lines. Still tractable, but the cost grows with every screen added. Two consequences worth noting: the formal/informal voice cleanup below should ideally happen *inside* the translation file rather than twice, and the Activity Log's action-to-sentence mapping should be written against a dictionary from day one.
- [ ] **[Medium] Auth Rate Limiting UX:**
  - **Description:** Add client-side visual feedback and temporary cooldowns for multiple failed login attempts.
- [ ] **[Medium] Group Activity Log (İşlem Logu / Aktivite Geçmişi):**
  - **Description:** A chronological audit feed per group: who added/edited/deleted an expense, who joined or left, who recorded or undid a settlement. Reachable from an icon in the group detail header next to the invite (`UserPlus`) button, on its own `groups/[groupId]/activity.tsx` screen.
  - **Already done (DB side):** The `activity_log` table (plus `activity_log_archive`), its indexes and RLS policies already exist from `20260405140000_week3_core.sql`, and the action taxonomy (`expense.created/updated/deleted`, `settlement.created/deleted`, `member.joined/left/removed`, `group.updated/deleted`) is documented in `docs/DATABASE.md` §3.8. **Nothing has ever been written to or read from it**; the client side is entirely unbuilt.
  - **Decision, write via DB triggers rather than app-side inserts:** Log rows will be produced by `AFTER INSERT/UPDATE/DELETE` triggers on `expenses`, `settlements` and `group_members` rather than by instrumenting each service call. Triggers cannot be bypassed by a missed call path, an older client build, or a direct RPC, so coverage is guaranteed. Note that `create_expense_with_shares` / `update_expense_with_shares` are `SECURITY DEFINER`, so the trigger must resolve the actor from `auth.uid()` explicitly rather than relying on the session role.
  - **Remaining work:** trigger migration, `ActivityLogEntry` type, an `activity-log-supabase.ts` fetch service (paginated on `created_at` + `id`), and the screen itself. Visible to all group members. The feed starts empty; existing history is not backfillable.
- [ ] **[Medium] Itemized Receipt Splitting (Item-by-Item Allocation):**
  - **Description:** Allow users to split scanned receipt items individually (assigning specific line items to specific members) rather than only splitting the total invoice amount. Requires DB support for line items and a modular selection flow.
- [ ] **[Medium] Flexible Multi-Currency Support (Çoklu Para Birimi):**
  - **Description:** Allow transactions in multiple currencies (EUR, USD, etc.) with flexible conversion rules. Users should be able to convert at historical rates (transaction date), current live rates, or keep balances in original currencies without converting.
- [ ] **[Low] Easy Debt Settlement & QR/IBAN Integration (Kolay Borç Ödeme):**
  - **Description:** Frictionless settlement options by letting creditors easily share their IBAN, generating dynamic payment QR codes (FAST compatible), or linking out to payment options.
- [ ] **[Low] Bank/Card Transaction Auto-Import (Banka/Kart Entegrasyonu):**
  - **Description:** Explore card transaction imports via SMS notification parsing or Open Banking APIs to automatically suggest draft expenses to groups.

### 🎨 UI/UX Polish & Modernization

- [ ] **[Medium] Unified Auth Screen & Modernization (Segmented Giriş/Kayıt Ekranı):**
  - **Description:** Replace the two separate login and register screens with a single, modern unified screen utilizing a segmented control to switch between login and signup modes. This screen will also house the Google & Apple sign-in options and passwordless email OTP. Redesign with a modern look (logo/wordmark, refined typography, card/gradient backgrounds, smooth field styling) while keeping shared validation, password strength meter, and eye-toggles intact.
  - **Architectural Flow:** When OAuth (Google/Apple) or email registration completes for a first-time user, instead of directing them to the dashboard, the auth context will route them directly to the new Onboarding Wizard (`Onboarding & Verification Flow Upgrade`) to configure their profile.
- [ ] **[Medium] Card Stack UI for Payer/Split Selection:**
  - **Description:** Fine-tune swipe animations and gestures for the new custom BottomSheets, ensuring ultra-smooth card-stack style sliding interactions.
- [ ] **[Low] Privacy Policy & Terms Link on the Register Screen:**
  - **Description:** The privacy policy exists at [splitsnap.borak.dev/privacy](https://splitsnap.borak.dev/privacy) and is linked from App Store Connect, but nothing in the app itself points to it: a user can create an account without ever being shown where the data handling, the OpenAI OCR step or the account deletion behaviour are described. Add a small line under the register CTA ("Kaydolarak Gizlilik Politikası'nı kabul etmiş olursunuz") linking out to it, and consider a matching entry in Profil. No consent checkbox is needed; Apple doesn't require one for a free app with no subscription, so this is about discoverability rather than compliance.
  - **Related fix, unblocked and worth doing first:** section 5 of the published policy still describes deletion as **Profil → Hesabı Sil**, which stopped being the path when the dedicated deletion screen landed. It is now **Profil → Profili Düzenle → Tehlikeli Alan → Hesabı Sil**. A reviewer checking the policy against the app would hit that mismatch. The site lives outside this repo, so this is a website edit.
- [ ] **[Low] Liquid Glass Progressive Enhancement (iOS 26+ Compatibility):**
  - **Description:** Implement dynamic visual refraction and blur transitions using `expo-glass-effect` for native compatibility with the iOS 26 Liquid Glass design language, falling back to static premium glassmorphism on older iOS versions.
  - **Candidate surfaces (where it makes sense):**
    - **Floating island bottom bar** (`app-bottom-bar.tsx`) — the #1 fit: a floating capsule hovering over scrolling content is exactly the Liquid Glass use case (translucent capsule + the center `+` button as a glass element).
    - **Bottom sheets** (`ui/bottom-sheet.tsx` and everything built on it: quick-add group picker, balance-groups sheet, expense ledger detail, create/join group, date picker) — glass sheet surface and/or a blurred backdrop instead of the current flat dim.
    - **Sticky screen headers / top bars** (Anasayfa header, group-detail header, and the `topBar` in change-password / edit-profile / delete-account) — translucent headers that let content blur through when scrolled under them.
  - **Where NOT to use it:** content cards (dashboard summary, expense rows, member amount cards) should stay solid for text legibility and contrast; glass there hurts readability. Keep glass to floating/overlay chrome only.
- [ ] **[Low] Biometric App Lock (FaceID / TouchID ile Uygulama Kilidi):**
  - **Description:** Provide an optional privacy lock setting in the Profile. Since the app stores user tokens and keeps the session active automatically (meaning users are not logged out on app close), biometrics are not needed for logging in. Instead, FaceID/TouchID will act as a local privacy shield (`expo-local-authentication`) when opening the app or before doing highly sensitive actions (e.g. deleting an account).

### 🐛 Bugs & Performance

- [ ] **[High] Retrying a Failed Save Can Create a Duplicate Expense:** [Audit 2026-07-27]
  - **The bug:** every write in `split-data.ts` is "remote RPC, then `loadExpensesForGroup`" (e.g. `:131-146` for create, also update, delete and `addSettlement`). If the RPC succeeds but the follow-up fetch fails on a flaky connection, the screen reports an error and the user taps save again, producing a **second identical expense**. The write itself is server-authoritative and otherwise sound, so this is purely about how failure is reported.
  - **Fix options:** distinguish "write failed" from "write succeeded, refresh failed" and only allow retry on the former; or make the create idempotent with a client-generated key.
- [ ] **[Medium] A Recomputed Suggestion Looks Like an Unexplained New Demand:** [User report 2026-07-27]
  - **What's left of the item above.** Suggestions are recomputed from net balances every time, so a member who already paid can be asked to pay again, to a *different* person, for a *different* amount. That is correct debt simplification and it is what makes the app useful, but each suggestion is presented as if it were a fresh, unexplained demand. The breakdown now explains the *balance*; nothing explains the *suggestion*.
  - **Fix:** show what a suggestion replaced — "B'ye ödemeniz 100 ₺ idi, C'nin harcamasından sonra A'ya 40 ₺ oldu". Needs suggestion history, which the app does not keep today, so the cheap version is a one-line explainer on the section ("Öneriler her değişiklikten sonra en az sayıda transfere göre yeniden hesaplanır") and the real version waits for the activity log.
- [ ] **[Medium] Every Realtime Event Refetches Everything:** [Audit 2026-07-27]
  - **The problem:** every handler funnels into a debounced full reload. `groups-sync.ts:31-45` reloads all groups, then all expenses for **all** groups, then settlements per group, and its `groups` / `group_members` subscriptions are unfiltered — so one member edit in one group refetches the user's entire dataset. It works, and it kept the sync layer simple, but it caps how many subscriptions the app can afford and it re-renders every screen on every unrelated change.
  - **Fix:** let handlers narrow by payload (the event carries the changed row's `group_id`), and split `reloadGroupsAndExpenses` so a member change doesn't imply an expense refetch. Prerequisite for subscribing to anything else, and it pairs with the sync-state flag from the skeleton item below.
- [ ] **[Medium] Empty-State Flash on Home While Syncing (fix via Skeleton / Shimmer):**
  - **The bug:** there is no loading state on the home screen at all. `groups/index.tsx` branches purely on `groups.length === 0`, and Supabase sync is fire-and-forget from `auth-context.tsx` (`syncGroupsForSessionUser(profile).catch(() => {})`). So whenever the MMKV cache is empty (fresh install, new device, first login after logout) the screen renders the **"Henüz grup yok 🏖️" empty state while the fetch is still in flight** and the user briefly thinks their groups are gone. Users with a warm cache see data instantly and would never hit it, which is why it went unnoticed.
  - **What's missing:** no network-loading flag exists anywhere. `_hydrated` / `storeHydrated` in `split-data-store.ts` only track MMKV rehydration and are consumed solely by the splash gate in `app/_layout.tsx`; no screen reads them. `groups-sync.ts` and `split-data.ts` mutate the store silently with no `isSyncing` equivalent. The home screen's `refreshing` state is local to pull-to-refresh only.
  - **Approach:** add a `_syncing` (or `initialSyncDone`) flag to `split-data-store.ts`, set around `reloadGroupsAndExpenses()`, and gate the empty state on it. While syncing, render animated skeleton placeholders for the dashboard summary cards and the group list instead: a reusable, theme-aware shimmer component. `react-native-reanimated` is already a dependency; `expo-linear-gradient` is **not** installed and isn't needed, an opacity pulse is cheaper and reads fine. Rough estimate: 1 to 1.5 hours.
- [ ] **[Medium] Sync Failures Are Swallowed Everywhere:** [Audit 2026-07-27]
  - **The bug:** empty catches in `groups-sync.ts:43,86-88`, `expenses-sync.ts:26,52-56`, `auth-context.tsx:31`, and in the pull-to-refresh handlers of `groups/index.tsx:39-41`, `groups/[groupId]/index.tsx:81-83` and `settlement.tsx:32-34`. Offline or on a server error, the app shows yesterday's balances as if they were current, and an explicit pull-to-refresh does nothing visible at all.
  - **Fix:** a user-initiated refresh that fails must say so (Toast). Background sync failure should set a flag the home screen can surface, ideally with a "last synced" timestamp. Pairs naturally with the `_syncing` flag from the skeleton item above.
- [ ] **[Medium] Group Screens Always Format Amounts as TRY:** [Audit 2026-07-27]
  - **The bug:** the dashboard correctly buckets and formats per `group.currency`, but every group-scoped surface hardcodes `formatCurrencyTry` and ignores the group's actual currency: `settlement.tsx`, `groups/[groupId]/index.tsx`, `groups/index.tsx` (group totals), `quick-add-group-sheet.tsx`, and `expense-ledger-sheet.tsx`. A EUR group renders `₺1.234,56`.
  - **Fix:** `formatCurrency(amount, group.currency ?? 'TRY')` at every group-scoped call site. Cheap now, and it's a prerequisite for the multi-currency feature actually being visible.
- [ ] **[Medium] English Supabase Errors Leak into the Turkish UI:** [Audit 2026-07-27]
  - **The bug:** raw `error.message` is shown to users in login, register, edit-profile, change-password, group create/join, add/edit expense, settlement and delete-account. Users see "Invalid login credentials", `empty_name`, `invalid_amount`, `no_shares` or a Postgres RLS message in the middle of a Turkish app.
  - **Fix:** one `mapApiError(message): string` used at every catch site, mapping known codes and substrings to Turkish, with a generic fallback. Never pass a raw message through. (`mapJoinRpcError` in `groups-supabase.ts` is a one-off precedent to generalise.)
- [ ] **[Medium] Debts Disappear After You Leave a Group:** [Audit 2026-07-27]
  - **The bug:** `use-dashboard-summary.ts:84-88` filters out groups where the current user has `leftAt`, so if you leave a group still owing money, the debt vanishes from **Ödenmemiş Borçların** and the group vanishes from your list. The obligation still exists on the server and the other members still see it. Worse, RLS on `settlements` requires `is_group_member`, so a departed debtor **cannot record the payment** even if they want to.
  - **Fix:** decide the product rule first. Either block leaving with a non-zero balance, or keep left-with-balance groups visible in the debt section and let a departed member still settle.
- [ ] **[Medium] A Deleted Account Leaves a Balance Nobody Can Ever Settle:** [Production data 2026-07-27]
  - **The situation:** `delete-account` deliberately anonymizes rather than hard-deletes (profile becomes "Silinmiş Kullanıcı", the auth user is banned and its e-mail scrambled) so that other members keep a coherent history. Correct call. The side effect is that the departed user's balance stays in the group and can never be cleared, because RLS on `settlements` requires group membership and the account can no longer sign in. Live example: in *Sienna* a deleted account owes 1.316,53 ₺ that the other member will be owed forever. *Vienna* consists entirely of deleted accounts.
  - **Fix, two halves.** (1) Warn before the fact: the deletion screen should list any non-zero balances ("Bodrum Tatili grubunda 1.316,53 ₺ borcunuz var; hesabınızı silerseniz bu borç kapanmayacak") — a warning, not a block, since Apple 5.1.1(v) requires deletion to remain available. (2) Write it off at deletion time: insert a settlement row per affected group that zeroes the departing user's balance, noted as "Hesap silindi". The loss is real either way; what matters is that the app stops presenting it as collectable and every group keeps summing to zero. Redistributing the loss across the remaining members was considered and rejected: a debt nobody agreed to, appearing without warning, is worse than a visible write-off.
  - **The name is not actually being erased from `auth.users`.** `delete-account/index.ts:86` passes `user_metadata: {}`, but GoTrue *merges* metadata instead of replacing it, so an empty object changes nothing and the `full_name` written at signup (`services/auth.ts:47`) stays in `raw_user_meta_data`. This is visible in the Auth dashboard today: rows whose e-mail is already `deleted-…` still show the person's real name. The profile is anonymized correctly, so nothing in the app leaks it, but the function's own comment claims "PII removed" and that is currently false. Fix is one line: name the keys explicitly and set them to null (`{ full_name: null, name: null, avatar_url: null }`), which is how GoTrue deletes a key.
  - **Re-registration, confirmed by reading the function:** deletion frees the original e-mail (it is moved to `deleted-<uuid>@deleted.splitsnap.app`), so the same address can sign up again immediately, and with e-mail confirmation currently off there is nothing in the way. The new account gets a **new** `auth.users` id and a **new** profile, so no group, no history and no balance comes back; old memberships still point at the old profile id. If they rejoin a group by invite code they appear as a second, unrelated member alongside their own "Silinmiş Kullanıcı" row. Worth deciding whether that is the desired behaviour, since it also means deleting an account is a way to walk away from a debt and come back clean.
  - **Naming, and the trade-off to settle first:** two deleted members in the same group both render as "Silinmiş Kullanıcı" with no way to tell them apart (visible in *Vienna* today). Keeping the real name with a passive "silinmiş" indicator reads best, but a display name is personal data and the user asked to be deleted, so that is a privacy decision rather than a styling one. Options in increasing order of caution: full name plus badge, initials only, or a stable pseudonym ("Silinmiş Üye #2"). Cleanest is to ask at deletion time whether the name may stay visible to former group members, defaulting to anonymized. Any of them fixes the ambiguity; the current behaviour is the only one that doesn't.
- [ ] **[Low] Dead-End "Grup bulunamadı" Screens:** [Audit 2026-07-27]
  - `add-expense.tsx:373-378` and `settlement.tsx:42-47` render a not-found message with **no back button**, stranding the user. The group detail screen (`index.tsx:88-96`) already does this correctly with a Geri button; copy that.
- [ ] **[Low] Account Deletion Success Message Is Never Seen:** [Audit 2026-07-27]
  - `delete-account.tsx:53-55` calls `signOutApp()` and *then* `Alert.alert('Hesabınız Silindi', …)`, but the auth layout redirects to login the moment the session clears, so the alert likely never renders. Show the confirmation before signing out, or carry a one-time banner into the login screen.
- [ ] **[Low] Delete Buttons Stay Tappable While the Delete Is In Flight:** [Audit 2026-07-27]
  - The settlement half of this was fixed on 2026-07-27 (see Recent Updates). Still open: the delete-expense trash icon in `edit.tsx:281` has no in-flight state, so it can be tapped repeatedly during a soft delete.

### 🧹 Tech Debt & Maintenance

*Nothing here is user-visible today; all of it is about how expensive the next feature will be.*

- [ ] **[High] Extract a Shared `ExpenseForm` from Add and Edit:** [Audit 2026-07-27]
  - **The problem:** `add-expense.tsx` (1032 lines) and `expenses/[expenseId]/edit.tsx` (855 lines) contain 400+ lines of near-identical code: payer and split bottom sheets, manual amount entry, sum validation, submit handling, and styles. Every fix has to be made twice, and they have **already diverged** (add has the OCR/receipt flow, edit has delete and signed-URL loading). The receipt work in this sprint hit this repeatedly.
  - **Fix:** a shared `ExpenseForm` component plus a `useExpenseForm` hook, leaving both screens as thin wrappers. This is the single largest maintenance win available in the codebase.
- [ ] **[Medium] Finish the Tamagui Removal:** [Audit 2026-07-27]
  - **The problem:** the migration away from Tamagui looks done but isn't. `hooks/use-theme.ts` still resolves every screen's theme through Tamagui's `useTheme` + `getVariableValue`, and `app/_layout.tsx` still wraps the app in `TamaguiProvider`. So five Tamagui packages plus the duplicate-context `overrides` in `package.json` are load-bearing for a design system we already replaced.
  - **Fix:** have `use-theme.ts` read `LightTokens` / `DarkTokens` from `theme/tokens.ts` off `useColorScheme` directly, drop the provider, then remove the packages and the dead themed components below. Also removes the `as never` casts in `use-theme.ts`.
- [ ] **[Low] Delete Dead Files and Unused Dependencies:** [Audit 2026-07-27]
  - Never imported anywhere in `src/`: `components/external-link.tsx`, `components/hint-row.tsx`, `components/ui/collapsible.tsx`, `components/ui/separator.tsx`, `components/themed-text.tsx`, `components/themed-view.tsx`, `components/animated-icon.module.css`. Mostly Expo-template leftovers; the themed ones only exist to serve the other dead ones.
  - Installed but unused: `expo-device`, `expo-glass-effect` (waiting on the Liquid Glass item), `expo-secure-store` (waiting on Hardened Auth Storage). Either implement or remove; a plugin listed in `app.json` that nothing uses is misleading.
  - Also unused exports: `Colors` / `BottomTabInset` / `MaxContentWidth` in `constants/theme.ts`, the `Image` icon in `lib/icons.ts`, `userById` in `split-data-store.ts`. And a stale `// Force Metro cache refresh` comment in `app/_layout.tsx:15`.
- [ ] **[Low] One Voice for User Feedback (Alert vs Toast):** [Audit 2026-07-27]
  - Expense screens use `Alert.alert` for validation and errors but `Toast` for delete success, so the same screen speaks two ways. Auth and profile screens use inline field errors plus Toast, which is the better pattern and the direction the app has been drifting.
  - **Proposed rule:** inline errors for field validation, Toast for async results (success and failure), Alert reserved for destructive confirmation only. Also worth noting: saving an expense currently gives **no** success feedback at all, it just navigates back.
- [ ] **[Low] One Turkish Voice (settle on formal "siz"):** [Audit 2026-07-27]
  - The app mixes formal and informal address. Formal: auth screens, validation messages, expense forms, delete-account, profile, group detail ("Durumunuz", "Alacaklısınız"). Informal: the whole dashboard ("Ödenmemiş Borçların", "Bu ayki harcaman"), `balance-groups-sheet`, `expense-ledger-sheet` ("Ödediğin", "Payına düşen", "Bakiyene etkisi"), the password strength meter.
  - Formal fits a finance app, and it's already the majority. Best done together with Localization so the strings are only rewritten once. Also on the list: "Eşitsiniz" for a zero balance is odd phrasing, "TEHLİKELİ ALAN" is a calque of "Danger Zone", and "Harcama Dökümüm" vs "Harcama Detayı" use two different words for the same idea.
- [ ] **[Low] Service Layer Consistency:** [Audit 2026-07-27]
  - `groups-supabase.ts:84` writes to the Zustand store directly from the service layer; every other service returns a payload and lets the caller update the store.
  - Two canonical import paths for the same store (`@/stores/split-data-store` vs the re-export in `@/services/split-data`), used about half and half.
  - Services throw three different error shapes: `new Error(message)`, a raw `PostgrestError`, and a raw `AuthError`, so every screen has to handle all three.
  - `profile.tsx:63,74` and `edit-profile.tsx:135` navigate with `router.push('…' as never)` instead of the `href()` helper every other call site uses.
  - Equal-split remainder math is duplicated between `addExpense` and `updateExpense` in `split-data.ts`; ~20 inline `parseFloat(x.replace(',', '.'))` calls in the expense screens reimplement `parseAmount` from `utils/validation.ts`.
- [ ] **[Low] Accessibility Pass (Erişilebilirlik Özellikleri):** [Audit 2026-07-27]
  - **Description:** Improve the accessibility (a11y) of the application to ensure it is usable by all users, especially those using screen readers (VoiceOver/TalkBack) or custom text scaling settings.
  - **Scope:**
    - Icon-only controls with no `accessibilityLabel`: the bottom bar's tab icons, profile menu rows, theme sheet options, the dashboard debt card and recent-activity rows, quick-add and balance-sheet rows, the members "Tümünü Gör" expander, and the emoji icon pickers.
    - Header back and trash buttons are roughly 38×38pt (8pt padding around a 22pt icon), under the 44pt minimum, with no `hitSlop`. Add `hitSlop` to ensure a 44x44pt tappable area.
    - All text uses fixed `fontSize` with no `maxFontSizeMultiplier`, so dense rows (ledger, tab bar, badges) will clip at large iOS text sizes. Ensure layout resilience when system-wide dynamic text size scaling is enabled.

---

## Suggested Order & Dependencies

Several backlog items collide with each other or silently depend on one another. Doing them in the wrong order means redoing work. This section records what blocks what; it is not a commitment to a schedule.

### Chains that must be done in order

**1. Auth flow before auth visuals.**
`Onboarding & Verification Flow Upgrade` & `Social & Passwordless Sign-In` → `Unified Auth Screen & Modernization`.
These tasks consolidate and rewrite the auth flow. Onboarding introduces a post-auth profile customization wizard for first-time sign-ups (both email and social), while social logins/OTP add buttons and OAuth redirect flows. Consolidating the login/signup screens into a single segmented layout, and structuring the first-time redirect to onboarding must be settled before finalizing screen visual styling. `Password Reset Flow` also belongs in this pass.

**2. Currency plumbing before currency features.**
`Group Screens Always Format as TRY` (bug) → `Flexible Multi-Currency Support` → `Itemized Receipt Splitting` and `Easy Debt Settlement & QR/IBAN`.
The dashboard already buckets per currency but every group-scoped screen still hardcodes `formatCurrencyTry`, and `calculateBalances` / `calculateSettlements` assume one currency throughout. Line-item splitting and IBAN/QR settlement both encode amounts, so building either before multi-currency lands guarantees a rewrite. Fixing the formatting bug is cheap and can happen immediately; it is the first step of the feature, not separate from it.

**3. Sheet behaviour before sheet appearance.**
`Card Stack UI for Payer/Split Selection` → `Liquid Glass Progressive Enhancement`.
Both target `ui/bottom-sheet.tsx`. Card Stack changes gestures and animation; Liquid Glass changes the surface material and backdrop. Tuning glass against animation timing that is about to change is wasted effort.

**4. OCR output shape before line-item splitting.**
`parse-receipt` schema change → `Itemized Receipt Splitting`.
The backlog entry says the feature "requires DB support for line items" but omits the harder half: `parseReceipt` currently returns only merchant, date, total and currency. The edge function prompt and response schema have to emit line items first, and that has to survive the same accuracy problems the current parser has. Treat the OCR change as its own piece of work.

**5. Loading flag before, or together with, sync error reporting.**
`Empty-State Flash on Home` and `Sync Failures Are Swallowed` both need the same missing thing: a sync-state flag on the store. Doing them together is meaningfully cheaper than doing them apart, because the flag needs `syncing`, `succeeded` and `failed` states either way.

**6. Translation layer before, or alongside, text rewrites.**
`Localization (en / tr)` ↔ `One Turkish Voice` and the Activity Log's action-to-sentence strings.
Standardising on formal "siz" across ~400 strings and then moving those same strings into a translation file is the same edit twice. Either localize first and fix the voice inside the dictionary, or at minimum write all new user-facing strings through a dictionary from now on.

**7. Deduplicate the expense form before translating it.**
`Extract a Shared ExpenseForm` → `Localization (en / tr)`.
Not obvious from either entry: `add-expense.tsx` and `edit.tsx` duplicate 400+ lines *including their user-facing strings*. Localizing first means writing two dictionary entries for the same label and then deleting one, across every string in the largest pair of screens in the app. The extraction also has to happen before `Card Stack UI`, which retunes the sheets both screens embed.

### Items that block trust in the numbers

*Done as of 2026-07-27.* Two rounds. The server-side round (Sprint #3) closed the `expense_payers` RLS regression, the missing RPC validation and a cross-group expense rewrite, so balances can no longer be written to values the server never agreed to. The presentation round (Sprint #4) made the settlement screen reconcile with its own headline figure and stopped stale suggestions from booking silent overpayments. Any feature that displays or acts on a balance (dashboard, activity log, QR payment) now rests on both.

### Independent, no dependencies

These touch nothing else and can be picked up in any order or in parallel: `parse-receipt` input cap, dead file and dependency cleanup, dead-end back buttons, the account-deletion toast, the in-flight delete guard, and the accessibility pass.

### Where to start next

Recorded 2026-07-27, after Sprint #4. The order is driven by one thing: there is an unshipped release in the way, and everything queued behind it gets more expensive the longer it sits.

**1. Close out v1.2.0.** Push `20260727215500` and `20260727223000` to the hosted database, smoke-test add / edit expense and record payment against it, re-run the audit queries, then rebuild (Build 13 predates both the `MONEY_EPSILON` change and Sprint #4) and submit. Push the migration before the build: the server is stricter than the shipped client either way, and the order only decides which error a user sees in the gap.

Old-build compatibility was checked on 2026-07-28 and the migrations are safe for the v1.0.0 clients on the App Store: no RPC signature change (the 11-argument overloads were dropped in `20260726172500`, so old calls land on the same validated function with `p_payers` defaulting to empty), receipt paths have always been `{groupId}/{file}` so they satisfy the new prefix check, and the only direct table write the client makes is the soft-delete UPDATE on `expenses`, which the grants migration covers. Two things to fold into the push while you are there: the payer-reassignment bug above, which old clients trigger on every edit, and the zero-share equal split.

**2. Edge function pass — deploy only, no rebuild, so it is not blocked by the release.** The `delete-account` metadata leak and the `detail: err.message` disclosure are in the same file; the `parse-receipt` input cap is next door. All three ship without touching the client.

**3. One more `settlements` / `expenses` policy migration while the RLS context is loaded.** Settlement immutability plus the distinct-users constraint, and pinning `paid_by` / `created_by` / `group_id` on direct `expenses` writes. Same class of work as Sprint #3; re-acquiring that context in a month costs more than finishing it now.

**4. The auth flow, as one pass.** Password reset is the most severe remaining user-facing hole in the app — there is no self-service path at all, so a forgotten password is a permanent lockout. Do it together with re-enabling e-mail confirmation, the verification waiting screen, and Social & Passwordless Sign-In (Google & Apple & OTP), because they all touch auth services and the same unified auth screen components, and leave `Unified Auth Screen & Modernization` for after (chain 1).

**5. Then tech debt, in this order:** `ExpenseForm` extraction → finish the Tamagui removal → dead files and unused dependencies. This is what makes every later expense feature cheaper, and chain 7 above means it has to precede Localization.

Deliberately not in this list: the deleted-account write-off. It needs the naming/privacy decision settled first, and writing the migration before that decision risks doing it twice.

### Shared abstraction worth noticing early

`Itemized Receipt Splitting` and `Bank/Card Transaction Auto-Import` both produce "here is a suggested expense, confirm or edit it". If they're built separately they'll grow two different draft-expense flows. Whichever comes first should introduce the shared concept.

## Recent Updates & Changelog

Completed sprints and major releases are archived under [docs/changelog/](file:///Users/bora/Projeler/splitsnap/docs/changelog/):

*   **Sprint #4: The Settlement Screen Adds Up (July 2026)**
    *   *Focus:* Settlement ledger breakdown redesign, stale suggestions guards, duplicate-alerts block, and realtime subscription fixes.
    *   *Changelog:* [sprint_04_settlements_logic.md](file:///Users/bora/Projeler/splitsnap/docs/changelog/sprint_04_settlements_logic.md)
*   **Sprint #3: Expense Write Integrity (July 2026)**
    *   *Focus:* Database write integrity, RLS, owner scopes, permissions, role grants migrations, and automated integration tests.
    *   *Changelog:* [sprint_03_expense_write_integrity.md](file:///Users/bora/Projeler/splitsnap/docs/changelog/sprint_03_expense_write_integrity.md)
*   **Sprint #2: Split Payer & Premium UI Upgrade (July 2026)**
    *   *Focus:* Multiple payers support, receipt scan validation, AI daily quota, gesture-based sheets, and true black AMOLED UI theme.
    *   *Changelog:* [sprint_02_split_payer_premium_ui.md](file:///Users/bora/Projeler/splitsnap/docs/changelog/sprint_02_split_payer_premium_ui.md)
*   **Sprint #1: Expo SDK 57 & Tamagui Upgrade (July 2026)**
    *   *Focus:* React 19/Expo SDK 57 migration, Tamagui dependency duplicate context portal fixes, and fast-refresh channel leak fixes.
    *   *Changelog:* [sprint_01_expo_sdk_tamagui.md](file:///Users/bora/Projeler/splitsnap/docs/changelog/sprint_01_expo_sdk_tamagui.md)

---

### 📚 Archived Pre-Release History
For the pre-release project roadmap and development progress leading up to the initial App Store release (`v1.0.0`), refer to:
*   [docs/archive/school/ROADMAP.md](file:///Users/bora/Projeler/splitsnap/docs/archive/school/ROADMAP.md) — The initial pre-release project roadmap.
*   [docs/archive/school/PROGRESS.md](file:///Users/bora/Projeler/splitsnap/docs/archive/school/PROGRESS.md) — The pre-release development progress logs.
*   [docs/archive/school/SplitSnap Tanıtım Raporu.md](file:///Users/bora/Projeler/splitsnap/docs/archive/school/SplitSnap%20Tan%C4%B1t%C4%B1m%20Raporu.md) — Original university introduction report.
