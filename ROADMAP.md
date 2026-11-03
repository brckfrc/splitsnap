# SplitSnap Roadmap & Backlog

This is the primary planning document for SplitSnap after the `v1.0.0` App Store release.
Work is organised as **dependency-ordered Sprints**, not by category or by urgency alone
(see *How This Document Works* below). Category emoji (🔐 🚀 🎨 🐛 🧹) and
`[High] / [Medium] / [Low]` are **tags on an item, not its location**.

---

## How This Document Works (read this before adding or moving items)

**Naming — one word: "Sprint".** A Sprint is the unit of planned + delivered work.
Upcoming Sprints live here (`#5, #6 …`); a Sprint that ships is moved to
[`docs/changelog/`](docs/changelog/) as `sprint_NN_*.md`, leaving only a one-line summary in
*Recent Updates & Changelog* at the bottom. Numbering is continuous with the changelog
(`#1–#4` are already there). Do **not** introduce a second word ("milestone", "phase") for
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
`docs/archive/school/*` (frozen).

---

## Active Status

- **Version:** `v1.2.0` (Build 13) — prepared, **pending submission**. `v1.0.0` is live on the
  App Store. `v1.1.0` / Build 12 was submitted but its review was cancelled before approval, so
  it never shipped; its changes are folded into the 1.2.0 notes.
- **Uncommitted working tree (~1,335 lines):** Sprint #3 (write-integrity migration + tests +
  audit SQL) and Sprint #4 (settlement screen rewrite, `+335` in `settlement.tsx`), plus
  `utils/numeric.ts` and the `MONEY_EPSILON` change, are **uncommitted**. (Per
  `AGENTS.md`, the developer commits and pushes manually — agents leave edits unstaged and never
  touch staging.)
- **Migrations are deployed, the client is not.** `20260727215500` + `20260727223000` went to the
  hosted database on 2026-07-31 and the payer fix (`20261027120000`) on 2026-10-27; `migration list
  --linked` reports 12 of 12 applied with nothing pending. So the server is fully up to date while
  every installed client predates Sprint #4 — what remains is the client test pass, a commit, an
  audit re-run, and the rebuild.
- **Framework:** Expo SDK 57 (React Native 0.86) + React 19 + TypeScript. **iOS only.**
- **Backend:** Supabase (Auth, DB, Edge Functions, Storage) — **a single project.** The dev/prod
  split in `docs/DEVELOPMENT_WORKFLOW.md` §1–§2 is aspirational, not built, so simulator runs and
  smoke tests write to live data (a Sprint #5 item, scheduled after the v1.2.0 test pass).
- **Build toolchain:** one toolchain, stable **Xcode 27.2** (iOS 27.2 SDK), for the simulators and the
  iOS 27.2 phone alike; the project's line is iOS 27 (no iOS 26/27.0/27.1 runtimes or targets). `npm run ios:pick`
  is the default run command (terminal device list); `ios:27` boots the Pro Max screenshot simulator.
  Xcode's script phases resolve Node through nvm from `.nvmrc`, via `ios/.xcode.env.local` generated
  by `plugins/withXcodeEnvNvm.js` on each prebuild; `engines` plus `engine-strict` fail an install on
  the wrong version. Details in `docs/DEVELOPMENT_WORKFLOW.md` §4.
- **Foundation already trusted:** the Sprint #3 server round (RLS regression on `expense_payers`,
  missing RPC validation, cross-group rewrite) is **deployed**, and the Sprint #4 presentation round
  (settlement screen reconciles with its own headline; stale suggestions can't book silent
  overpayments) is done in code but still needs the rebuild. Any feature that displays or acts on a
  balance rests on both.
