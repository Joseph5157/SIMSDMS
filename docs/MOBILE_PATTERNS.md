# Mobile Patterns

> Current-state guidance for the SIMS DMS PWA, reconciled against the 030 audit in September 2026. It records implemented behavior and known limitations; it does not select a future responsive architecture. Read `CONSTITUTION.md` and `docs/UI_ARCHITECTURE.md` first.

## Breakpoints and shell

| Boundary | Current behavior | Evidence / qualifier |
| --- | --- | --- |
| Below 768px | Mobile shell: hamburger, fixed bottom navigation, collapsed sidebar. | `Layout.jsx` uses Mantine `sm`; 030-D rendered checks confirmed representative 767px mobile layouts. |
| 768px and above | Desktop sidebar and dominant page table layout. | 030-D confirmed card-to-table changes on representative routes at 767/768px without root horizontal overflow. |
| 639/640px | ResponsiveSheet, StudentSearchOverlay, and Reports have a distinct overlay/report boundary. | This is separate from the shell boundary. |
| 640/641px | FormModal changes from full-height mobile presentation to centered desktop modal. | Do not assume FormModal follows the 768px shell cutover. |

Mantine `sm` is 48em/768px in this stack; the AppShell navbar and mobile Drawer intentionally use that boundary. Do not change it to Mantine `md` based on Tailwind naming alone.

## Navigation, safe area, and overlays

- The current mobile bottom bar is fixed below 768px. Current layout provides bottom/safe-area space so final content is not covered in the 030-D routes tested.
- ResponsiveSheet is implemented. It provides a responsive task surface with keyboard-inset and safe-area-aware behavior; it is not the only overlay implementation.
- FormModal and ConfirmDialog remain current specialized Mantine-modal patterns. StudentSearchOverlay is a documented nested shared-overlay exception, not a feature-page pattern to copy.
- 030-D browser checks found that focus did not return to the trigger in its tested FormModal and ConfirmDialog cases. This is a current verification limitation/issue, not evidence that all overlays fail or a request to change behavior in this phase.

## Headers and page hierarchy

`Layout.jsx` PageHeader has current `centered` (default), `operational`, and `compact` variants. Existing dashboards and special flows also use specialized headings/heroes. The variants describe current reusable options; they do not require a migration of every heading.

## Tables, cards, and reports

SIMS DMS does not have one universal mobile data representation.

| Current pattern | Where observed | Status |
| --- | --- | --- |
| Mobile cards paired with desktop tables | Several operational list pages | Common, with 030-D confirmation at the 767/768 switch on representative pages. |
| Shared Table / scroll containment | Broad shared-table usage | Established for tables; not every page uses a card alternative. |
| ResponsiveDataView / MobileList | Duty Slots representative use | Implemented, limited adoption. |
| Report tables in secondary sheets | Reports | Current limitation: 030-D confirmed clipping at 360/390/412px. No replacement is selected here. |

Do not claim that every table becomes a card below 768px. Preserve the current page behavior unless separately authorized, and verify any mobile data-view change in the browser.

## Controls and touch targets

Mantine’s themed Button floor is intended to support 44px controls, but controls are not universally Mantine-backed. 030-D measured visible Reports controls around 37–40px and a 36×16 breadcrumb; hidden duplicate shell controls affected the broad heuristic. Treat 44px as an accessibility expectation to verify in the actual rendered control, not a claim that every current target is compliant.

Do not rely on hover-only access for touch-critical actions. Preserve labels, keyboard behavior, focus handling, and safe-area behavior when touching existing controls or overlays.

## Loading, empty, error, offline, and status states

Shared state pieces exist (Skeleton family, EmptyState, EmptyRow/ErrorRow/ErrorBlock, Toast, Alert, OfflineBanner), but adoption is not universal. 030-C/E found literal loading text and local state treatments alongside shared components. 030-D verified the offline presentation but did not obtain valid forced empty/error screenshots for every family.

Document and preserve the state behavior a page already has. Do not state that every screen already uses a standardized skeleton/empty/error/retry system, and do not use this document to mandate one.

## Test viewports

The audit used 360, 390, 412, 768, 1024 and desktop viewports, with light/dark evidence where available. For responsive changes, test the applicable boundary and the task’s actual content; shell, overlays, and reports do not all switch at the same width.
