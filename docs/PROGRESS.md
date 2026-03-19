# Progress Log

Detailed development tracking for SplitSnap. This is the living document for recording what was done, decisions made, blockers encountered, and anything noteworthy during each week.

`ROADMAP.md` stays frozen and only gets `[x]` marks. All detailed notes go here.

---

## Week 1 — Project Setup & Foundation

**Status:** Not started

**Completed:**
- (none yet)

**Decisions:**
- **Expo SDK 55** chosen over bare React Native CLI. Expo is now the official recommendation for new RN projects. Provides faster setup, EAS Build, and managed native modules.
- **Expo Router** for navigation (file-based routing in `app/` directory). Replaces manual React Navigation stack configuration.
- **@supabase/supabase-js** for all backend operations (Auth, PostgreSQL, Storage).
- **expo-secure-store** for storing Supabase auth tokens securely (iOS Keychain). AsyncStorage is deprecated and insecure for tokens.
- **Zustand** for client-side state management. Lightweight (~1KB), no providers needed.
- **react-native-mmkv** for local data persistence. 10-30x faster than AsyncStorage, synchronous reads, used as Zustand persist backend.
- **expo-doc-vision** for on-device OCR (iOS Vision framework). Will be integrated in Week 8.
- **expo-image-picker** for receipt photo capture/selection.
- **Expo Go will NOT work** for this project — MMKV and expo-doc-vision require native modules. Development must use dev client (`npx expo run:ios`).

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 2 — Authentication & Theme

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 3 — Database & Group Structure

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 4 — Group Detail & Expense Foundation

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 5 — Expense Management

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 6 — Splitting & Calculation

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 7 — Local Storage & Improvements

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 8 — Receipt & OCR Infrastructure

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 9 — OCR Integration & UI

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)

---

## Week 10 — Final Polish & Submission

**Status:** Not started

**Completed:**
- (none yet)

**Notes:**
- (none yet)

**Blockers:**
- (none)
