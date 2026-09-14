---
name: sims-dms-design
description: Current-state production guidance for SIMS DMS UI work, reconciled against the September 2026 030 audit. It describes the existing implementation; it does not define a future design system.
user-invocable: true
---

Read `CONSTITUTION.md`, `CLAUDE.md`, `docs/UI_ARCHITECTURE.md`, and `docs/MOBILE_PATTERNS.md` before production UI work. Those documents govern code changes; this skill summarizes current visual and component facts.

## Current production facts

- **Product and auth:** SIMS DMS is an operational college discipline-management PWA. Current sign-in is email and password; do not create Telegram OTP screens, OTP copy, or six-box OTP controls. Telegram is used for notifications, not login.
- **Typography:** Public Sans is the primary UI font. DM Mono is the loaded monospace face for the current mono treatments. Do not introduce DM Sans or Geist as production UI fonts.
- **Icons:** Tabler (`@tabler/icons-react`) is the established third-party icon library. Do not import Lucide or load an icon CDN. Emoji, text symbols, image assets, and a small number of app-specific SVGs exist in current screens, but emoji are not a general mobile-navigation policy.
- **Shell and responsive behavior:** the app has a Mantine AppShell/Drawer with a desktop sidebar at 768px and a mobile hamburger plus fixed bottom navigation below 768px. Overlay/report boundaries are not universal: shared sheets/reports use a 639/640-style boundary and FormModal changes around 640/641px.
- **Theme and visual language:** `index.css` supplies light/dark semantic tokens, Public Sans, DM Mono, radii, shadows, and blue/indigo brand gradients. The rendered product has a slate/navy operational base with blue actions and semantic status accents. Dashboard/report gradients, colored cards, pills, and emoji are existing screen-specific patterns; this skill does not endorse expanding, removing, or redesigning them.
- **Components:** Mantine is broadly used directly for accessible controls and overlay behavior. AppButton, AppSelect/AppTextInput/AppNumberInput, ResponsiveSheet, FormModal, ConfirmDialog, Table, ResponsiveDataView, MobileList, Toast, Alert, and PageHeader are existing application primitives, but adoption is mixed. Do not assume wrappers are universal or start a migration.
- **Overlays:** ResponsiveSheet is implemented for responsive task flows. FormModal and ConfirmDialog remain established specialized patterns. Radix Dialog/Framer Motion are internal shared-overlay infrastructure; `StudentSearchOverlay` is the documented nested-overlay exception and must not be copied into feature pages.
- **Feedback:** custom Toast is the current transient-feedback path; custom Alert is current inline feedback. `@mantine/notifications` is installed but had no direct production imports in the 030 audit.
- **Mobile data views:** some pages use cards, shared tables can scroll, and ResponsiveDataView/MobileList have limited adoption. Reports’ secondary-sheet tables clip at 360/390/412px in 030-D evidence; do not claim this is solved or select a replacement here.

## Production safety

- Match the established pattern in the feature you are changing and verify actual browser behavior at the relevant boundary.
- Preserve existing focus, keyboard, safe-area, and overlay behavior. Tested FormModal/ConfirmDialog focus-return behavior has known gaps; do not assume uniform behavior.
- Do not add a UI/icon library, Design System V2, 21st.dev guidance, or a new component architecture. Those are future owner decisions.
- For production work, the legacy assets and UI kits in this skill are **historical prototype artifacts, not production component sources**. Do not copy their DM Sans, Lucide, Telegram-OTP, generic mobile-card, or old visual rules into `client/src`.

## Artifact map

- `readme.md` — current implementation summary and historical-artifact boundary.
- `styles.css`, `tokens/`, `components/`, and `ui_kits/` — historical prototype assets. They may be inspected as historical design evidence only, not imported or copied into production.
