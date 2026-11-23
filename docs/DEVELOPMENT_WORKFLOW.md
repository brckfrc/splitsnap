# SplitSnap Development and Deployment Workflow

> [!NOTE]
> Persistent guide for environment management, migration tracking, iOS toolchains, and EAS deployment. Lives at `docs/DEVELOPMENT_WORKFLOW.md` (this path — there is no `docs/dev/` folder).

This document covers environments, the database migration lifecycle, iOS toolchains and EAS builds. **Development is local-first**: the simulator runs against a local Supabase stack, production is touched only by releases and by deliberate, verified migration pushes. A hosted `splitsnap-dev` project is deferred (ROADMAP → Backlog).

---

## 1. Environments

| | Backend | Where the app's URL/key come from |
|---|---|---|
| **Development** (`expo start`, `expo run:ios`, `npm run ios:*`) | **Local Supabase stack** in Docker (`http://127.0.0.1:54321`) | `.env.development.local` (gitignored) |
| **Staging** (release workflow only: `eas build --profile e2e`) | Hosted project `splitsnap-staging` (ref in the GitHub variable `STAGING_PROJECT_REF`), rebuilt from migrations + seed on every release run | **EAS environment variables**, `preview` environment |
| **Production** (`eas build --profile production`) | Hosted project `splitsnap` (`vlrbkplylwoejnkwnaab`) | **EAS environment variables**, `production` environment |

**Why this is safe.** `.env*` files are in both `.gitignore` and `.easignore`, so none of them is uploaded to EAS. A production build cannot pick up a local URL. Expo's loader confirms the split: `.env.development.local` is read in development mode only. In production mode only `.env` would apply, and EAS never sees it either.

The iOS simulator reaches `localhost`, because `NSAllowsLocalNetworking` is on. A physical phone cannot reach the laptop's `localhost`, so a dev build on the phone needs the production values (rename `.env.development.local` away and restart Metro), or a hosted dev project once one exists.

### First-time setup (and after `git clone`)

```bash
supabase start                 # Docker must be running; pulls images pinned to production's versions
supabase db reset              # LOCAL only: all migrations + supabase/seed.sql
supabase status -o env         # prints API_URL and ANON_KEY for the file below
```

`.env.development.local`:
```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_KEY=<ANON_KEY from supabase status; the CLI's fixed local demo key>
```

**Local test data** comes from [`supabase/seed.sql`](../supabase/seed.sql) and runs on every `db reset`:
- accounts `deniz@borak.dev`, `mert@borak.dev`, `sude@borak.dev`, all with the **local-only** password `localdev123`;
- **Test grubu**, owned by Deniz, with Mert and Sude as members;
- two equal-split expenses Deniz paid, so the settlement screen opens on Deniz +3.000 · Mert −1.500 · Sude −1.500.

E-mails the local stack would send (sign-up confirmation, password reset) show up in **Mailpit**: `MAILPIT_URL` in `supabase status`. **Studio** (table browser, SQL editor) is at `STUDIO_URL`.

**Edge Functions** run inside the local stack. `delete-account` works with no setup, because the CLI injects the local service-role key. `parse-receipt` needs an OpenAI key in `supabase/functions/.env` (gitignored), one line `OPENAI_API_KEY=sk-...`. Without it the function fails and the app falls back to its on-device heuristic parser.

## 2. Production configuration

