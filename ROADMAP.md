# SplitSnap Post-Release Roadmap & Backlog

This document tracks the active backlog, future enhancements, and recent updates for SplitSnap.

## Active Status
- **Current Version:** `v1.0.0` (Build 9 in App Store / TestFlight)
- **Framework:** Expo SDK 57 (React Native 0.86.0) + React 19 + TypeScript
- **Backend:** Supabase (Auth, DB, Edge Functions, Storage)

---

## Recent Updates

### 📅 July 2026 — Expo SDK 57 & Tamagui Upgrade
- **Expo SDK 57 Upgrade:** Upgraded to SDK 57 (React Native 0.86, React 19.2.3) for improved stability.
- **Tamagui Duplicate Context Fix:** Aligned all Tamagui packages to `2.5.1` using `overrides` in `package.json`. This fixed duplicate context resolution crashes within Sheet portals.
- **Realtime Connection Fix:** Resolved race conditions and memory leaks on Fast Refresh in `groups-sync.ts` by making channel teardown asynchronous and cleaning up dangling channels via `supabase.getChannels()`.

---

## Future Enhancements & Backlog

### 🔴 High Priority

- [x] **Split Payer Support:**
  - **Description:** Allow multiple users to pay for a single expense (currently limited to a single payer `paidBy`).
  - **Impact:** Requires DB schema modifications and updates to `calculateBalances` algorithm.
- [ ] **Input Validation:**
  - **Description:** Implement strict client-side validation for email formats, password strength, and maximum expense amounts.

### 🎨 UI Modernization & Liquid Glass Evolution

- [ ] **Card Stack UI for Payer/Split Selection:**
  - **Description:** Replace long vertical selection forms in `add-expense.tsx` and `edit.tsx` with a gesture-based card stack inside a BottomSheet, allowing users to swipe cards up to participate and enter custom split amounts.
- [ ] **Liquid Glass Progressive Enhancement (iOS 26+ Compatibility):**
  - **Description:** Implement dynamic visual refraction and blur transitions using `expo-glass-effect` for native compatibility with the iOS 26 Liquid Glass design language, falling back to static premium glassmorphism on older iOS versions.
- [ ] **Floating Navigation Tab Bar:**
  - **Description:** Redesign the bottom tab navigation to float above the screen content with a blurred glass background and rounded corners, matching the floating tab bar style of modern iOS applications, instead of sticking to the bottom screen bezel.

### 🟡 Medium Priority

- [ ] **Localization (en / tr):**
  - **Description:** Add English/Turkish multi-language support based on device locale or user preference.
- [ ] **Hardened Auth Storage:**
  - **Description:** Secure Supabase session data inside `expo-secure-store` instead of standard `AsyncStorage`.
- [ ] **Auth Rate Limiting UX:**
  - **Description:** Add client-side visual feedback and temporary cooldowns for multiple failed login attempts.

### 🟢 Low Priority & Polish

- [ ] **`global.css` Cleanup:**
  - **Description:** Remove the unused `global.css` import in `src/constants/theme.ts` to clean up iOS-only boilerplate.

---

## 🐛 Known Issues & Bug Backlog

- [ ] **Laggy Group Action Animations:** "Join Group" and "Create Group" modal animations feel like ~30fps or slow on physical iOS devices.
- [ ] **Smart Invite Code Input Parsing:** Extract only the actual join code/hash when a user pastes a full message (e.g. copied from WhatsApp) containing the code or universal link.
- [ ] **Re-enable Email Verification:** Turn email confirmation back on in Supabase and handle the unconfirmed session UX state gracefully in the app.
- [ ] **Receipt Validation Warning:** Display a warning dialog or status text if the uploaded image does not appear to contain a receipt or if OCR returns empty data.
- [ ] **Receipt Photo Viewer on Detail View:** View the uploaded receipt image directly on already created expense detail screens (currently inaccessible after creation).
- [ ] **Receipt Replace/Reset Bug:** Fix state and UI glitches when removing an uploaded receipt photo and replacing it with a new one in the expense form.