- **Where we left off (2026-11-03):** the v1.2.0 client test pass is **complete** on two simulators
  (Deniz on A, Sude on B, in **Test grubu**), live DB integrity audit (`expense_integrity_audit.sql`) passed
  with 0 orphans and `0.00` net across all groups, test data was cleaned up, and `TEST-PLAN.md` was archived to
  [`docs/archive/test-plans/v1.2.0-test-plan.md`](docs/archive/test-plans/v1.2.0-test-plan.md).
  The pass also surfaced and **fixed a release blocker**: the app did not launch when built with the iOS 27.1+ SDK
  (Done bullet below). That fix (`expo-build-properties`, `app.json`), three small follow-up fixes
  (`equalShares` in integer kuruş, deterministic expense ordering in `expenses-supabase.ts` and
  `utils/expense.ts`), and new backlog items are ready to commit. Xcode and simulators are now on **27.2**
  (old 27.0 and 27.1 runtimes removed; local build & launch verified on 27.2).
  - **Shipped 2026-11-03:** **`1.2.1` (Build 15)** went to the App Store from `main` at `4b92dfd`
    (EAS build `a7359849`). It is the tested `1.2.0` code plus two Vite security bumps that touch
    only `design/` (#21, #23) and the version bump. The bump was needed because the `1.2.0` upload was refused:
    that version number had already been used on App Store Connect, so the next upload had to be `1.2.1`. This supersedes the plan below to wait for SDK 58.
    SDK 58 still follows on `dev` and becomes the next release.
  - **Release plan changed 2026-11-03:** Build 14 (`1.2.0`, SDK 57, EAS build `f5381af1`, commit
    `8a242c5`) went to **TestFlight only**, to confirm the UIScene fix on a real iOS 27.2 device. The
    **App Store submission waits until Sprint #5 closes**, on a build made **after the SDK 58 upgrade**.
    Two consequences. First, that SDK 58 build needs its **own** two-simulator test pass before it is
    submitted, because Build 14's pass does not carry over. Second, Sprint #4's settlement fix reaches
    users later. That delay is display only: the server-side payer fix has been live since 2026-10-27.
    With the submission deferred, the release freeze on dependency merges is lifted until the next test
    pass.
  - **Next:** the local-first dev environment on the `dev` branch (step 1, `config.toml` for CLI 3.0, is
    done: `65fde98`), then SDK 58, then the final test pass and the submission.
  - **Watch out:** the simulator tooling can be flaky on this machine; the workarounds are in
    `AGENTS.md` → Known Gotchas and `DEVELOPMENT_WORKFLOW.md` §4.
  - Do **not** open `docs/changelog/sprint_05_*.md` until Sprint #5 closes.

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

### Sprint #5 · Close out v1.2.0 — *unblocks everything* · ships to App Store

There is an unshipped release in the way; everything queued behind it gets more expensive the
longer it sits. The migrations went first, so **that gap is open right now**: the hosted server
validates writes that no installed client was ever built to satisfy. Old-build compatibility
was verified on 2026-07-28: no RPC signature change, receipt paths already match the new prefix
check, and the only direct table write old clients make is the soft-delete UPDATE the grants
migration covers.

- **[🔐 Done · 2026-10-27] Old client editing an expense no longer reassigns who paid it.**
  `update_expense_with_shares` treated an empty `p_payers` as "reset payers to `auth.uid()` for the
  full amount" (`20260727215500`, preserved from `20260726172500`). Any pre-multi-payer client sends
  no `p_payers`, so a v1.0.0 user editing only the title of someone else's expense silently became
  its sole payer, and `paid_by` was left alone so the two then disagreed. The audit never caught it:
  the payer total still equalled the amount, so every group still summed to zero — wrong
  attribution, not broken arithmetic. It had been live since the multi-payer migration (July).
  **Reproduced first**, on a local stack: a title-only edit moved the payer from bob to alice while
  `paid_by` still read bob. Fixed by
  [`20261027120000_preserve_payers_on_update.sql`](supabase/migrations/20261027120000_preserve_payers_on_update.sql),
  which makes an empty `p_payers` on UPDATE mean "leave the payers alone": keep the rows when the
  amount is unchanged, pro-rate them when it moved (the same thing `split-data.ts` `updateExpense`
  does client-side), and fall back to a single payer credited to `expenses.paid_by` — not to the
  caller — only when there were none at all. Covered by
  [`tests/expense_payer_preservation_test.sql`](supabase/tests/expense_payer_preservation_test.sql)
  (8 cases: multi-payer preserved, pro-rate 60/40 → 120/80, a payer rounding below a kuruş without
  losing the total, the fallback crediting `paid_by`, and an explicit `p_payers` still winning).
  The 19-case write-integrity suite still passes unchanged. **Pushed to the hosted database on
  2026-10-27** after a `--dry-run`, and the deployed function body was re-read to confirm the old
  branch is gone. Fold into `sprint_05_*.md` when this Sprint closes.
  `needs: nothing · blocks: nothing (it was the last [High] on the board)`
- **[🔐 Done · 2026-10-27] Equal split under one kuruş per person is accepted again.** The
  equal-split branch in `split-data.ts` did not filter zero-amount shares the way the manual branch
  does, so `amount / n < 0.01` produced `[0.02, 0, 0]` and `validate_expense_allocations` rejected
  the save outright (`invalid_share_amount`). Affected every build, not just old ones. The math now
  lives in one `equalShares` helper shared by `addExpense` and `updateExpense`, so the two cannot
  drift, and it drops zero rows — the remaining rows still sum to the total, so someone simply
  absorbs an amount too small to divide. Verified over 14 amount/participant combinations and then
  end-to-end against the server: the old `[0.02, 0, 0]` payload is still rejected, a zero-free
  payload is accepted, and `0.03 / 3` is unchanged. During the 2026-10-27 test pass the helper moved
  to integer-kuruş math that spreads the remainder one kuruş at a time over the first participants
  (`0.02 / 3` → `[0.01, 0.01]`, `100 / 7` → four × 14.29 + three × 14.28) instead of piling it all
  on the first one. Client-side only — ships with the rebuild below.
  `needs: nothing · blocks: nothing`
- **[🧹 Done · 2026-11-03, on `dev`] Local-first dev environment — stop writing to production, without a second project.**
  Simulator runs, smoke tests and screenshot seeding all mutate live data, because the app's `.env` points
  at the single hosted project. The original plan was a hosted `splitsnap-dev` project. **Re-decided
  2026-11-03:** use the **local Supabase stack** instead, and move the hosted project to Backlog (see
  there for when it becomes worth it). Two reasons. The local stack already proved itself as the place a
  migration fails first (the payer fix was reproduced, fixed and covered there before the production push).
  And the iOS simulator reaches `localhost`, so a dev build can run against local auth, storage, realtime,
  edge functions and Mailpit, with none of the upkeep of a second hosted project (pausing on inactivity,
  schema sync, secrets, test accounts). Work happens on the **`dev` branch**; `main` stays releasable.
  Steps, in order:
  1. **[Done · 2026-11-03, `65fde98`] CLI 3.0 compatibility.** CLI 3.0 refused the old `config.toml`
     (`[inbucket] … no longer supported`), so the local stack did not start at all. Diffed against a fresh
     CLI 3.0 template, the file now:
     - renames `[inbucket]` to `[local_smtp]`;
     - renames `auth.email`/`auth.sms` `enable_signup` to `enabled` (3.0 silently ignored the old keys);
     - moves `orioledb_version` to `[db]`;
     - sets **`api.auto_expose_new_tables = false`** (see step 2).

     Starts with no warnings; 27/27 SQL cases pass. The Supabase CLI itself now comes only from Homebrew
     (`DEVELOPMENT_WORKFLOW.md` §4).
  2. **[Done · 2026-11-03, on `dev`] `service_role` grants migration.** Supabase's changelog announced that
     from 2026-10-30, tables created in `public` are no longer exposed to the Data API automatically.
     Existing tables keep their grants. Whether the rollout is actually live is unclear: a CLI maintainer
     wrote on 2026-10-27 that it was being re-timed
     ([changelog](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically),
     [cli#7286](https://github.com/supabase/cli/issues/7286)). **Measured locally with CLI 3.0.0:**
     - With the flag unset, the stack still auto-grants everything, `anon` included, so local tests would
       never catch a missing `GRANT`.
     - With the flag `false`, `authenticated` gets exactly what `20260727223000_codify_role_grants.sql`
       intends, and `anon` gets nothing.
     - `service_role` got **nothing at all**. `delete-account`'s PostgREST update failed with **HTTP
       403 / 42501 "permission denied for table profiles"**.

     **Fixed by**
     [`20261103120000_codify_service_role_grants.sql`](supabase/migrations/20261103120000_codify_service_role_grants.sql).
     It grants `service_role` DML on all `public` tables and sequences and execute on all functions, plus
     default privileges so objects from future migrations are covered too, for `service_role` only.
     Verified:
     - The same request now returns **200**.
     - `anon` has nothing, and `authenticated` is unchanged.
     - A new table opens to `service_role` only.
     - 27/27 SQL cases pass.

     A production dump shows `service_role` already holds all of it there (12/12 tables, 16/16 functions,
     default privileges present), so the push is a pure no-op. **Push it when `dev` merges to `main`**, so
     production's migration history matches `main`. The grants rule for future migrations is in
     `AGENTS.md` → Known Gotchas.
  3. **[Done] Point simulator runs at the local stack.**
     - **`.env.development.local`** is gitignored and excluded from EAS. Expo's own loader confirms it is
       read in development mode only (local URL) and ignored in production mode (production URL).
     - **[`supabase/seed.sql`](supabase/seed.sql)** runs on every `db reset` and creates Deniz, Mert and
       Sude (local-only password `localdev123`), Test grubu and two expenses. A password sign-in against
       the local Auth succeeded, RLS returned only Deniz's group with correct shares, and the SQL suites
       still pass with the seed present.
     - `parse-receipt` locally needs `OPENAI_API_KEY` in `supabase/functions/.env` (gitignored).
       Without it the app falls back to its on-device parser.
  4. **[Done: was already true] Production keys in EAS environment variables.** `eas env:list --environment
     production` already holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`, and `.easignore`
     already keeps every `.env*` out of the upload. Production builds never read a local file.
  5. **[Done] Docs.** `DEVELOPMENT_WORKFLOW.md` §1–§3 have been rewritten: the environments table,
     first-time setup, local test data, Mailpit/Studio, Edge Functions, and the migration lifecycle.
     `AGENTS.md` and `supabase/README.md` no longer say that development writes to production.

  **Still to do on this branch before merging:** one run of the app on the simulator against the local
  stack (sign in as Deniz, open Test grubu, record a payment).

  A permissions regression test (asserting the grant matrix above) fits Sprint #13.
  `needs: nothing · blocks: SDK 58 upgrade, Sprint #13 Maestro flow`
- **[🧹 Medium] Upgrade to Expo SDK 58 — on a feature branch, after the local-first dev environment.** Expo SDK 57 pins the version of every native package
  (`react-native` 0.86.x, `react` 19.2.3, reanimated, worklets, screens, gesture-handler,
  safe-area, datetimepicker). Renovate's non-major PR (#15, 2026-09) bumped them past that to the latest
  npm releases (`react-native` 0.87.1, `react` 19.3.0, …) — a set no SDK ships together, which failed
  `npx expo install --check` on 11 packages and `tsc` with 6 errors from the RN 0.87 types (`ScrollView`
  refs in `groups/[groupId]/index.tsx`, `AppState` status in `expenses-sync.ts`). Those packages move
  only with the SDK, never one by one. SDK 58 was at `58.0.0-preview.4` on 2026-09-22 and is
  **stable since** (`latest` = `58.0.19` on 2026-10-27; SDK 57 still maintained at `57.0.31`).
  *To do it:* `npx expo install expo@^58 --fix` (Expo picks the
  compatible set; `expo install --check` is the gate, not a hand-kept list), fix the type errors,
  `npx expo prebuild --clean --platform ios`, full run-through on simulator and phone. Its own Sprint-sized
  pass — not mixed with feature work, and not during a release pass. Close #15 (and any Renovate PR that
  bumps SDK-managed packages) rather than cherry-picking from it; the only safe picks there were `.nvmrc`
  (needs `nvm install` first) and the `design/` prototype.
  *Note on iOS 27 scene lifecycle:* SDK 58 adopts `ExpoAppSceneDelegate` directly in the native project template;
  upon upgrading, delete `ios.enableSceneSupport: true` under `expo-build-properties` in `app.json` (and uninstall
  `expo-build-properties` if unused by other features).
  Placed here on 2026-10-27 (moved up from Backlog). The App Store build for `1.2.0` is made **after**
  this upgrade (decision 2026-11-03, see Active Status), and it comes after the local-first dev
  environment, so the full run-through goes against the local stack rather than live data. Do it on a
  feature branch and merge only once `expo install --check`, `tsc`, the SQL suites and the two-simulator
  run are clean.
  **Renovate around it:** close #18 (this upgrade replaces it); afterwards Renovate opens fresh PRs
  against the SDK 58 baseline, which get triaged normally.
  `needs: local-first dev environment · blocks: the 1.2.0 App Store submission`
- **[🧹 Done · 2026-07-31] Build toolchain: Node resolves from `.nvmrc`.** Xcode's script phases held a
  hardcoded Homebrew Node path that died on a revision bump (`node/26.5.0` → `26.5.0_1`), so no build
  ran at all. `ios/.xcode.env.local` is now generated on every prebuild by
  [`plugins/withXcodeEnvNvm.js`](plugins/withXcodeEnvNvm.js) and resolves Node through nvm, and
  `engines` + `engine-strict` turn a wrong local version into a failed install instead of a warning.
  Also added the `ios:26` / `ios:27` / `ios:pick` simulator targets — the first two boot their target
  through `scripts/run-ios-simulator.sh`, because Expo's `--device` install path goes through
  `devicectl`, which refuses a shut-down simulator — and documented that plus the SDK-vs-runtime
  distinction in `docs/DEVELOPMENT_WORKFLOW.md` §4. Fold into `sprint_05_*.md` when this Sprint closes.
  `needs: nothing · blocks: nothing (it unblocked the test pass)`
- **[🧹 Done · 2026-09-15] Toolchain moved to stable Xcode 27; iOS 26 targets retired.** Xcode-beta is
  gone and the phone runs the iOS 27.0 release, so stable Xcode deploys to it directly. `ios:device`
  (which pointed at the missing `Xcode-beta.app`) and `ios:26` (whose iOS 26.5 runtime and simulator
  no longer exist) are deleted; `ios:pick` is the single default and `ios:27` stays for screenshot
  geometry. `DEVELOPMENT_WORKFLOW.md` §4, `AGENTS.md`, `README.md`, `APP-STORE.md` and `TEST-PLAN.md`
  updated to match. Fold into `sprint_05_*.md` with the bullet above.
  `needs: nothing · blocks: nothing`
- **[🧹 Done · 2026-10-27] `npm run ios:27` was broken on this machine.**
  `scripts/run-ios-simulator.sh` raised the simulator window with a bare `open -a Simulator`, which
  resolves through LaunchServices and failed with "Unable to find application named 'Simulator'" —
  and because the script runs under `set -e`, it died there and the build never started. Xcode 27
  ships no `Simulator.app` under the developer directory at all on this install. The window step is
  now best-effort and never fatal: `xcrun simctl` drives the device headless, which is all the build
  and install need. The breakage was invisible because the default run command is `ios:pick`, which
  does not go through the script. `needs: nothing · blocks: nothing`
- **[🔐 Done · 2026-10-27] Release blocker: the app did not launch when built with the iOS 27.1 SDK.**
  Built with Xcode 27.1, the app installed and then died at launch with "UIScene life cycle is
  required for apps built with this SDK" (UIKit traps in
  `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). The Expo SDK 57 prebuild template
  still starts React Native into a `UIWindow(frame:)` from `didFinishLaunching` and ships no
  `UIApplicationSceneManifest`. Shipping without this fix, any EAS image on an iOS 27.1+ SDK would
  have produced a build that crashed on launch for every user. Installed apps were not affected,
  because the rule applies to binaries built with the new SDK. *Fix:* Expo's documented SDK 57
  opt-in, `expo-build-properties` with `ios.enableSceneSupport: true` in `app.json`. Prebuild then
  wires `AppDelegate` as `ExpoReactNativeFactoryProvider` and points the manifest at Expo's
  `EXExpoAppSceneDelegate`. Verified side by side on two simulators: the pre-fix build crashed at
  launch and the rebuilt one ran the whole test pass. SDK 58 makes this the default; drop the flag
  then (see the SDK 58 item in Backlog). `needs: nothing · blocks: the production build`
- **Rebuild and submit.** Migrations are fully deployed (Sprint #3's two on 2026-07-31, the payer fix
  on 2026-10-27; `migration list --linked` shows 12 of 12 applied, nothing pending). What is left:
  finish the client test pass on the simulators, **commit the working tree** (EAS builds from the
  committed state, so uncommitted fixes would not reach the build), re-run the audit queries,
  `eas build --profile production` and submit. Version stays `1.2.0`; the build number is
  auto-incremented by EAS (`appVersionSource: remote`).
  **Status 2026-11-03:** Build 14 built from `8a242c5` and sent to TestFlight only. The App Store
  submission is deferred to the end of this Sprint, on a fresh build after the SDK 58 upgrade, with a
  new two-simulator test pass first (see Active Status).
  `needs: SDK 58 upgrade, its test pass · blocks: Sprints #6+`

### Sprint #6 · Backend hardening — *deploy-only, no client rebuild* · not blocked by the release

Server-side only, so it ships without waiting on the App Store queue, and it finishes the same
class of RLS work as Sprint #3 while that context is still loaded.

- **[🔐 Low] Edge-function pass (same two files).**
  - `delete-account`: `user_metadata: {}` does **not** erase the name — GoTrue *merges* metadata, so
    `full_name` written at signup stays in `raw_user_meta_data` (visible in the Auth dashboard; the
    function's "PII removed" comment is currently false). *Fix:* set keys explicitly to null
    (`{ full_name: null, name: null, avatar_url: null }`).
  - `delete-account` returns internal `detail: err.message` on 500 (two call sites) — log
    server-side, return a generic error.
  - `get_emoji_usage_stats` has no explicit `search_path` / `REVOKE` / `GRANT` — the only function
    not locked down like the others (SECURITY INVOKER, so RLS still filters it).
  `needs: nothing · blocks: nothing · independent within the sprint`
- **[🔐 Medium] `settlements` rows are neither immutable nor sanity-checked.** The soft-delete UPDATE
  policy (`20260412140000_week4_expenses.sql`) lets a party rewrite the whole row, `amount` included,
  and there is no `from_user_id <> to_user_id` constraint (unlike `friend_requests`). The client only
  ever INSERTs settlements (`createSettlementRemote`), never updates `amount`, so freezing it breaks
  nothing. *Fix:* restrict UPDATE to `deleted_at` only (freeze `amount`, `from_user_id`,
  `to_user_id`) and add the distinct-users check. `needs: nothing · blocks: nothing`
- **[🔐 Medium] Direct `expenses` writes allow an arbitrary `paid_by`.** The INSERT policy checks
  membership + `created_by = auth.uid()` but never constrains `paid_by`; UPDATE pins neither
  `paid_by`, `created_by` nor `group_id`. The grants migration `grant`s `insert, update` on
  `expenses`, but the client only uses the soft-delete UPDATE (`deleted_at`). *Cleanest fix:*
  `revoke insert on expenses` (creation is RPC-only) and add a `WITH CHECK` freezing
  `paid_by / created_by / group_id` on UPDATE — client-safe. `needs: nothing · blocks: nothing`
- **[🔐 Low] `profiles.email` projection.** Readable by co-members and selected by the client; drop
  it from group-scoped projections unless actually needed. `needs: nothing · blocks: nothing`

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
- **[🎨 Low] Liquid Glass progressive enhancement (iOS 26+).** `expo-glass-effect` refraction/blur
  with a glassmorphism fallback. Candidate surfaces: floating island bottom bar (`app-bottom-bar`),
  bottom sheets (`ui/bottom-sheet` + everything on it), sticky headers. **Not** on content cards
  (legibility). `needs: Card-stack UI (tuning glass against animation about to change is wasted) ·
  blocks: nothing`
- **[🎨 Low] Biometric app lock (FaceID / TouchID).** Optional privacy shield via
  `expo-local-authentication` on open / before sensitive actions — not for login (session persists).
  `needs: nothing · blocks: nothing`

---

### Sprint #13 · Test harness & CI — *the gate every later change goes through* · internal

The highest-value work on this board that is not a release blocker, and the answer to a specific
problem: **a Renovate PR gets zero automated verification today.** Even a non-major bump can break
the app, and the two that were caught (#15 in September, #18 in October — both pushed `react-native`
and `react` past what the installed Expo SDK pins) were caught only because someone ran
`expo install --check` and `tsc` by hand. Those are two deterministic commands. In CI they would
have failed the PR unattended.

Three things are missing, all verified on 2026-10-27:

1. **No test runner.** No jest, no vitest, no `npm test`. The SQL suites under `supabase/tests/`
   are run by hand through `docker exec … psql`, and — the part that matters — they print PASS/FAIL
   as `NOTICE` and **exit 0 either way**. A test that cannot fail a command is not a gate; today you
   have to read the output and count. First job: make the suites set a non-zero exit on any FAIL and
   wrap them in `npm run test:db`.
2. **One Supabase project.** Local `.env` points at production, so every simulator run, smoke test
   and seed writes live data. This is the hard prerequisite for anything unattended, and it is
   already the dev-database item in Sprint #5.
3. **No CI.** `.github/workflows/` does not exist. Nothing runs on push or on a PR.

Suggested order, each step useful on its own:

- **[🧹 High] Make the SQL suites fail properly, add `npm run test:db`.** Smallest piece, unblocks
  everything below. `needs: nothing · blocks: CI`
- **[🧹 High] GitHub Actions: `npm ci` → `expo install --check` → `tsc` → `lint` → `test:db`**
  against a Supabase stack in the runner. This alone closes the Renovate hole, with no agent and no
  tokens. `needs: test:db · blocks: trustworthy Renovate merges`
- **[🧹 Medium] One Maestro smoke flow** (sign in → create group → add expense → record a payment →
  the ledger net equals the headline balance). Maestro suits React Native and runs in CI; a fixed
  flow, deliberately not an open-ended "navigate and judge". Needs a non-production backend first, because a
  flow that runs on every PR cannot be writing to production. In CI that is the Supabase stack started inside
  the runner, the same local-first setup as Sprint #5. `needs: local-first dev environment (#5) · blocks: nothing`
- **[🧹 Low] Extend the DB suites to the rest of the money paths** — invite codes, account deletion,
  receipt-path scoping, the settlement RLS policies. These are cheap to write and never flaky,
  unlike UI tests. `needs: test:db · blocks: nothing`

Why this is its own Sprint rather than folded into another: it changes how every later Sprint is
verified, and the numbering is identity, not priority — pull it forward as soon as Sprint #5's dev
database lands, ahead of #7 if you want Renovate quiet. **Deliberately excluded:** anything that
depends on an agent's own judgement of its own work. The pass criterion is an exit code. The payer
fix above is the model: it was trustworthy because the bug FAILED a test first and PASSED after,
not because the code looked right.

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

- **[🧹 Low] Hosted `splitsnap-dev` Supabase project.** Deferred on 2026-11-03 in favour of the
  local-first dev environment (Sprint #5). Pull it up when any of these becomes true:
  - Builds go to **other people** (TestFlight/preview testers) and must not write to production. Their
    devices cannot reach a laptop's `localhost`.
  - Sprint #7's OAuth (Apple/Google) callbacks or real e-mail confirmation flows turn out to need a
    hosted Auth setup that the local stack cannot stand in for.
  - Agents or CI need a **hosted** environment while the developer's machine is off.

  When created: leave "Automatically expose new tables" **unchecked**, then apply the migration chain,
  which includes the `service_role` grants. `needs: one of the triggers above · blocks: nothing`
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
  `needs: Sprint #13 · blocks: nothing`

---

## Recent Updates & Changelog

Completed Sprints are archived under [`docs/changelog/`](docs/changelog/):

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