- **App build:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` live in the EAS `production` environment (`eas env:list --environment production`). Change them there, never in a file.
- **Secrets** for Edge Functions: `supabase secrets set OPENAI_API_KEY=...` against the linked project. `parse-receipt` also reads optional `OPENAI_RECEIPT_MODEL` (default `gpt-6-luna`) and `OPENAI_RECEIPT_REASONING_EFFORT` (default `none`; `omit` for a non-reasoning model).
- **`supabase/.temp/*-version`**, written by `supabase link`, pins the local stack's service versions to production's. See §4 → *Supabase CLI*.

## 3. Migration lifecycle

Rule: a migration is proven locally before it reaches production, and production history follows `main`.

1. **Branch.** Cut a feature branch from `main`. `main` stays releasable.
2. **Write.** `supabase migration new <name>`. Every `CREATE TABLE` in `public` grants `authenticated` exactly what its RLS policies allow (`AGENTS.md` → grants rule). `service_role` is covered by default privileges.
3. **Prove locally.** `supabase db reset` replays the whole chain from scratch. Then `npm run test:db` (`supabase/README.md` → *Testler*); it exits non-zero on any failing case. A fix for a bug gets a test that FAILS before it and PASSES after it.
4. **Run the app against it.** Simulator plus local stack, two simulators for multi-user flows (§4).
5. **Merge to `main`.**
6. **Push to production deliberately**, never as a side effect: `migration list --linked` → `db push --dry-run` → `db push --linked` → verify with a dump. The full procedure is in `supabase/README.md` → *Canlıya migration push*. This needs the developer's explicit go-ahead.
7. **Client/server ordering.** A migration that old installed clients cannot satisfy must stay backward-compatible until the new client is live. Otherwise ship the client first and the migration with it, and verify old-client paths in SQL by calling the RPCs the way an old build does.

## 4. iOS Toolchain and Run Targets

There is **one** toolchain: stable **Xcode 27.2** (iOS 27.2 SDK), the `xcode-select` default. It builds for the simulators and for the physical iPhone (on the iOS 27.2 release) alike, so no command needs a `DEVELOPER_DIR` override. The project's line is **iOS 27**: there is no iOS 26 runtime or simulator on the development machine, and no script targets one.

| Target | Command |
|--------|---------|
| **Pick from a list** — every simulator plus the connected iPhone, printed in the terminal on each run | `npm run ios:pick` |
| iOS 27.2 `iPhone 17 Pro Max`, booted for you — the App Store screenshot geometry (1320 × 2868, see [`APP-STORE.md`](./APP-STORE.md)) | `npm run ios:27` |
| Whatever simulator Xcode picks by default, no list | `npm run ios` |

`ios:pick` is the default. In its list the phone carries 🌐 (Wi-Fi) or 🔌 (USB), and a simulator that is already running is shown in bold.

```json
"ios": "expo run:ios",
"ios:pick": "expo run:ios --device",
"ios:27": "./scripts/run-ios-simulator.sh \"iPhone 17 Pro Max\""
```

> [!WARNING]
> **The development build uses the App Store bundle ID** (`dev.borak.splitsnap`). Picking the physical iPhone installs the dev client **over** whatever App Store version is on it. During a dual-client pass (`TEST-PLAN.md`: ESKİ = App Store build on the phone) do not pick the phone. A separate dev bundle ID would let the two coexist; it belongs with the `splitsnap-dev` item in `ROADMAP.md` Sprint #5.

> [!NOTE]
> **Shut-down simulators and `--device`.** Expo builds the list by merging `devicectl`'s devices with `simctl`'s simulators — `devicectl` first, de-duplicated by UDID — and treats every `devicectl` entry as a physical device, installing it through `devicectl`, which only handles a simulator it already sees as connected. On Xcode 26.6 that path was taken for shut-down simulators, and the build succeeded before the install failed with:
>
> ```
> Error: The capability "Install Application" is not supported by this device.
>        (com.apple.dt.CoreDeviceError error 1001)
> ```
>
> Xcode 27's `devicectl` lists only **booted** simulators (checked 2026-09-15), so a shut-down simulator picked in `ios:pick` now arrives through `simctl` and Expo boots it itself. That is read from `@expo/cli`'s source, not yet confirmed by a build: if 1001 comes back, open the simulator first and re-run. `ios:27` boots its target through [`scripts/run-ios-simulator.sh`](../scripts/run-ios-simulator.sh) regardless.
>
> The yellow `Unexpected devicectl JSON version output from devicectl` warning on every `--device` run is cosmetic: Xcode 27 emits `jsonVersion` 5, `@expo/cli` 57 only recognises 2 and 3, and the fields it actually reads are unchanged.

> [!NOTE]
> **If the phone goes back on a beta** (an iOS 28 beta next summer, say), stable Xcode cannot deploy to it. Install Xcode-beta and override the toolchain for that one run rather than switching the global default with `sudo xcode-select -s`: `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer npm run ios:pick`. Simulators keep building on stable Xcode. Alternating compilers is when DerivedData needs clearing (see below).

### Maestro (UI smoke flow)

`npm run test:e2e` runs `.maestro/smoke.yaml` on the booted simulator through [`scripts/test-e2e.sh`](../scripts/test-e2e.sh). One-time setup: `brew install openjdk@21` and `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro` (the formula also pulls a newer `openjdk`; Maestro prints reflection warnings on it, so the script points `JAVA_HOME` at 21). Each run needs the dev build installed, Metro on 8081 (`npm start`) and the local stack; the script resets the local database first, so the flow always starts from `seed.sql`. Pass the seed password as `SMOKE_PASSWORD` — it is not stored in the repo.

The flow clears app state on launch, so on iOS 27 it meets three system screens before the app: the "Open in “SplitSnap”?" prompt for the dev-client deep link, the Expo dev menu's intro sheet and the dev menu itself, and the Save Password sheet after sign-in. `subflows/launch-dev.yaml` and `subflows/login.yaml` dismiss them (the release workflow's standalone build uses `subflows/launch-release.yaml`, selected by `APP_TARGET=release`; `scripts/test-e2e.sh` passes `APP_TARGET=dev`. The flow has no default for it, because a flow-level `env` value overrides `maestro test -e`: a `dev` default once ran the dev-client launch in CI, where the late deep-link prompt covered the release build's login form); if a flow fails at launch, check those first. `hideKeyboard` is unreliable with React Native on iOS, so the flows tap static text or the keyboard's **Done** instead.

### Staging and the release workflow

Staging exists for one consumer: `.github/workflows/release.yml`, which needs a backend while this machine is off. Nobody develops against it and the app never points at it in development. [`scripts/staging-reset.sh`](../scripts/staging-reset.sh) wakes it if the free plan paused it, runs `supabase db reset --remote=<ref> --yes` (every migration plus `seed.sql`, through the pooler; the repo's local link to production is not touched) and replaces the seed's throwaway password with `STAGING_TEST_PASSWORD`. It refuses to run against production's ref or any project not named `splitsnap-staging`. `staging-keepalive.yml` signs in as Deniz and reads one row every Monday so it does not pause (an anonymous read gets a 401 since the grants were tightened, by design). The Maestro job runs on GitHub's `xcode-27` image (preview label): the default macOS images only carry iOS 26 simulators, and the first test run on 2026-11-22 went green there on iOS 26.5, which is not the iOS 27 line the app ships for.

**Why everything here is free, and what would change it:** the repo is public, so GitHub's macOS runners (including `xcode-27`) and the required status checks on `main` cost nothing; on a private repo under a personal account the macOS minutes are billed and branch protection needs GitHub Pro. Expo's Free plan gives 15 iOS builds a month and has no Maestro jobs, which is why GitHub runs Maestro and a release uses two builds. Supabase Free allows two active projects: production and staging.

**Builds are reused when they can be** ([`scripts/reusable-eas-build.sh`](../scripts/reusable-eas-build.sh)), so a full release costs two builds only when the app itself changed:

- **e2e:** the newest finished e2e build is used again when no app file changed since its commit. App files are everything except `docs/`, `design/`, `website/`, `supabase/`, `scripts/`, `.maestro/`, `.github/`, Markdown and unit tests; anything new counts as an app file. A server-only release (migrations, Edge Functions) therefore tests on the previous binary against a freshly reset staging.
- **production:** the newest finished production build is uploaded as it is when no app file changed and it has no `v<version>-build.<n>` tag yet, meaning it never reached App Store Connect (on 2026-11-23 Build 17 was built but its upload failed over an unsigned Apple agreement). Build and upload are separate steps for this reason. A build that was already released is never sent twice: App Store Connect rejects a build number it has seen.
- **Forcing a new build:** run the workflow with "new_builds" on, for example after changing EAS environment variables, which the check cannot see.
- **When only Maestro fails** (or only the upload), re-run just the failed jobs instead of starting a new run: `gh run rerun <run-id> --failed`, or **Re-run failed jobs** on the run page. The successful jobs and the e2e build URL are kept.
- **When the month's builds run out,** build on this Mac instead; local builds do not count. Run the test gate first (`APP-STORE.md`), then `npx eas-cli@latest build --platform ios --profile production --local --output build.ipa` and `npx eas-cli@latest submit --platform ios --profile production --path build.ipa`, and tag the commit as the workflow would (`v<version>-build.<n>`). The Free plan's count resets on the 1st of each month (UTC).

GitHub configuration (Settings → Secrets and variables → Actions):

| Name | Kind | What |
|---|---|---|
| `EXPO_TOKEN` | secret | Expo access token for `eas build` |
| `SUPABASE_ACCESS_TOKEN` | secret | Supabase personal access token (Management API + CLI) |
| `STAGING_DB_PASSWORD` | secret | Staging's database password |
| `STAGING_TEST_PASSWORD` | secret | Password the reset gives Deniz/Mert/Sude on staging (Maestro and the keep-alive sign in with it) |
| `STAGING_PROJECT_REF` | variable | Staging's project ref |
| `STAGING_PUBLISHABLE_KEY` | variable | Staging's publishable key (public; keep-alive only) |

### Two simulators, two accounts (multi-user tests)

Realtime and stale-suggestion checks need two signed-in users at once. Build once, then put the same binary on a second simulator. Every `simctl` call is wrapped in `timeout`, because CoreSimulator can hang (see `AGENTS.md` → Known Gotchas).

```bash
A=AE30C037-520C-4167-A3CF-21F7F3BA2BBC   # iPhone 17 Pro Max (27.2), the ios:27 target
B=70069C4B-6059-459A-8848-612EEA1412E3   # iPhone 17 (27.2)
APP=~/Library/Developer/Xcode/DerivedData/SplitSnap-*/Build/Products/Debug-iphonesimulator/SplitSnap.app

