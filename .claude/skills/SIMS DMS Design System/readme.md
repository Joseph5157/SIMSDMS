# SIMS DMS Design Guidance — Current Production Reference

> Reconciled against the September 2026 030 design-system audit. This is a current-state reference, not a proposal for Design System V2. `CONSTITUTION.md`, `CLAUDE.md`, `docs/UI_ARCHITECTURE.md`, and `docs/MOBILE_PATTERNS.md` remain the governing production instructions.

## Product and authentication

SIMS DMS is the SIMS College of Pharmacy operational discipline-management PWA. It supports faculty duty scheduling and attendance, student-violation work, reporting, messaging, and administration.

Current application authentication is **email and password** with an httpOnly-cookie session and CSRF protection. Telegram is a notification channel; it is not an OTP login mechanism. Do not create or copy Telegram OTP screens, OTP instructions, numeric-code fields, or an OTP login state into production work.

## Current visual implementation

- **Type:** Public Sans is the global UI sans face. DM Mono is the loaded mono face. Geist is installed but had zero direct production imports in the audited baseline; DM Sans is not the production UI font.
- **Colour and theme:** `client/src/index.css` defines the current light/dark semantic-token system. The product’s base is slate/navy surfaces and text, blue primary actions, and semantic emerald/amber/red status treatments. `App.jsx` maintains a Mantine theme mapping alongside CSS tokens.
- **Shape and elevation:** the current token set supplies several radii and elevations. Screens also contain page-specific surface combinations; do not infer a new universal radius/shadow policy from this guide.
- **Gradients and accents:** blue/indigo brand gradients are current token values and appear beyond login, including sheets/actions and dashboard surfaces. Multi-accent stat/report/dashboard treatments are current rendered patterns. Their future visual policy is unresolved; do not expand, remove, or normalize them in documentation or code from this skill.
- **Icons:** Tabler is the current third-party icon source. The product also has isolated app SVG/image assets, text symbols, and screen-specific emoji. Do not introduce Lucide, a Lucide CDN, or a fixed emoji icon system.
- **Branding:** the application shell currently renders the SIMS logo image (`client/src/assets/sims-logo.png`) with `APP_SHORT_NAME`; do not replace it with an emoji gradient tile.

## Current component and responsive reality

Mantine supplies broad accessible behavior and is used directly as well as through some app primitives. Tailwind, a shell CSS Module, and existing inline values coexist. Current app primitives include ResponsiveSheet, FormModal, ConfirmDialog, AppButton, AppField wrappers, Table, ResponsiveDataView, MobileList, Toast, Alert, and PageHeader.

This does **not** mean every pattern is uniformly adopted:

- AppButton has limited adoption; direct Mantine and raw buttons remain common.
- AppSelect adds overlay-safe non-portal behavior, while direct Mantine and native fields also remain common.
- ResponsiveDataView and MobileList have representative/limited adoption; page-local mobile card/table pairs remain common.
- Toast is the active transient-feedback provider. Mantine Notifications is installed but had zero direct production imports in the audit.
- `Layout.jsx` PageHeader currently has `centered`, `operational`, and `compact` variants; special dashboard/flow headings still exist.

The shell switches at 768px: mobile hamburger and fixed bottom navigation below it, desktop sidebar at and above it. This is not a universal breakpoint: shared sheets, StudentSearchOverlay, and Reports have a 639/640-style boundary; FormModal changes around 640/641px. 030-D confirmed that Reports secondary-sheet tables clip on 360/390/412px mobile viewports. That is a current limitation, not a solved design rule.

## Overlay and accessibility facts

ResponsiveSheet is implemented for responsive task flows. FormModal and ConfirmDialog remain established specialized overlay patterns; current direct Mantine modal/menu/drawer uses also exist. Radix Dialog and Framer Motion are internal shared-overlay infrastructure. `StudentSearchOverlay` is the documented exception because its nested dialog manages its own focus inside a ResponsiveSheet; do not copy that implementation into feature pages.

Preserve accessible labels, keyboard behavior, safe-area handling, and focus behavior when changing current UI. The 030-D browser audit found no focus return in its tested FormModal and ConfirmDialog cases, so behavior should be verified rather than presumed consistent.

## Historical prototype assets

The following are retained as historical prototype artifacts from an earlier design exploration:

- `styles.css`, `tokens/`, `guidelines/`, `components/`, `_ds_bundle.js`
- `ui_kits/faculty-pwa/` and any related kit assets
- component `.prompt.md` files

They contain an older DM Sans/Lucide/Telegram-OTP prototype language and standalone components. They are not production-current design guidance, must not be imported into `client/src`, and must not be used as the source for new production architecture. They may be kept as historical visual artifacts without erasing that history.
