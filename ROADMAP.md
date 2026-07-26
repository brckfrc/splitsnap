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
  - **Description:** Re-enable email confirmation in Supabase and handle the unconfirmed session UX state gracefully. Display a modern email verification waiting screen, followed by a profile customization wizard (avatar picker, display name, currency preferences, and UI theme selection). The avatar picker UI/logic must be shared and editable from the Profile/Kişisel Bilgiler screen as well.
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
- **Floating Island Navigation:** Replaced the default bottom tab bar with a custom floating capsule (Dynamic Island style), mounted per top-level screen (Gruplarım, Profil) with route transitions disabled (`animation: 'none'`) so it renders instantly and stays absent on pushed deep screens. The active pill can be dragged across the icons to switch tabs.
- **Prominent Center Add Button:** The center `+` action now renders as a filled circular button using theme `primary`/`primaryForeground` colors, making it visually distinct from the flat Home/Settings icons while adapting automatically to light and dark themes.
- **Quick-Add Expense Group Picker:** Tapping the center `+` opens a "Grup Seç" bottom sheet (reusing the shared `BottomSheet`) with rich rows (initials avatar, member count, group total), sorted by most-recent activity, showing the top 5 groups with a "Tüm gruplar" expander. Single-group users skip straight to the expense form; users with no groups get a toast.
- **Haptic UI Enhancements:** Integrated `expo-haptics` for premium tactile feedback when swiping the active pill across the navigation icons.
- **UI Scaling & Polish:** Converted the tab bar into a compact pill shape matching modern iOS trends, and scaled up the active pill (68x52) and icons (28px) for a robust, satisfying visual balance.
- **Dedicated Delete Account Flow:** Moved account deletion out of an inline alert into a two-step screen (warning + consequences, then password re-authentication) accessible from the Profile → Edit Profile "Danger Zone".
- **Bug Fixes:** Fixed a runtime crash when drag-releasing the pill onto the center `+` (a JS helper was being called synchronously inside a Reanimated worklet); pill positions are now precomputed. Added `activeOffsetY`/`failOffsetY` to `BottomSheet` so inner scroll views coexist with drag-to-dismiss.
- **Split Payer Support:** Implemented multiple payers support in both add and edit screens with real-time balance calculations.
- **Premium BottomSheet UI:** Refactored bottom sheets with gesture handlers, spring physics, and linear backdrop opacity interpolation.
- **Form Visual Enhancements:** Integrated `AvatarStack` for overlapping avatar circles, native segmented control tabs, and card-based nested amount inputs (`MemberAmountCard`) with focus outlines.
- **Performance Refactoring:** Extracted custom helpers (`formatShortName`) and reused components to prevent code repetition.
- **Profile Theme Selection UX:** Streamlined theme selection options and added dynamic OS-resolved theme feedback (e.g. "Sistem (Koyu)") on the Profile screen.
- **Theme & Colors Modernization:** Implemented AMOLED True Black background (#000000) with elevated dark gray cards (#121214) to prevent black smearing, and transitioned Light Mode to an iOS-style layered canvas (#f2f2f7) with pure white cards.

### 📅 July 2026 — Sprint #1: Expo SDK 57 & Tamagui Upgrade
- **Expo SDK 57 Upgrade:** Upgraded to SDK 57 (React Native 0.86, React 19.2.3) for improved stability.
- **Tamagui Duplicate Context Fix:** Aligned all Tamagui packages to `2.5.1` using `overrides` in `package.json`. This fixed duplicate context resolution crashes within Sheet portals.
- **Realtime Connection Fix:** Resolved race conditions and memory leaks on Fast Refresh in `groups-sync.ts` by making channel teardown asynchronous and cleaning up dangling channels via `supabase.getChannels()`.

---

### 📚 Archived Pre-Release History
For the pre-release project roadmap and development progress leading up to the initial App Store release (`v1.0.0`), refer to:
*   [docs/school/ROADMAP.md](file:///Users/bora/Projeler/splitsnap/docs/school/ROADMAP.md) — The initial pre-release project roadmap.
*   [docs/school/PROGRESS.md](file:///Users/bora/Projeler/splitsnap/docs/school/PROGRESS.md) — The pre-release development progress logs.
