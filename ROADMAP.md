# SplitSnap Post-Release Roadmap & Backlog

This document tracks the active backlog, future enhancements, and recent updates for SplitSnap.

## Active Status
- **Current Version:** `v1.1.0` (Build 12 in App Store / TestFlight)
- **Framework:** Expo SDK 57 (React Native 0.86.0) + React 19 + TypeScript
- **Backend:** Supabase (Auth, DB, Edge Functions, Storage)

---

## Future Enhancements & Backlog

### 🚀 Core Features & Logic

- [ ] **[High] Onboarding & Verification Flow Upgrade:**
  - **Description:** Re-enable email confirmation in Supabase and handle the unconfirmed session UX state gracefully. Display a modern email verification waiting screen, followed by a profile customization wizard (avatar picker, display name, currency preferences).
- [ ] **[High] Input Validation:**
  - **Description:** Implement strict client-side validation for email formats, password strength, and maximum expense amounts.
- [ ] **[Medium] Localization (en / tr):**
  - **Description:** Add English/Turkish multi-language support based on device locale or user preference.
- [ ] **[Medium] Hardened Auth Storage:**
  - **Description:** Secure Supabase session data inside `expo-secure-store` instead of standard `AsyncStorage`.
- [ ] **[Medium] Auth Rate Limiting UX:**
  - **Description:** Add client-side visual feedback and temporary cooldowns for multiple failed login attempts.
- [ ] **[Medium] Itemized Receipt Splitting (Item-by-Item Allocation):**
  - **Description:** Allow users to split scanned receipt items individually (assigning specific line items to specific members) rather than only splitting the total invoice amount. Requires DB support for line items and a modular selection flow.
- [ ] **[Medium] Flexible Multi-Currency Support (Çoklu Para Birimi):**
  - **Description:** Allow transactions in multiple currencies (EUR, USD, etc.) with flexible conversion rules. Users should be able to convert at historical rates (transaction date), current live rates, or keep balances in original currencies without converting.
- [ ] **[Low] Easy Debt Settlement & QR/IBAN Integration (Kolay Borç Ödeme):**
  - **Description:** Frictionless settlement options by letting creditors easily share their IBAN, generating dynamic payment QR codes (FAST compatible), or linking out to payment options.
- [ ] **[Low] Bank/Card Transaction Auto-Import (Banka/Kart Entegrasyonu):**
  - **Description:** Explore card transaction imports via SMS notification parsing or Open Banking APIs to automatically suggest draft expenses to groups.

### 🎨 UI/UX Polish & Modernization

- [ ] **[High] Theme & Colors Modernization (AMOLED Dark & iOS Light):**
  - **Description:** Restructure tokens in `tokens.ts` to implement true black backgrounds `#000000` with dark card overlays for energy efficiency, and iOS-style layered light mode backgrounds `#f2f2f7` with pure white cards for depth.
- [ ] **[Medium] Floating Navigation Tab Bar:**
  - **Description:** Redesign the bottom tab navigation to float above the screen content with a blurred glass background and rounded corners, matching the floating tab bar style of modern iOS applications.
- [ ] **[Medium] Card Stack UI for Payer/Split Selection:**
  - **Description:** Fine-tune swipe animations and gestures for the new custom BottomSheets, ensuring ultra-smooth card-stack style sliding interactions.
- [ ] **[Low] Liquid Glass Progressive Enhancement (iOS 26+ Compatibility):**
  - **Description:** Implement dynamic visual refraction and blur transitions using `expo-glass-effect` for native compatibility with the iOS 26 Liquid Glass design language, falling back to static premium glassmorphism on older iOS versions.
- [ ] **[Low] `global.css` Cleanup:**
  - **Description:** Remove the unused `global.css` import in `src/constants/theme.ts` to clean up iOS-only boilerplate.

### 🐛 Bugs & Performance

- [ ] **[High] Laggy Group Action Animations:**
  - **Description:** Debug modal transitions for "Join Group" and "Create Group" actions which feel sluggish (~30fps) on physical iOS devices.
- [ ] **[High] Smart Invite Code Input Parsing:**
  - **Description:** Extract only the actual join code/hash when a user pastes a full message (e.g. copied from WhatsApp) containing the code or universal link.
- [ ] **[Medium] Receipt Photo Viewer on Detail View:**
  - **Description:** View the uploaded receipt image directly on already created expense detail screens (currently inaccessible after creation).
- [ ] **[Medium] Receipt Replace/Reset Bug:**
  - **Description:** Fix state and UI glitches when removing an uploaded receipt photo and replacing it with a new one in the expense form.
- [ ] **[Low] Receipt Validation Warning:**
  - **Description:** Display a warning dialog or status text if the uploaded image does not appear to contain a receipt or if OCR returns empty data.

---

## Recent Updates

### 📅 July 2026 — Sprint #2: Split Payer & Premium UI Upgrade
- **Split Payer Support:** Implemented multiple payers support in both add and edit screens with real-time balance calculations.
- **Premium BottomSheet UI:** Refactored bottom sheets with gesture handlers, spring physics, and linear backdrop opacity interpolation.
- **Form Visual Enhancements:** Integrated `AvatarStack` for overlapping avatar circles, native segmented control tabs, and card-based nested amount inputs (`MemberAmountCard`) with focus outlines.
- **Performance Refactoring:** Extracted custom helpers (`formatShortName`) and reused components to prevent code repetition.

### 📅 July 2026 — Sprint #1: Expo SDK 57 & Tamagui Upgrade
- **Expo SDK 57 Upgrade:** Upgraded to SDK 57 (React Native 0.86, React 19.2.3) for improved stability.
- **Tamagui Duplicate Context Fix:** Aligned all Tamagui packages to `2.5.1` using `overrides` in `package.json`. This fixed duplicate context resolution crashes within Sheet portals.
- **Realtime Connection Fix:** Resolved race conditions and memory leaks on Fast Refresh in `groups-sync.ts` by making channel teardown asynchronous and cleaning up dangling channels via `supabase.getChannels()`.

---

### 📚 Archived Pre-Release History
For the pre-release project roadmap and development progress leading up to the initial App Store release (`v1.0.0`), refer to:
*   [docs/school/ROADMAP.md](file:///Users/bora/Projeler/splitsnap/docs/school/ROADMAP.md) — The initial pre-release project roadmap.
*   [docs/school/PROGRESS.md](file:///Users/bora/Projeler/splitsnap/docs/school/PROGRESS.md) — The pre-release development progress logs.