npm run ios:27                                   # builds, installs on A, starts Metro
timeout 120 xcrun simctl bootstatus $B -b
timeout 120 xcrun simctl install $B $APP         # repeat after EVERY rebuild
timeout 45  xcrun simctl launch  $B dev.borak.splitsnap
timeout 30  xcrun simctl openurl $B "exp+splitsnap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

- **The dev client opens on its server picker.** The `openurl` line connects it straight to Metro on 8081, so nothing needs typing.
- **If `expo run:ios` died but the app is installed,** start Metro on its own with `npx expo start --dev-client --port 8081` and use the same `openurl`.
- **Receipt photos for OCR tests:** `timeout 120 xcrun simctl addmedia $A <file.jpg>…` (and again for `$B`). The images land in Photos for "Galeriden Seç". Sample receipt photos are not in the repo; any receipt photo works, or drag one onto the simulator window.
- **Screenshots without the MCP tool:** `timeout 60 xcrun simctl io $A screenshot shot.png && sips -Z 700 shot.png`.
- **Everything hangs:** `killall -9 com.apple.CoreSimulator.CoreSimulatorService`, reboot the simulators with `bootstatus -b`, then restart Metro as above.

The device UDIDs are machine-local. `xcrun simctl list devices available` shows the current ones.

### Supabase CLI: one copy, from Homebrew

