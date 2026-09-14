# Mobile Patterns

> Current-state guidance for the SIMS DMS PWA, reconciled against the 030 audit in September 2026 and updated after Spec 032 (Milestones 1-7) closed. It records implemented behavior and known limitations; it does not select a future responsive architecture. Read `CONSTITUTION.md` and `docs/UI_ARCHITECTURE.md` first.

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
- ResponsiveSheet is implemented. It provides a responsive task surface with keyboard-inset and safe-area-aware behavior; it is not the only overlay implementation. Its footer actions are AppButton-based (Spec 032 Batch 2.2); do not recreate the old raw footer-style pattern from history.
- FormModal and ConfirmDialog remain current specialized Mantine-modal patterns. StudentSearchOverlay is a documented nested shared-overlay exception, not a feature-page pattern to copy.
- The 030 audit found focus did not return to the trigger in its tested FormModal and ConfirmDialog cases. Spec 032 Batch 1.2 fixed all four scenarios and added Playwright regression coverage for focus-return specifically. Still verify focus/keyboard behavior whenever you touch overlay code — this is a fixed defect, not a guarantee against future regressions.

## Headers and page hierarchy

`Layout.jsx` PageHeader has current `centered` (default), `operational`, and `compact` variants. Existing dashboards and special flows also use specialized headings/heroes. The variants describe current reusable options; they do not require a migration of every heading.

## Tables, cards, and reports

SIMS DMS does not have one universal mobile data representation.

| Current pattern | Where observed | Status |
| --- | --- | --- |
| Mobile cards paired with desktop tables | Several operational list pages | Common, with 030-D confirmation at the 767/768 switch on representative pages. |
| Shared Table / scroll containment | Broad shared-table usage | Established for tables; not every page uses a card alternative. |
| ResponsiveDataView / MobileList | Duty Slots representative use | Implemented, limited adoption. |
| Report tables in secondary sheets | Reports | Resolved (Spec 032 Milestone 3): every report branch now has an explicit card, compact-row, or documented allowed-scroll-table decision — 030-D's clipping finding at 360/390/412px no longer reproduces. |

Do not claim that every table becomes a card below 768px outside Reports' own resolved rule set — Reports followed the decision table above per report family (see `specs/032-ui-system-implementation-migration/032-migration-batch-plan.md`, Milestone 3), it is not a universal automatic conversion. Preserve other pages' current behavior unless separately authorized, and verify any mobile data-view change in the browser.

## Controls and touch targets

Mantine's themed Button floor is intended to support 44px controls, but controls are not universally Mantine-backed. The 030 audit measured visible Reports controls around 37–40px and a 36×16 breadcrumb; Spec 032 Batch 2.3 raised the named controls to the 44px-class minimum. Treat 44px as an accessibility expectation to verify in the actual rendered control on any *other* page — this fix was scoped to the controls 030-D named, not a claim that every control everywhere is now compliant.

Do not rely on hover-only access for touch-critical actions. Preserve labels, keyboard behavior, focus handling, and safe-area behavior when touching existing controls or overlays.

## Loading, empty, error, offline, and status states

Shared state pieces exist (Skeleton family, EmptyState, EmptyRow/ErrorRow/ErrorBlock, Toast, Alert, OfflineBanner), and adoption grew substantially in Spec 032 Batch 4.2 (26 literal "Loading…" occurrences reduced, EmptyState extended beyond its single 030 consumer) and Batch 4.1 (OfflineBanner rebuilt on Alert + AppButton, connectivity/dismissal lifecycle preserved) — but adoption is still not universal. `ReportsPage.jsx`'s generic `ReportSection` loading branch remains plain text by design (its ~15 report shapes would each need a distinct skeleton), deferred past every Spec 032 milestone as out of each one's named scope.

Document and preserve the state behavior a page already has. Do not state that every screen already uses a standardized skeleton/empty/error/retry system, and do not use this document to mandate one.

## Test viewports

The audit used 360, 390, 412, 768, 1024 and desktop viewports, with light/dark evidence where available. For responsive changes, test the applicable boundary and the task's actual content; shell, overlays, and reports do not all switch at the same width.

## E2E test database

Playwright specs (`e2e/`) need a disposable, local, test-owned Postgres — never a shared/staging/production one. See `e2e/README.md` for the safety requirement, the deterministic automatic reset (`e2e/global-setup.mjs` + `e2e/seed.mjs`, added Spec 032 Milestone 7), and the container-recreation fallback for schema drift.
