# UI Architecture

> Current-state guidance for `client/src`, reconciled against the 030 design-system audit in September 2026. Read `CONSTITUTION.md` first; it remains the higher-level governance document. This file describes the audited implementation, not a future migration plan. Historical delivery intent is retained in `specs/025-ui-architecture-consolidation/`.

## Current responsibility map

| Area | Current implementation | Current boundary |
| --- | --- | --- |
| Application shell and layout | Mantine AppShell/Drawer, `Layout.module.css`, Tailwind utilities, and limited inline dynamic values | Mantine supplies shell/drawer behavior; CSS Module owns the complex shell; Tailwind is broadly used for presentation and responsive layout. |
| Controls and forms | Mantine controls are used directly across feature pages; AppButton and the AppField family also exist. Native controls and raw buttons remain in some current flows. | Mantine provides accessible behavior. Wrapper adoption is partial, not universal; do not assume every equivalent control must be migrated without a separate architecture decision. |
| Overlays | ResponsiveSheet (10 uses), FormModal, ConfirmDialog, direct Mantine Modal cases, Layout’s navigation Drawer, Mantine Menu, and StudentSearchOverlay | These patterns have distinct current contracts. ResponsiveSheet is established for its responsive task family; it does not replace every form modal or confirmation automatically. |
| Feedback | Custom `Toast` provider/hook is the active transient-feedback path; custom Alert is used for inline app feedback. | `@mantine/notifications` remains installed, but the 030 audit found no direct production imports. Its retention/removal is not decided here. |
| Tables and mobile lists | Shared Table is broadly used; ResponsiveDataView and MobileList have one representative consumer each; several pages implement local card/table pairs. | No universal current mobile data-view abstraction exists. Choose no new direction here; retain a page’s established behavior unless separately authorized. |
| Charts | `@mantine/charts` is used directly by one analytics page; Recharts is its installed peer/runtime. | No chart wrapper exists. |
| Icons | Tabler is the current third-party icon library (16 production files in 030-C). App-specific SVGs, text symbols, images, and screen-specific emoji also exist. | Use the established Tabler library for new third-party icons. Do not introduce Lucide. Emoji are observed screen-specific content, not a general mobile-icon policy. |
| Typography and theme | Public Sans is the primary UI font; DM Mono is the loaded mono face. `index.css` owns light/dark semantic tokens and `App.jsx` contains the Mantine theme mapping. | Geist is installed but had zero direct production imports in the audit. CSS and Mantine palettes are manually kept aligned; no token-architecture change is implied. |

## Overlay architecture and exception

`ResponsiveSheet` is built in `components/ui/ResponsiveSheet.jsx` and is used for responsive task flows. It encapsulates Radix Dialog, Framer Motion, keyboard-inset handling, responsive presentation, and its sheet footer styling contract. Its current footer controls are intentionally raw/context-specific; this is not evidence that all buttons should be raw.

Radix Dialog and Framer Motion remain internal to shared overlay infrastructure. The confirmed exception is `components/ui/StudentSearchOverlay.jsx`: it directly uses both so a nested student-search dialog can manage its own focus and coexist inside a ResponsiveSheet. Do not copy this exception into feature code or “clean it up” without a separately authorized overlay decision.

FormModal and ConfirmDialog are established Mantine-Modal specializations for forms and confirmations. Direct Mantine Modal use, the shell Drawer, and Menus have current feature/shell roles. 030-D browser testing found focus return did not occur in its tested FormModal/ConfirmDialog cases; preserve and test overlay behavior when changing it rather than assuming the documented intended behavior is universally verified.

## Current shared-component adoption

| Pattern | Current state | Important limitation |
| --- | --- | --- |
| AppButton | Exists; one audited consumer. | Direct Mantine Button and raw-button patterns remain common. |
| AppSelect / AppTextInput / AppNumberInput | Exist. AppSelect has useful non-portal behavior for Radix-hosted overlays; text wrapper is thin; number wrapper had no audited consumer. | Direct Mantine and native fields remain common. |
| ResponsiveSheet | Established for its intended responsive task family. | It is not the sole overlay pattern. |
| FormModal / ConfirmDialog | Established, specialized shared patterns. | They do not cover every feature modal or sheet. |
| ResponsiveDataView / MobileList | Implemented with one representative consumer each. | Local page-level mobile/card/table implementations remain common. |
| Table | Broadly established across data tables. | It intentionally does not prescribe every mobile representation. |
| Toast / Alert | Custom Toast is broadly established; Alert is established but not exclusive. | Loading, empty, and error presentation is uneven across the product. |
| PageHeader | `Layout.jsx` exports `centered` (default), `operational`, and `compact`. | Existing pages also retain a small number of specialized headings/heroes. |

## Responsive behavior observed in 030-D

- The shell and dominant list card/table switch use the 768px boundary: mobile chrome below 768px, desktop sidebar at 768px and above. `Layout.jsx` uses Mantine `sm` for this boundary, which maps to 768px in this stack. Browser evidence confirmed the 767px card to 768px table transition on representative routes.
- This is not the only responsive boundary. ResponsiveSheet, StudentSearchOverlay, and Reports use a 639/640-style boundary; FormModal changes around 640/641px. Do not generalize the shell breakpoint to every overlay.
- Mobile bottom navigation is fixed below 768px and current page layout supplies bottom/safe-area space. Treat it as current shell behavior, not an instruction to recreate it in unrelated UI.
- Mobile table behavior is mixed. Some operational pages use cards, shared tables can scroll, and report secondary sheets currently expose clipped tables at 360/390/412px (030-D browser-confirmed). This is a documented current limitation, not a resolved pattern or a redesign directive.

## Current-state guardrails

- Use the existing component or library pattern that matches the surrounding current feature; do not represent limited wrapper adoption as a mandatory migration rule.
- New third-party icon usage follows Tabler. Do not add Lucide or another UI/icon library without the governance process in `CONSTITUTION.md`.
- Keep Radix/Framer imports inside shared overlay infrastructure. The nested StudentSearchOverlay implementation is the only documented current exception.
- Inline style values are currently used for dynamic values and some established component/shell details. Do not launch a broad static-style cleanup from this document; architecture consolidation is reserved for Spec 031.
- Application transient feedback currently uses custom Toast. Do not introduce Mantine Notifications merely because the package is installed.

## Current limitations and deferred decisions

The 030 audit found mixed control, table/mobile-list, loading/empty/error, and overlay adoption. It also found visual and mobile-report limitations. These are current facts, not authorization to standardize, replace Mantine, remove packages, introduce a design system, or restyle screens. Those decisions belong to Spec 031 after the audit closes.