The CLI is installed from **Homebrew** (`homebrew/core` formula `supabase`) and called as plain `supabase`. It is updated by the daily `brew update && brew upgrade`. `brew update` alone only refreshes the formula list and installs nothing. Its runtime services do **not** float with the CLI: `supabase link` writes production's service versions into `supabase/.temp/*-version` (gitignored), and `supabase start` runs exactly those (Postgres 17.6.1.084, PostgREST v14.5, Storage v1.84.25, Auth v2.197.0 as of 2026-11-03). The "local" column of `supabase services` shows the CLI's built-in defaults, not what `start` uses. Re-run `supabase link` when production's versions change.

> [!WARNING]
> **Never `npx supabase`.** There is no `supabase` package in `package.json`, so `npx` downloads the latest npm release into its cache and runs **that**, a second CLI next to the Homebrew one. On 2026-11-03 the two were 3.0.0 (npx) and 2.122.0 (brew), and it was the npx copy that rejected `config.toml`. A major CLI release can break `config.toml` (3.0 dropped `[inbucket]` for `[local_smtp]`). If `supabase start` fails right after a `brew upgrade`, read the CLI release notes before anything else.

### How Xcode finds Node

Xcode script phases — Hermes and the React Native dependency scripts — run in a sanitised shell with no nvm on `PATH`, so they read `NODE_BINARY` from `ios/.xcode.env.local`. That file is **generated on every prebuild** by [`plugins/withXcodeEnvNvm.js`](../plugins/withXcodeEnvNvm.js), and it resolves Node through nvm from [`.nvmrc`](../.nvmrc) rather than naming a path. Both halves are deliberate:

