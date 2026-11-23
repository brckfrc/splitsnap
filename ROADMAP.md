# SplitSnap Roadmap & Backlog

This is the primary planning document for SplitSnap after the `v1.0.0` App Store release.
Work is organised as **dependency-ordered Sprints**, not by category or by urgency alone
(see *How This Document Works* below). Category emoji (🔐 🚀 🎨 🐛 🧹) and
`[High] / [Medium] / [Low]` are **tags on an item, not its location**.

---

## How This Document Works (read this before adding or moving items)

**Naming — one word: "Sprint".** A Sprint is the unit of planned + delivered work.
Upcoming Sprints live here (`#6, #7 …`); a Sprint that ships is moved to
[`docs/changelog/`](docs/changelog/) as `sprint_NN_*.md`, leaving only a one-line summary in
*Recent Updates & Changelog* at the bottom. Numbering is continuous with the changelog
(`#1–#5` are already there). Do **not** introduce a second word ("milestone", "phase") for
the same thing.

**Adding a new bug/feature — route it with three questions, in order:**
1. **Is it a release blocker?** (prod crash, data corruption, wrong money attribution
   reachable today, App Store rejection risk) → it goes into the **current Sprint**,
   whatever its category. Only a real blocker earns a queue-jump.
2. **Does it have a dependency link?**
   - *It needs X first* → same Sprint as X, or later.
   - *Something already planned needs it* → pull it **before** that thing (e.g. the
     currency-format bug is the entry point of multi-currency, not a separate chore).
   - *It touches a system a Sprint already opens* (auth, the bottom sheets, the sync-state
     flag, an RLS migration in flight) → attach it there so the context is loaded once.
3. **Is it independent?** (needs nothing, nothing waits on it) →
   - small → **Continuous Lane** (grab-bag). Priority tag orders it there.
   - large → **Backlog (unscheduled)** until it becomes someone's dependency or you choose to pull it.

**Urgency vs. placement — they are different axes.** *Urgency decides whether it interrupts;
dependency decides where it sits.* A "new but not very urgent" item is **not** written at the
top and **not** forced into the current Sprint (that is scope creep) — it waits in the
Continuous Lane or a themed future Sprint. It enters the current Sprint only if that Sprint
already has the same context open (a free fold-in).

**One-line metadata per item.** Every item ends with a single link line so the ordering stays
self-maintaining:
> `needs: … · blocks: … · (or) independent`

**When a Sprint completes:** write its `docs/changelog/sprint_NN_*.md`, replace the Sprint
block here with a one-line entry under *Recent Updates & Changelog*, and update
[`docs/AGENTS.md`](docs/AGENTS.md) if the structure itself changed. Never edit
`docs/archive/school/*` (frozen). Then run the *outward-facing check* in `docs/AGENTS.md` (privacy policy,
App Store text, release notes, website, README) so nothing users or readers see goes stale.

---

## Active Status

- **Version:** `v1.2.1` (Build 16 on Expo SDK 58) — ready for EAS production build & App Store submission (`v1.2.0` / Build 13 was already approved on App Store Connect, closing the `1.2.0` train per `ITMS-90186`/`ITMS-90062`; Build 14 (`1.2.0`) was rejected at upload because `1.2.0` was a closed train; Build 15 (`1.2.1`, SDK 57) and Build 16 (`1.2.1`, SDK 58) both sit on the `1.2.1` version, and Build 16 is the first build checked on the iOS 27.2 phone for the `UIScene` fix).
- **Migrations:** 13 of 13 applied on production (`20261103120000_codify_service_role_grants.sql` pushed on 2026-11-03 after a dry-run; verified no-op on existing production objects).
- **Framework:** Expo SDK 58 (React Native 0.88.1) + React 19.3 + TypeScript. **iOS only.**
- **Backend:** Supabase (Auth, DB, Edge Functions, Storage) — **local-first development** since 2026-11-03 (`supabase start` + `.env.development.local` + `supabase/seed.sql` for simulator runs and SQL tests; production credentials live in EAS environment variables). Details in `docs/DEVELOPMENT_WORKFLOW.md` §1–§3.
- **Build toolchain:** one toolchain, stable **Xcode 27.2** (iOS 27.2 SDK), for the simulators and the
  iOS 27.2 phone alike; the project's line is iOS 27 (no iOS 26/27.0/27.1 runtimes or targets). `npm run ios:pick`
  is the default run command (terminal device list); `ios:27` boots the Pro Max screenshot simulator.
  Xcode's script phases resolve Node through nvm from `.nvmrc`, via `ios/.xcode.env.local` generated
  by `plugins/withXcodeEnvNvm.js` on each prebuild; `engines` plus `engine-strict` fail an install on
  the wrong version. Details in `docs/DEVELOPMENT_WORKFLOW.md` §4.
- **Foundation already trusted:** the Sprint #3 server round (RLS regression on `expense_payers`,
  missing RPC validation, cross-group rewrite), the Sprint #4 presentation round (settlement screen
  reconciles with its own headline; stale suggestions can't book silent overpayments), and the Sprint #5
  fixes (old-client payer preservation, sub-kuruş equal split, `UIScene` lifecycle, local-first stack,
  Expo SDK 58 upgrade) are all merged to `main` and verified.