- **No hardcoded path.** An absolute path here rots silently. A Homebrew revision bump (`node/26.5.0` → `node/26.5.0_1`) or an `nvm install` moves the binary, and the next build fails with `line 9: .../bin/node: No such file or directory`, followed by a cascade of `Internal inconsistency error: never received target ended message for target ID` lines. Those cascades are noise from the aborted parallel build, not separate faults — fix the Node path and they disappear.
- **Generated, not hand-written.** Because `ios/` is gitignored and rebuilt by prebuild, a file edited by hand would vanish on the next `prebuild --clean` and take the build with it. Generating it also means a fresh clone works on the first `npm run ios`.

The point of the indirection is that `.nvmrc` stays the **only** place the Node version is written down. Local shells (`nvm use`), this iOS build, and EAS Build all read it — EAS resolves Node from the build profile's `node` field first, then `.nvmrc`, then the image default, and `eas.json` deliberately sets no `node` field. `engines.node` in `package.json` plus `engine-strict=true` in `.npmrc` back this up by making `npm install` fail outright, rather than warn, when the active Node falls outside the pin.

### Clearing the build cache

`expo run:ios` does not pass `-derivedDataPath`, so every build lands in one shared cache at `~/Library/Developer/Xcode/DerivedData/SplitSnap-<hash>`. The hash is derived from the workspace path, not from the Xcode version, so builds from different compilers land in the same directory.

Switching between simulator and phone is free, because Xcode separates the outputs by platform (`Build/Products/Debug-iphonesimulator` vs `Debug-iphoneos`). The collisions happen in the shared intermediates and module cache when the **compiler version** changes — after an Xcode upgrade, or when alternating with a beta toolchain: Swift module / bridging-header mismatches, "built with a different version of Swift" errors, or link failures that match no recent code change.

When that happens, clear caches cheapest first:

```bash
# 1. The actual compiler cache — usually the fix (several GB, rebuilt on next run)
rm -rf ~/Library/Developer/Xcode/DerivedData/SplitSnap-*

# 2. Still failing? Regenerate the native project, re-running codegen + pod install
npx expo prebuild --clean --platform ios
```

The same command is the step after any `package-lock.json` change that touches native packages (a Renovate lock-maintenance merge, an Expo patch bump): `npm ci`, then `npx expo prebuild --clean --platform ios`.

Note that `ios/build/` is **not** the compiler cache — it only holds React Native codegen and autolinking output, which is toolchain-independent. Deleting it forces codegen to re-run but won't fix a Swift version mismatch.

With `--platform ios` nothing here touches tracked files — `ios/` is gitignored, so the command is always safe to run. **Leave the flag off and Expo prepares Android too:** it creates `android/` and writes an `android.package` into `app.json`, a tracked-file change this iOS-only project does not want (seen 2026-09-22; undo with `git restore app.json` and `rm -rf android`). It also rewrites `ios/.xcode.env.local` from the config plugin, so the Node setup survives the wipe instead of having to be restored by hand.