- **Where we left off (2026-11-23):**
  - **Sprint #13 is closed** (pulled ahead of #6): [`docs/changelog/sprint_13_test_harness_ci.md`](docs/changelog/sprint_13_test_harness_ci.md), including its follow-ups. On `main` since then: required CI on every PR (Jest, SQL suites, Expo pin check), Renovate auto-merge for safe updates, the one-button Release workflow with a hosted `splitsnap-staging` project and cloud Maestro, release tags, PolyForm Noncommercial license, `docs/RELEASE_NOTES.md`, `docs/store-assets/listing.md`. The `dev` branch is gone: feature branch from `main` → PR → `main`.
  - **Uploaded to TestFlight: the first real release, `1.2.1` Build 17** (tag `v1.2.1-build.17` on `1895c96`). The Maestro failures on the `xcode-27` runner (iOS 27.2) are fixed: the flow's `APP_TARGET` default overrode `-e` (PR #38), and the password tap left the focus in the e-mail field (PR #39). A screenshot of the latter showed the staging password in a public artifact; the artifacts were deleted, `STAGING_TEST_PASSWORD` was rotated, and the workflow now uploads only one guarded post-login screenshot (PR #41). One add-expense failure (run 45082263230) did not repeat; watch for it. Release run 45120484680 (2026-11-23) passed Maestro and built **Build 17** on EAS (`57c5d44b`), but the upload failed: an Apple agreement was unsigned. After the developer accepted it, the same build was uploaded by hand (`eas submit --id`) and tagged; the workflow now does that itself on a rerun without building again (`scripts/reusable-eas-build.sh`). Next, by the developer: TestFlight check on the phone → App Store Connect: pick **Build 17** (not 15/16), paste the TR/EN text from `RELEASE_NOTES.md`, fix the "PRIVACY FIRST" paragraph (`listing.md` issue 1) → Add for Review. EAS: 11 of 15 iOS builds used in November (resets 2026-12-01).
  - **After submission (agent):** in a small PR, archive *Unreleased* in `RELEASE_NOTES.md` as `1.2.1 (Build 17)` (the text there is final: it was completed on 2026-11-22 with Sprint #4's settle-up fixes, which the first draft had missed), start an empty *Unreleased*, and sync `listing.md` with whatever went live.
  - **Small open items:** one Dependabot alert (`minimatch`, build tooling only; Renovate's lockfile maintenance should clear it); crash reporting is a Backlog item; `listing.md` issues 2–3.
  - **Sprint #6** (backend hardening): the hardening pass is live on production since 2026-11-22 (PR #35). Both migrations (PR #35, #36) are live on production. Left: the server-side `profiles.email` revoke once the next App Store build is the only one in use.
  - **Standing rule:** every production build passes the full pre-release test gate first (`docs/APP-STORE.md` → *Yayın öncesi test kapısı*); in practice that is the Release workflow plus the phone check.

---

## Settled Product Decisions

- **Deleted-account display name → full name + a passive "silinmiş" indicator.** Distinguishability
  wins over anonymisation (two deleted members otherwise both read "Silinmiş Kullanıcı" and can't
  be told apart — visible in *Vienna* today). Consequence: the published privacy policy may need a
  line noting a deleted user's name can stay visible to former co-members (website edit). This
  **unblocks** the deleted-account write-off (the write-off note can safely reference the name).
- **Former members keep full read access → accepted as intentional.** `is_group_participant`
  ignores `left_at` on purpose so someone who left still sees the history they were part of
  (`docs/DATABASE.md` §9). Revert path if this ever changes: switch the group-scoped SELECT
  policies from `is_group_participant` to `is_group_member`. Not active work.

---

## Sprint Plan (dependency-ordered)

### Sprint #6 · Backend hardening — *deploy-only, no client rebuild* · not blocked by the release

Server-side only, so it ships without waiting on the App Store queue, and it finishes the same
class of RLS work as Sprint #3 while that context is still loaded.

- **[Done · 2026-11-11] `parse-receipt` moved from `gpt-4o-mini` to `gpt-6-luna`.** OpenAI shuts
  `gpt-4o-mini` down on 2027-01-14. The model is now the optional secret `OPENAI_RECEIPT_MODEL`
  (default `gpt-6-luna`), so a later swap or rollback needs no code change (rollback recipe in
  `docs/AGENTS.md`). `gpt-6-luna` is a reasoning model and rejects `max_tokens`, so the function
  now sends `max_completion_tokens` with `reasoning_effort: none`. A smoke test replaying the
  function's request on 4 OCR texts matched `gpt-4o-mini` field for field; it costs ~25% less
  per receipt, and latency went from ~1.0 s to ~1.9 s. New OpenAI key set as the production secret,
  old key revoked, function deployed (v5) and checked with an in-app scan. Privacy page names the
  new model.
- **[Done · 2026-11-22] Edge-function + RLS hardening pass.** Merged in PR #35, pushed to production
  the same day (migration applied, `delete-account` v3 deployed, verified with a schema dump).
  Migration `20261122200000_sprint6_backend_hardening.sql`, plus `delete-account` and the client's
  profile projections. Local: `npm run test:db` 67/67 (16 new cases; the 13 security cases were
  run against the pre-migration schema first and all FAILed there), Jest, `npm run check`.
  - `delete-account` nulls `full_name` / `name` / `avatar_url` / `picture` in `user_metadata`
    (checked locally: `raw_user_meta_data` keeps only `email_verified`), and its two 500s log the
    cause server-side and return a bare error code.
  - `get_emoji_usage_stats`: `search_path = public`, EXECUTE revoked from `PUBLIC`/`anon`, granted
    to `authenticated`.
  - `settlements`: column-level `UPDATE (deleted_at)` only, so `amount` and both parties are frozen;
    `settlements_distinct_users` check; the INSERT policy now also requires the counterparty to be
    a group participant (a former member still qualifies). Before, a member could book a payment
    to any profile id.
  - `expenses`: direct INSERT revoked (and its policy dropped), direct UPDATE limited to
    `deleted_at`; creation and edits stay on the SECURITY DEFINER RPCs.
  - `profiles.email`: dropped from the client's group-scoped projections (members, shares, payers).
    **Server side not yet closed:** a column-level revoke of `email` would break every build that
    still selects it (1.2.0 Build 13 → 1.2.1 Build 17), so it waits until the first build without
    the projection is the only one in use. `needs: next App Store build · blocks: nothing`
  - No user-visible change, so no `RELEASE_NOTES.md` line.
- **[Done locally · 2026-11-22 · production push pending] Privilege surface tightened.**
  `20261122210000_tighten_role_grants.sql`. The production dump showed far more than
  `codify_role_grants` describes: `anon` and `authenticated` held `ALL` on every table (so
  `authenticated` could INSERT into `activity_log`), `anon` could EXECUTE every SECURITY DEFINER
  RPC without a session (`lookup_user_by_friend_code` returned a user's id and name for a friend
  code), and default privileges handed `ALL` on every new table, sequence and function to both.
  Now: table grants are exactly the codified set, `expense_shares` / `expense_payers` are
  read-only for the client (direct writes skipped `validate_expense_allocations`; the creator
  could write shares that do not add up), `anon` executes nothing, and new objects grant the client
  roles nothing by default. `supabase/tests/role_grants_test.sql` pins the whole surface. Local:
  `test:db` 81/81 (the new cases FAILed against the old schema first), and the app's own
  supabase-js calls (selects with profile embeds, both expense RPCs, soft delete, settlement
  insert, group create, invite join, emoji stats) all pass as Deniz on the local stack.
  `needs: nothing · blocks: nothing`

### Sprint #7 · Auth overhaul — *one pass* · ships to App Store

Password reset is the most severe remaining user-facing hole — no self-service path at all, so a
forgotten password is a permanent lockout. These all touch the same auth services and the same
unified auth screen, so do them together and leave the visual consolidation for last.

- **[🚀 High] Password reset flow (missing entirely).** No "Şifremi unuttum" UI, no
  `resetPasswordForEmail`, no recovery deep-link. Needs a request screen, the Supabase recovery
  template, a deep-link route to a set-new-password screen, and reuse of `validateNewPassword` +
  the strength meter. `needs: nothing · blocks: nothing (do first — highest severity)`
- **[🚀 High] Onboarding & verification flow.** Re-enable email confirmation and handle the
  unconfirmed-session UX; a verification waiting screen, then a profile customization wizard
  (display name, currency, theme) every new sign-up passes through. Architecturally decoupled from
  login/signup — both email and social first-time users route here. `needs: email confirmation
  decision · blocks: Unified Auth Screen`
- **[🚀 High] Social & passwordless sign-in.** Native Apple (`expo-apple-authentication`) + Google
  (`@react-native-google-signin/google-signin`) via `signInWithIdToken`, plus email OTP / magic
  link. *Prerequisites:* Apple Developer (App ID, Services ID, key) + Google Cloud OAuth client IDs
  + Supabase Auth config. `needs: developer-account setup · blocks: Unified Auth Screen`
- **[🔐 Medium] Hardened auth storage.** Supabase sessions live in `AsyncStorage`
  (`lib/supabase.ts`), readable from a backup/compromised device. Move to an `expo-secure-store`
  adapter — the package is already installed and listed as a plugin but never used. `needs: nothing
  · blocks: nothing (fold in while auth is open)`
- **[🚀 Medium] Auth rate-limiting UX.** Client-side feedback + temporary cooldowns for repeated
  failed logins. `needs: nothing · blocks: nothing`
- **[🎨 Low] Privacy-policy link on the register screen.** No in-app reference to
  `splitsnap.borak.dev/privacy` exists anywhere in `src/` (verified) — only App Store Connect links
  it. Add a small line under the register CTA ("Kaydolarak Gizlilik Politikası'nı kabul etmiş
  olursunuz"). No consent checkbox needed (free app, no subscription). Free fold-in since the
  register screen is being rewritten here. `needs: register-screen rewrite · blocks: nothing`
- **[🎨 Medium] Unified auth screen & modernization.** *(do last in this sprint)* Replace the two
  login/register screens with one segmented screen housing Google/Apple + email OTP, redesigned
  (logo/wordmark, typography, card/gradient), keeping shared validation, strength meter and
  eye-toggles. First-time OAuth/email completion routes into the Onboarding Wizard.
  `needs: the auth items above · blocks: nothing`
- **[🎨 Low] Group expense order: newest added first by default.** *(fold-in, not auth: squeezed
  into the next shipping sprint on the developer's request, 2026-11-23)* The group's expense list
  sorts by `expense_date` desc, then `created_at` (`fetchExpensesForGroup` /
  `fetchExpensesForGroupsPayload` in `src/services/expenses-supabase.ts`), so an expense entered
  today for last week lands mid-list and looks missing. Default to `created_at` desc, with a toggle
  to sort by expense date; remember the choice per device. One `RELEASE_NOTES.md` line.
  `needs: nothing · blocks: nothing`
- **[🚀 Medium] Profile avatars.** *(optional tail — may slip to Backlog)* `profiles.avatar_url`
  exists and `mapProfileToUser` reads it, but nothing writes it and every surface renders initials.
  Needs an image picker, a Storage bucket with its own RLS, resize-on-upload, and a display
  component with initials fallback. **Use the ArrayBuffer upload path, not `Blob`** (same RN
  `FormData` trap as receipts). `needs: Storage bucket + RLS · blocks: nothing`

### Sprint #8 · Foundation refactor — *makes every later feature cheaper* · internal

The single largest maintenance win, and a prerequisite for both Localization (chain 7) and the
Card Stack UI (which retunes the sheets these screens embed).

- **[🧹 High] Extract a shared `ExpenseForm` from Add and Edit.** `add-expense.tsx` (~1,047 lines)
  and `expenses/[expenseId]/edit.tsx` (~855) share 400+ near-identical lines (payer/split sheets,
  manual entry, sum validation, submit, styles) that have already diverged (add has OCR/receipt,
  edit has delete + signed-URL loading). *Fix:* a shared `ExpenseForm` + `useExpenseForm` hook,
  both screens thin wrappers. `needs: nothing · blocks: Localization, Card Stack UI`
- **[🧹 Medium] Finish the Tamagui removal.** `hooks/use-theme.ts` still resolves themes through
  Tamagui's `useTheme` + `getVariableValue`, and `app/_layout.tsx` still wraps in
  `TamaguiProvider`. Five Tamagui packages + the `@tamagui/portal` `overrides` are load-bearing for
  a design system already replaced. *Fix:* have `use-theme.ts` read `LightTokens` / `DarkTokens`
  from `theme/tokens.ts` off `useColorScheme` directly (also removes the `as never` casts), drop the
  provider, then remove the packages and the dead themed components below. `needs: nothing · blocks:
  dead-file cleanup`
- **[🧹 Low] Delete dead files and unused dependencies.** Never imported (closed cluster —
  `themed-text`/`themed-view` only serve the other dead ones): `components/external-link.tsx`,
  `hint-row.tsx`, `ui/collapsible.tsx`, `ui/separator.tsx`, `themed-text.tsx`, `themed-view.tsx`,
  `animated-icon.module.css`. Installed-but-unused deps: `expo-device`, `expo-glass-effect` (waits
  on Liquid Glass), `expo-secure-store` (consumed once Hardened Auth Storage lands in #7). Unused
  exports: `Colors` / `BottomTabInset` / `MaxContentWidth`, the `Image` icon in `lib/icons.ts`,
  `userById`; stale "Force Metro cache refresh" comment in `app/_layout.tsx`.
  `needs: Tamagui removal (for the themed-* files) · blocks: nothing`
- **[🧹 Low] Service-layer consistency.** `groups-supabase.ts` writes the Zustand store from the
  service layer (every other service returns a payload); two import paths for the same store; three
  thrown error shapes (`Error`, raw `PostgrestError`, raw `AuthError`); `router.push('… as never)`
  in a few places instead of the `href()` helper; duplicated equal-split remainder math and ~20
  inline `parseFloat(x.replace(',', '.'))` reimplementing `parseAmount`. `needs: nothing · blocks:
  nothing (do alongside the refactor while touching services)`

### Sprint #9 · Trust the numbers & resilience — *one sync-state flag ties several of these* · ships

`Empty-State Flash` and `Sync Failures Swallowed` need the same missing thing — a `syncing /
succeeded / failed` flag on the store — so they are cheaper done together. The currency-format bug
is the free entry point of multi-currency and can be pulled forward anytime.

- **[🐛 High] Retrying a failed save can create a duplicate expense.** Every write in
  `split-data.ts` is "remote RPC → `loadExpensesForGroup`"; if the RPC succeeds but the refetch
  fails on a flaky connection, the user retries and books a second identical expense. *Fix:*
  distinguish "write failed" from "write succeeded, refresh failed" and only allow retry on the
  former; or a client-generated idempotency key. `needs: nothing · blocks: nothing`
- **[🐛 Medium] Empty-state flash on home while syncing (skeleton / shimmer).** No loading state
  exists; `groups/index.tsx` branches on `groups.length === 0` while Supabase sync is fire-and-forget,
  so a cold MMKV cache renders "Henüz grup yok 🏖️" mid-fetch. *Fix:* add `_syncing` /
  `initialSyncDone` to `split-data-store.ts`, gate the empty state, render an opacity-pulse skeleton
  (reanimated is already a dep; no `expo-linear-gradient`). ~1–1.5h. `needs: sync-state flag · blocks:
  nothing`
- **[🐛 Medium] Sync failures are swallowed everywhere.** Empty catches in `groups-sync.ts`,
  `expenses-sync.ts`, `auth-context.tsx`, and the pull-to-refresh handlers. A failed user refresh
  must say so (Toast); background failure should set a flag the home screen surfaces with a "last
  synced" time. Same flag as above. `needs: sync-state flag · blocks: nothing`
- **[🐛 Medium] Every realtime event refetches everything.** `groups-sync.ts` funnels every event
  into a debounced full reload (all groups → all expenses for all groups → settlements per group),
  and its `groups` / `group_members` subscriptions are unfiltered — one member edit refetches the
  user's whole dataset. (`expenses-sync.ts` is already `group_id`-filtered.) *Fix:* narrow handlers
  by payload `group_id`; split `reloadGroupsAndExpenses` so a member change doesn't imply an expense
  refetch. `needs: sync-state flag pairs with it · blocks: subscribing to anything else`
- **[🐛 Medium] English Supabase errors leak into the Turkish UI.** Raw `error.message` shown in
  login, register, edit-profile, change-password, group create/join, add/edit expense, settlement,
  delete-account ("Invalid login credentials", `empty_name`, `no_shares`, RLS text). *Fix:* one
  `mapApiError(message): string` at every catch site (generalise `mapJoinRpcError`); never pass a
  raw message through. `needs: nothing · blocks: nothing`
- **[🐛 Medium] Group screens always format amounts as TRY.** The dashboard formats per
  `group.currency`, but `settlement.tsx`, `groups/[groupId]/index.tsx`, `groups/index.tsx`,
  `quick-add-group-sheet.tsx` and `expense-ledger-sheet.tsx` hardcode `formatCurrencyTry` — a EUR
  group renders `₺`. *Fix:* `formatCurrency(amount, group.currency ?? 'TRY')` at each site (helper
  already exists). `needs: nothing · blocks: Multi-Currency (this is its first step)`
- **[🐛 Medium] Debts disappear after you leave a group — guard.** `use-dashboard-summary.ts`
  filters out groups where the user has `leftAt`, so leaving while owing hides the debt locally
  (others still see it), and `settlements` RLS then blocks the departed debtor from paying. *Fix
  (guard the exit):* (1) `BEFORE UPDATE` trigger on `group_members` raising if `left_at` is set with
  a non-zero net balance (blocks API bypass and owner kicks); (2) disable "Gruptan Ayrıl" in the UI
  with a modal explaining the outstanding balance; (3) owner debt write-off to reset a member to
  `0.00`. *(The audit-feed banner half of this waits for Sprint #10.)* `needs: nothing · blocks:
  nothing`

### Sprint #10 · Activity Log & balance-integrity UX — *builds the audit substrate* · ships

The `activity_log` table, indexes and RLS already exist (`20260405140000_week3_core.sql`); nothing
reads or writes it. Building it here unblocks the suggestion explainer and the deleted-account
write-off audit trail, and completes the "leave a group" banner from #9.

- **[🚀 Medium] Group activity log.** Chronological per-group feed (who added/edited/deleted an
  expense, joined/left, recorded/undid a settlement), reachable from the group header, on
  `groups/[groupId]/activity.tsx`. **Write via DB triggers, not app-side inserts** — `AFTER
  INSERT/UPDATE/DELETE` on `expenses` / `settlements` / `group_members`, so a missed call path or an
  old client can't leave gaps. Triggers must resolve the actor from `auth.uid()` (the expense RPCs
  are SECURITY DEFINER). Grants deliberately withhold client INSERT (`20260727223000`). Remaining:
  trigger migration, `ActivityLogEntry` type, a paginated `activity-log-supabase.ts`, the screen.
  Feed starts empty; no backfill. `needs: nothing · blocks: suggestion history, exit/write-off banners`
- **[🚀 Medium] Settlement cancellation / undo in UI (Ödeme Silme / Geri Alma).** The database RLS policy
  (`settlements_soft_delete_involved`, `20260412140000_week4_expenses.sql`) already permits either
  party (`from_user_id` or `to_user_id`) to soft-delete a settlement by setting `deleted_at`, but the
  client currently only ever inserts settlements (`createSettlementRemote`). Users who enter the wrong
  amount, tap by mistake, or report that cash/transfer was never received currently have no way to undo
  it in the UI. *Fix:* add `softDeleteSettlementRemote(settlementId)` in `settlements-supabase.ts`, add a
  delete action (swipe or trash icon) with confirmation alert ("Ödemeyi Sil / Geri Al") on past payments
  in `settlement.tsx`, and let the existing `settlements` realtime channel propagate the reversal.
  `needs: nothing · blocks: nothing (pairs with activity log settlement undo entries)`
- **[🚀 Medium] Custom/partial settlement amount in UI (Kısmi / Özel Tutarlı Ödeme).** The settlement
  screen only allows settling the exact algorithm-suggested debt per row (`handleSettle(s.amount)`).
  If a debtor only sends a partial payment (e.g., 50 ₺ of a 100 ₺ debt) or hands over a custom round
  cash amount, there is currently no way to record it directly in the UI without waiting or creating a
  dummy expense. *Fix:* in `settlement.tsx`, allow tapping on the amount or add a "Kısmi Öde" action
  opening a numeric input sheet to record an arbitrary partial payment amount (`0 < amount`), letting
  the settlement algorithm automatically recompute the remaining balance. `needs: nothing · blocks: nothing`
- **[🎨 Medium] Settlement screen (Ödeme Özeti) is hard to read — reorder around the user's question.**
  Developer feedback after the 2026-11-03 local test pass: following the checklist meant jumping up and
  down the screen. Today's order is: headline net balance, Üye Bakiyeleri, Önerilen Ödemeler, Geçmiş
  Ödemeler, then Bakiye Dökümünüz at the very bottom. The breakdown is the part that explains the
  headline, and it is furthest from it. *Proposed order (to be validated, other layouts welcome):*
  1. **Headline + Bakiye Dökümünüz** directly under it, as a compact summary (Harcamalar · Ödemeler ·
     Net) that expands to the per-expense rows. Collapsible or always-on is still to decide.
  2. **Önerilen Ödemeler**, i.e. what to do now.
  3. **Üye Bakiyeleri** and **Geçmiş Ödemeler** last, as reference.

  Do it **in one pass with the two items above** (undo, partial amount): all three reshape
  `settlement.tsx`, and that is the screen Sprint #4's B.2 check guards. Re-run that check
  (ledger net = headline, before and after a payment) on the local stack afterwards.
  `needs: nothing · blocks: nothing (pairs with settlement undo + partial amount)`
- **[🐛 Medium] A recomputed suggestion looks like an unexplained new demand.** Suggestions are
  recomputed from net balances every time, so someone who already paid can be asked again, to a
  different person, for a different amount — correct debt simplification, presented as a fresh
  demand. *Real fix:* show what a suggestion replaced ("B'ye 100 ₺ idi, C'nin harcamasından sonra
  A'ya 40 ₺ oldu") — needs suggestion history from the activity log. *(A cheap interim one-liner
  lives in the Continuous Lane.)* `needs: activity log · blocks: nothing`
- **[🐛 Medium] A deleted account leaves a balance nobody can settle — write-off.** Anonymisation is
  correct, but the departed user's balance stays in the group and can never clear (RLS needs
  membership; the account can't sign in). Live: *Sienna* carries 1.316,53 ₺ owed forever; *Vienna*
  is entirely deleted accounts. *Fix, two halves:* (1) warn before deletion — the deletion screen
  lists non-zero balances (a warning, not a block; Apple 5.1.1(v) keeps deletion available); (2) at
  deletion time insert a settlement per affected group zeroing the departing balance, noted "Hesap
  silindi", and write the exit to the activity log. Redistributing the loss was considered and
  rejected. **Now unblocked** by the naming decision above. `needs: deleted-account naming (settled),
  activity log · blocks: nothing`

### Sprint #11 · Currency & receipt features — *the big feature block* · ships

Currency plumbing must precede currency features; line-item splitting needs the OCR output shape
changed first. Both the format bug (#9) and the payer/split refactor (#8) come before this.

- **[🚀 Medium] Flexible multi-currency support.** Transactions in EUR/USD/etc. with conversion
  rules (historical rate at transaction date, current live rate, or keep original currencies
  unconverted). `calculateBalances` / `calculateSettlements` currently assume one currency. `needs:
  TRY→currency format fix (#9) · blocks: Itemized Splitting, QR/IBAN`
- **[🚀 Medium] Itemized receipt splitting.** Assign individual receipt line items to specific
  members instead of only splitting the total. *Prerequisite the backlog entry omits:* the
  `parse-receipt` edge function currently returns only merchant/date/total/currency — its prompt and
  response schema must emit line items first, surviving the same OCR-accuracy problems. Treat the OCR
  schema change as its own piece of work. Needs DB support for line items + a modular selection flow.
  `needs: parse-receipt schema change, multi-currency · blocks: Retroactive Receipt`
- **[🚀 Low] Retroactive receipt attachment.** Attach a receipt photo to an existing expense; if the
  scanned details differ, prompt to update the expense (A) or keep details and attach the image as
  proof (B). Leverages the same item/split reconciliation flow. Workaround exists (delete + re-add).
  `needs: Itemized Splitting · blocks: nothing`
- **[🚀 Low] Easy debt settlement & QR/IBAN.** Share creditor IBAN, generate dynamic FAST-compatible
  payment QR codes, or link out. Encodes amounts, so it must come after multi-currency. `needs:
  multi-currency · blocks: nothing`

### Sprint #12 · Localization, voice & UI polish — *strings written once* · ships

Do the voice cleanup *inside* the translation dictionary so ~400 strings aren't rewritten twice;
this comes after the `ExpenseForm` extraction (#8) so shared strings aren't dictionaried twice
either. Sheet appearance follows sheet behaviour.

- **[🚀 Medium] Localization (en / tr).** ~200 strings with Turkish-specific characters, likely
  400+ including ASCII-only, across ~10.5k lines. Device-locale or user preference. Write the
  Activity Log's action-to-sentence mapping against a dictionary from day one. `needs: ExpenseForm
  extraction (#8) · blocks: nothing`
- **[🧹 Low] One Turkish voice (settle on formal "siz").** The app mixes formal (auth, validation,
  expense forms, profile, group detail) and informal (whole dashboard, `balance-groups-sheet`,
  `expense-ledger-sheet`, strength meter). Formal fits a finance app and is the majority. Fix inside
  the dictionary. Also: "Eşitsiniz" is odd for a zero balance, "TEHLİKELİ ALAN" is a calque, and
  "Harcama Dökümüm" vs "Harcama Detayı" use two words for one idea. `needs: Localization · blocks:
  nothing`
- **[🧹 Low] One voice for user feedback (Alert vs Toast).** Rule: inline errors for field
  validation, Toast for async results (success + failure), Alert only for destructive confirmation.
  Note: saving an expense gives no success feedback today. `needs: nothing · blocks: nothing`
- **[🎨 Medium] Card-stack UI for payer/split selection.** Fine-tune swipe/gesture animations on the
  custom bottom sheets for smooth card-stack sliding. `needs: ExpenseForm extraction (#8) · blocks:
  Liquid Glass`
  **Also migrate off the deprecated gesture builders** (gesture-handler 3, since SDK 58): `Gesture.Pan()` /
  `Pinch()` / `Tap()` / `Exclusive` / `Simultaneous` → `usePanGesture` etc. in `ui/bottom-sheet.tsx`,
  `app-bottom-bar.tsx`, `ui/image-viewer-modal.tsx`. They still work in 3.3 but "will be removed in a future
  version"; doing it while retuning the sheets avoids touching them twice.

- **[🎨 Low] Liquid Glass progressive enhancement (iOS 26+).** `expo-glass-effect` refraction/blur
  with a glassmorphism fallback. Candidate surfaces: floating island bottom bar (`app-bottom-bar`),
  bottom sheets (`ui/bottom-sheet` + everything on it), sticky headers. **Not** on content cards
  (legibility). `needs: Card-stack UI (tuning glass against animation about to change is wasted) ·
  blocks: nothing`
  **SDK 58 option for the bottom bar (noted 2026-11-03, no rush):** `app-bottom-bar.tsx` draws its glass
  look in JS. expo-router 58 ships native tabs at a stable path, `expo-router/native-tabs`, which render the
  system tab bar, including Liquid Glass on iOS 26+. Evaluate switching, but check first that native tabs
  can host what the custom bar does today: the center "+" action and the swipe gesture. If they cannot,
  keep the custom bar and give it `expo-glass-effect`.

- **[🎨 Low] Biometric app lock (FaceID / TouchID).** Optional privacy shield via
  `expo-local-authentication` on open / before sensitive actions — not for login (session persists).
  `needs: nothing · blocks: nothing`

---


## Continuous Lane · Independent Chores (grab-bag)

Touch nothing else and nobody waits on them — pick up between Sprints, ordered by priority tag.

- **[🐛 Low] Dead-end "Grup bulunamadı" screens.** The not-found blocks in `add-expense.tsx` and
  `settlement.tsx` have no back button (strands the user); `groups/[groupId]/index.tsx` already does
  it right with a Geri button — copy it. `independent`
- **[🐛 Low] Account-deletion success message is never seen.** `delete-account.tsx` calls
  `signOutApp()` *then* `Alert.alert(...)`, but the auth layout redirects to login the moment the
  session clears. Show the confirmation before signing out, or carry a one-time banner into login.
  `independent`
- **[🐛 Low] Delete-expense trash icon stays tappable in-flight.** The trash icon in
  `expenses/[expenseId]/edit.tsx` has no in-flight state, so it can be tapped repeatedly during a
  soft delete. (The settlement half was fixed in Sprint #4.) `independent`
- **[🐛 Low] Multi-payer avatar highlight missing after "Temizle".** In `add-expense.tsx` and
  `expenses/[expenseId]/edit.tsx`, when selecting multiple payers, `HorizontalAvatarPicker` calculates
  `selectedIds` by filtering `parseFloat(payerAmounts[id]) > 0`. When "Temizle" is tapped (`setPayerAmounts({})`)
  and then a member avatar is tapped, `onToggle` sets `copy[userId] = '0'`. Because `0 > 0` is false,
  the selected member's avatar does not show the selected border highlight until a positive amount is typed.
  *Fix:* count any member present in `payerAmounts` (`payerAmounts[id] !== undefined && payerAmounts[id] !== ''`)
  as selected. `independent`
- **[🎨 Low] Display creation time / hour:minute next to expense date.** Expense list items in
  `groups/[groupId]/index.tsx` currently format dates using `formatShortDate(e.date)` (`27 Eki 2026`). For same-day
  trip expenses, there is no hour/minute indication to distinguish the timeline or show when an expense occurred.
  *Fix:* display the creation time (e.g., `Bugün 14:35` or `27 Eki · 14:35`) when available. `independent`
- **[🐛 Low] Recomputed-suggestion one-liner (interim).** Until the Activity Log lands (#10), add a
  one-line explainer on the settlement suggestions section ("Öneriler her değişiklikten sonra en az
  sayıda transfere göre yeniden hesaplanır"). `independent`
- **[🎨 Low] Privacy policy — website deletion-path fix.** Section 5 of the published policy still
  says deletion is *Profil → Hesabı Sil*; it is now *Profil → Profili Düzenle → Tehlikeli Alan →
  Hesabı Sil*. Website edit, outside this repo. `independent`
- **[🧹 Low] Accessibility pass.** Icon-only controls with no `accessibilityLabel` (bottom-bar tabs,
  profile rows, theme sheet, dashboard debt/activity rows, quick-add/balance rows, "Tümünü Gör",
  emoji pickers); header back/trash buttons ~38×38pt (add `hitSlop` for 44pt); fixed `fontSize` with
  no `maxFontSizeMultiplier` (dense rows clip at large text sizes). `independent`

---

## Backlog (unscheduled)

Large, no dependency yet. Pulled up when they become a dependency or you choose to.

- **[🐛 Medium] Crash and error reporting for the shipped app.** Today nothing reports what breaks on
  users' phones. Apple does collect crashes (Xcode → Organizer → Crashes, TestFlight and App Store
  alike), but only from users who opted in to share analytics with developers, usually a day late, and
  for a React Native app it shows the native frames of a JS crash, not the JS line. Errors that do not
  crash (a failed Supabase call, a "Ödeme kaydedilemedi" alert) never reach anyone. Options to compare
  when this is pulled up: Sentry (`@sentry/react-native` with its Expo config plugin; JS stack traces
  via source maps uploaded from the EAS build, free tier), Bugsnag, or Firebase Crashlytics (native SDK
  plus a Firebase project; weakest on JS errors). Whichever is chosen needs: no personal data in events
  (user id only, never e-mail or amounts), a privacy-policy line and the App Store privacy label "Crash
  Data / Diagnostics", and source-map upload wired into `release.yml`. `independent · blocks: nothing`
- **[🧹 Low] Maestro smoke flow in CI.** `.maestro/smoke.yaml` runs locally (`npm run test:e2e`).
  In CI it needs a macOS runner, an iOS simulator build of the dev client per PR (~20–30 min) and
  the local Supabase stack, plus the seed password as a repo secret. Worth it once UI regressions
  start slipping past the manual checklist. `needs: nothing · blocks: nothing`
- **[🧹 In progress · 2026-11-22] Hosted non-production Supabase project → `splitsnap-staging`.**
  *Why it was deferred (2026-11-03):* the local stack had already proved itself as the place a
  migration fails first (the payer fix was reproduced, fixed and covered there before the production
  push), and the iOS simulator reaches `localhost`, so a dev build gets local auth, storage, realtime,
  edge functions and Mailpit without the upkeep of a second hosted project (pausing on inactivity,
  schema sync, secrets, test accounts). *Why now:* one of the recorded triggers came true — the
  release workflow needs a hosted backend while the developer's machine is off. Scope stays narrow:
  staging serves only `.github/workflows/release.yml`, the release workflow rebuilds it from
  migrations + seed on every run (so there is no schema to keep in sync by hand), a weekly
  keep-alive stops the free-plan pause, and development stays local-first. Still open triggers for a
  wider dev project: builds for other testers, Sprint #7's hosted OAuth callbacks.
  `needs: nothing · blocks: one-button release`
- **[🚀 Low] Bank/card transaction auto-import.** SMS-notification parsing or Open Banking to
  suggest draft expenses. *Shared abstraction:* this and Itemized Splitting both produce "here is a
  suggested expense, confirm or edit it" — whichever is built first should introduce the shared
  draft-expense concept so they don't grow two flows. `independent (for now)`
- **Profile avatars** — listed as the optional tail of Sprint #7; drops here if it doesn't make that
  cut. `needs: Storage bucket + RLS`
- **[🧹 Low] Overnight agent runs the gates (NightShift for SplitSnap).** The idea in
  `~/Desktop/gece_tasker.md`: an agent picks up queued work overnight, runs the checks, and leaves a
  report to review in the morning. For this repo the realistic job is narrow — **take a Renovate PR,
  run the Sprint #13 gates in a worktree, and when one goes red, diagnose it and leave a patch plus
  a report** — not open-ended feature work. It belongs behind #13 because an agent with no gates to
  run has nothing to report except its own opinion, which is the one thing that must never be the
  pass criterion. Rules already agreed in that file apply: git stays the developer's (no
  commit/push/PR), production is read-only, each job writes a report with a separate "what I could
  not verify" section, and the Mac only takes heavy work on power with disk to spare. Note the
  constraint recorded there too: Google's FAQ says an individual Antigravity subscription does not
  support wiring its CLI into third-party orchestrators, so prefer each tool's own scheduler over a
  cross-vendor orchestrator. Driving simulators unattended is the least reliable part and should be
  last: in the 2026-10-27 session `simctl` calls hung for minutes, the simulator tool crashed once,
  and a cold build ran long — fine with someone watching, expensive at 03:00.
  `needs: Sprint #13 (done 2026-11-22) · blocks: nothing`

---

## Recent Updates & Changelog

Completed Sprints are archived under [`docs/changelog/`](docs/changelog/):

- **Sprint #13 — Test Harness & CI (November 2026, pulled ahead of #6):** SQL suites that fail
  (`test:db`), Jest unit tests for the money paths, GitHub Actions CI on every PR, Renovate kept off
  SDK-pinned packages, a local Maestro smoke flow, SDK 58.0.26 alignment, and fixes the tests found
  (`amountsMatch` one-kuruş boundary, `parseAmount` thousands separators, dark-mode date spinner).
  [sprint_13_test_harness_ci.md](docs/changelog/sprint_13_test_harness_ci.md)
- **Sprint #5 — Release Closeout, Local-First Dev & Expo SDK 58 (November 2026):** old-client payer
  preservation, sub-kuruş equal-split math, iOS 27 `UIScene` adoption, local-first Supabase CLI 3.0
  workflow + `service_role` grants migration, and Expo SDK 58 (RN 0.88.1 / React 19.3) upgrade.
  [sprint_05_release_local_dev_sdk_58.md](docs/changelog/sprint_05_release_local_dev_sdk_58.md)
- **Sprint #4 — The Settlement Screen Adds Up (July 2026):** ledger breakdown redesign, stale
  suggestion guards, duplicate-alert block, realtime subscription fixes.
  [sprint_04_settlements_logic.md](docs/changelog/sprint_04_settlements_logic.md)
- **Sprint #3 — Expense Write Integrity (July 2026):** write integrity, RLS, owner scopes, role
  grants, integration tests. [sprint_03_expense_write_integrity.md](docs/changelog/sprint_03_expense_write_integrity.md)
- **Sprint #2 — Split Payer & Premium UI (July 2026):** multiple payers, receipt-scan validation,
  AI daily quota, gesture sheets, AMOLED theme. [sprint_02_split_payer_premium_ui.md](docs/changelog/sprint_02_split_payer_premium_ui.md)
- **Sprint #1 — Expo SDK 57 & Tamagui Upgrade (July 2026):** React 19 / SDK 57 migration, portal
  context fixes, fast-refresh channel leak fixes. [sprint_01_expo_sdk_tamagui.md](docs/changelog/sprint_01_expo_sdk_tamagui.md)

---

## Archived Pre-Release History

For the pre-release roadmap and progress leading to `v1.0.0`:
- [docs/archive/school/ROADMAP.md](docs/archive/school/ROADMAP.md) — initial pre-release roadmap.
- [docs/archive/school/PROGRESS.md](docs/archive/school/PROGRESS.md) — pre-release development logs.
- [docs/archive/school/SplitSnap Tanıtım Raporu.md](docs/archive/school/SplitSnap%20Tan%C4%B1t%C4%B1m%20Raporu.md) — original university report.
