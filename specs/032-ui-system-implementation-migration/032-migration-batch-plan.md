# Spec 032 — Migration Batch Plan

Status: **CLOSED — every batch below (1.1 through 7.2, plus Milestone 7's expanded final-stabilization
scope) has been executed, verified, and owner-approved (2026-09-14).** See
`specs/032-ui-system-implementation-migration/handoff.md` for the closure report. Retained as the
historical execution record; each batch's "Objective" text below still accurately describes what
was shipped except where a batch's own execution surfaced a correction (e.g. Batch 6.2's "Super
Admin" → "Faculty" attribution, noted inline). Each batch was written to be independently
reviewable, independently shippable, and independently rollback-able. "Exact files/areas expected"
names the known area; where the precise element/line was not yet diagnosed, execution began with
locating it (e.g., via console stack trace or source search) before changing anything.

---

## Milestone 1 — Confirmed browser defects

### Batch 1.1 — Admin Dashboard invalid HTML nesting fix

- **Objective**: Eliminate the `<p>` containing `<div>` structural error and its matching
  descendant/hydration warning on `/admin/dashboard` (030-D-01 / DS-07 — 32 console errors).
- **Files/areas**: `client/src/pages/admin/AdminDashboardPage.jsx` and any shared card/text component
  it composes (e.g. a `Text component="p"` wrapper around block content). Locate the exact element via
  the console stack trace at execution time.
- **Dependency on previous batch**: None. First batch in the plan.
- **User-visible change**: None intended — markup-only correction.
- **Regression risks**: Minimal; swapping an inline/block element tag can shift default spacing —
  verify no visual shift.
- **Accessibility considerations**: Confirms valid semantic structure; verify no duplicated
  announcement for assistive tech after the fix.
- **Mobile verification**: `/admin/dashboard` at 390 and 1440, light and dark.
- **Dark-mode verification**: Yes, both themes, both viewport classes.
- **Tests required**: None new; existing suite must stay green.
- **Playwright scenarios required**: Load `/admin/dashboard`, assert zero console errors matching the
  nested-block-in-inline pattern.
- **Rollback boundary**: Single file, single element change; trivial revert.
- **Completion criteria**: 0 of the 32 console errors reproduce on a fresh load; screenshot parity
  confirmed at both viewport classes and themes.
- **Release risk**: **LOW** — isolated markup correction, no behavior/data/dependency change.

### Batch 1.2 — FormModal + ConfirmDialog focus-return fix

- **Objective**: Implement V2 §5's overlay accessibility requirement — return focus to the invoking
  control on close. Fixes the four `focusReturned: false` scenarios (030-D-02 / DS-05): FormModal at
  639/640/641, ConfirmDialog at 390.
- **Files/areas**: `client/src/components/ui/FormModal.jsx`, `client/src/components/ui/ConfirmDialog.jsx`.
- **Dependency on previous batch**: None; independent of 1.1.
- **User-visible change**: Keyboard users regain focus on the trigger control after Escape, backdrop
  close, cancel, or submit-success close.
- **Regression risks**: Shared-component change reaches 8 FormModal and 12 ConfirmDialog consumers
  indirectly; a wrong trigger reference could send focus somewhere unexpected instead of nowhere.
- **Accessibility considerations**: This batch *is* the accessibility fix. Verify focus lands on the
  correct, visible trigger — not `document.body` — across all four scenarios and a spot sample of other
  consumers.
- **Mobile verification**: FormModal at 639/640/641 (its established modal boundary); ConfirmDialog at
  390.
- **Dark-mode verification**: Focus ring visibility in dark theme after return.
- **Tests required**: Testing-Library test opening/closing each component and asserting
  `document.activeElement` equals the original trigger.
- **Playwright scenarios required**: Reproduce all four 030-D-02 scenarios; assert `focusReturned: true`
  for each.
- **Rollback boundary**: Two shared component files; no consumer files touched.
- **Completion criteria**: All four previously-failing scenarios now pass; no new console errors; a
  spot check of 2–3 other FormModal/ConfirmDialog consumers shows unchanged structure.
- **Release risk**: **MEDIUM** — shared overlay behavior change with broad indirect reach, though the
  edit itself is localized and the acceptance criterion is explicit and testable (V2 calls this out by
  name as needing verified acceptance).

### Batch 1.3 — Reports mobile table clipping: interim correctness fix

- **Objective**: Stop the 030-D-03 clipping defect (table wider than sheet; `overflowX: visible`;
  edges exceeding viewport by 5–10px at 640) as an immediate correctness patch. Make the secondary
  report table inside `ResponsiveSheet` genuinely, visibly scrollable. This is **not** the card/
  compact-row redesign — that is Milestone 3. This batch only ensures no content is invisible/
  ambiguous.
- **Files/areas**: `client/src/pages/admin/ReportsPage.jsx` (secondary-report table branches) and the
  shared `Table` component's scroll-container wrapper in `client/src/components/ui/`, scoped narrowly
  so desktop/other-table behavior is unaffected.
- **Dependency on previous batch**: None.
- **User-visible change**: Narrow-viewport report sheets no longer visually cut off columns; users can
  horizontally scroll to see all data instead of it being clipped/hidden.
- **Regression risks**: If the overflow fix is made in the shared `Table` component rather than scoped
  to Reports, it could alter the other 26 Table usages' desktop scroll behavior — must be scoped or
  guarded.
- **Accessibility considerations**: Scroll container must be keyboard-scrollable and have a discoverable
  scroll affordance, not merely non-clipped-but-hidden overflow.
- **Mobile verification**: 360, 390, 639, 640 on the Reports secondary sheet.
- **Dark-mode verification**: Scroll edge/shadow affordance in dark theme.
- **Tests required**: None new beyond Playwright.
- **Playwright scenarios required**: Reproduce 030-D-03's viewport/table-width capture; assert the
  table container is scrollable and no column edge exceeds the viewport without a scroll affordance.
- **Rollback boundary**: CSS/markup change scoped to the Reports table container; single revert.
- **Completion criteria**: 030-D-03 no longer reproduces as "clipped" at 360/390/639/640; all columns
  reachable via visible scroll. (Superseded, not contradicted, by Batch 3.1/3.2's card redesign.)
- **Release risk**: **MEDIUM** — touches the most structurally complex page in the app even though the
  change is scoped; Reports' 14 report branches make blast-radius verification non-trivial.

---

## Milestone 2 — Primitive foundations

### Batch 2.1 — Token/theme synchronization adapter

- **Objective**: Implement V2 §8. Consolidate the 72 hardcoded Mantine theme hex literals into one
  named adapter mapped to the existing semantic CSS custom properties (DS-11 / C-R02), removing the
  manual-synchronization risk without changing any rendered color.
- **Files/areas**: `client/src/lib/theme.js`, a new adapter module alongside it (e.g.
  `client/src/lib/theme-tokens.js`), `client/src/index.css` (read as source of truth, not edited for
  values).
- **Dependency on previous batch**: None; recommended before Milestones 4–6 so they don't add new
  one-off hex values that would need re-doing.
- **User-visible change**: None intended. Any visible diff is a bug to fix before merge.
- **Regression risks**: Mantine's 34 importing files consume this theme; a mapping mistake could shift
  light/dark colors broadly. This is the plan's clearest "token/theme architecture change."
- **Accessibility considerations**: Verify contrast ratios unchanged for primary/status colors in both
  themes after the refactor.
- **Mobile verification**: Spot-check Admin Dashboard, Reports, Settings, Login, one FormModal — mobile
  and desktop.
- **Dark-mode verification**: Full before/after screenshot comparison, light and dark, on the same
  sample.
- **Tests required**: None automated for color values; rely on visual diff review.
- **Playwright scenarios required**: Screenshot capture of the 5 sampled screens, light and dark,
  before and after, for manual/visual-regression comparison.
- **Rollback boundary**: `lib/theme.js` plus the new adapter file; CSS untouched, so revert is isolated
  to JS theme config.
- **Completion criteria**: Pixel-equivalent (or negligible-diff) rendering across the sample in both
  themes; the 72 scattered hex literals are replaced by one documented adapter.
- **Release risk**: **HIGH** — named directly in the required risk-classification examples
  ("token/theme architecture changes"); broad indirect reach even with zero intended visual change.

### Batch 2.2 — AppButton adoption: ResponsiveSheet footer batch

- **Objective**: Implement the V2 §3 ResponsiveSheet footer decision. Migrate the 17 conventional
  cancel/primary/destructive footer button templates currently using `ResponsiveSheet`'s exported raw
  footer style object to `AppButton` (DS-02 / C-R01). This is the first representative
  primitive-convergence batch.
- **Files/areas**: `client/src/components/ui/ResponsiveSheet.jsx` (replace/deprecate the raw footer
  style export with an `AppButton`-based footer pattern), plus the ~17 call sites currently importing
  it — enumerate via source search for the exported style constant at execution time.
- **Dependency on previous batch**: None strictly, but should follow 2.1 to avoid introducing new
  hardcoded colors into the footer pattern. If 17 sites is too large for one review, split into two
  sub-batches (e.g., 2.2a ~9 sites, 2.2b ~8 sites) at execution time.
- **User-visible change**: Sheet footer buttons adopt `AppButton`'s variant/touch-target/loading
  conventions; minor visual normalization is expected and acceptable.
- **Regression risks**: Broad call-site count, but each is a like-for-like swap onto an established,
  already-tested primitive.
- **Accessibility considerations**: Confirm 44px touch target preserved/improved, loading state doesn't
  trap focus, danger-variant confirmation flow intact.
- **Mobile verification**: Footer button layout/wrapping at 360–412px across a sample of the 17 sheets.
- **Dark-mode verification**: `AppButton` variants inside sheet footers, dark theme.
- **Tests required**: Component test for the new `ResponsiveSheet` footer contract; unit tests for the
  2–3 highest-traffic converted consumers.
- **Playwright scenarios required**: Exercise cancel/primary/destructive actions in 3 representative
  sheets, confirming click, loading, and keyboard operability.
- **Rollback boundary**: `ResponsiveSheet.jsx` footer change and each call-site swap are independently
  revertable diffs.
- **Completion criteria**: Zero remaining consumers import the deprecated raw footer style; all
  converted footers pass the Playwright interaction checks.
- **Release risk**: **MEDIUM** — wide call-site count, but each change is a bounded, well-understood
  primitive swap.

### Batch 2.3 — Reports touch-target fix

- **Objective**: Raise the sub-44px controls identified in DS-14 / 030-D-04 (Reports mode/filter
  controls at 37–40px; breadcrumb link 36×16; logout at 42×37) to the 44px-class minimum, or document
  an accepted desktop-only exception.
- **Files/areas**: `client/src/pages/admin/ReportsPage.jsx`, shared breadcrumb/logout control in the
  Layout component.
- **Dependency on previous batch**: Benefits from, but does not require, 2.2 if the same controls
  become `AppButton` there.
- **User-visible change**: Slightly larger tap targets on named Reports controls and the
  breadcrumb/logout control; marginal reflow possible at 360px.
- **Regression risks**: Sizing-only; low.
- **Accessibility considerations**: This batch is the fix. Confirm no crowding regression at 360px
  after the size increase.
- **Mobile verification**: 360, 390, 412 for Reports and shell chrome.
- **Dark-mode verification**: Spot check.
- **Tests required**: None new.
- **Playwright scenarios required**: Re-run the 030-D-04 target-size heuristic against the named
  controls; confirm ≥44px or a documented exception.
- **Rollback boundary**: Isolated sizing changes; trivial revert.
- **Completion criteria**: Named controls measure ≥44px, or carry an explicit, owner-accepted
  secondary/desktop-only exception.
- **Release risk**: **LOW** — sizing-only change with no structural impact.

---

## Milestone 3 — Reports responsive implementation

### Batch 3.1 — Student Violation Report mobile card (primary flow)

- **Objective**: Implement V2 §6/§11 mobile presentation for the primary Student Violation Report flow,
  replacing the interim scroll fix (1.3) for this one report with a card-based mobile renderer.
  `91e5b3e` is used as directional reference only per `031-frozen-candidate-evaluation.md`; rebuild
  against current `ReportsPage.jsx` and final V2 rules rather than cherry-picking the commit.
- **Files/areas**: `client/src/pages/admin/ReportsPage.jsx` (student-violations `ReportSection`
  branch); likely a new shared card-renderer component under `client/src/components/` if the pattern
  is meant to be reused in 3.2.
- **Dependency on previous batch**: Depends on 1.3 (safety-net interim fix) and 2.2 (`AppButton` for
  in-card actions); should follow 2.1 to avoid new hardcoded colors.
- **User-visible change**: Mobile users (≤639/767px per the V2 breakpoint table) see a card-per-record
  presentation for this report instead of a scrolled table; desktop keeps the shared `Table`.
- **Regression risks**: Named directly in the required risk examples as "major Reports responsive
  redesign." Filters, export, and status/action columns must all be preserved in the new layout with
  no data loss.
- **Accessibility considerations**: Cards must expose the same data with equivalent semantics, not just
  a visual reflow; actions must remain keyboard-reachable; status must be conveyed by more than color.
- **Mobile verification**: 360, 390, 412, 639, 640, covering populated, loading, empty, and error
  states.
- **Dark-mode verification**: Full card verification, dark theme.
- **Tests required**: Component test for the new card renderer covering populated/empty/loading/error
  props.
- **Playwright scenarios required**: Select the report at mobile width, view results as cards, verify
  field/row-count parity against the desktop table for a fixed dataset, verify export remains
  reachable.
- **Rollback boundary**: Additive new component; revert by restoring the Batch 1.3 scroll-table path
  for this one report only, without affecting other reports.
- **Completion criteria**: This report shows a non-clipped, fully data-equivalent mobile card view at
  all tested widths; desktop table behavior unchanged.
- **Release risk**: **HIGH** — explicitly the "major Reports responsive redesign" risk category named
  in the spec's own examples.

### Batch 3.2 — Secondary report mobile presentation (remaining 14 ReportSection branches)

- **Objective**: Apply the V2 §6 mobile decision rule per report family across the remaining secondary
  reports (late-arrivals/auto-clockout shared branch, the two duty-reassignment tables, the duty-
  coverage/active-students non-table summaries, and the other reference tables) — card, compact-row, or
  intentionally-scrollable presentation chosen per report schema, not one mechanical conversion.
- **Files/areas**: `client/src/pages/admin/ReportsPage.jsx` (all remaining `ReportSection` branches).
- **Dependency on previous batch**: Depends on 3.1 (reusable card pattern) and 1.3.
- **User-visible change**: Each secondary report's mobile presentation becomes a card/compact-row view
  or a genuinely scrollable (non-clipped) table per its data shape; some short reference tables may
  legitimately keep the allowed scroll-table exception.
- **Regression risks**: Broadest Reports surface change in the plan. **Recommend sub-batching by report
  family at execution time** (e.g., 3.2a late-arrivals/auto-clockout, 3.2b duty reassignments, 3.2c
  duty coverage/active students, 3.2d remaining reference tables), each independently reviewable and
  rollback-able.
- **Accessibility considerations**: Same as 3.1, verified per report; confirm status/action parity for
  each converted report.
- **Mobile verification**: 360, 390, 412, 639, 640 for every converted report.
- **Dark-mode verification**: Verify each converted report.
- **Tests required**: Component tests for any new shared card/compact-row pattern extracted beyond 3.1.
- **Playwright scenarios required**: One scenario per report family confirming non-clipped mobile
  presentation and data-equivalence with the desktop table.
- **Rollback boundary**: Per report family, since sub-batched.
- **Completion criteria**: No secondary report presents a clipped desktop-width table in a narrow
  sheet — 030-D-03 fully closed for all reports, not only the primary one.
- **Release risk**: **HIGH** overall for the full batch; sub-batching by family reduces each individual
  PR to a more reviewable MEDIUM.

---

## Milestone 4 — State & form consistency

### Batch 4.1 — OfflineBanner rebuild (frozen candidate `fa996f2` placement)

- **Objective**: Recreate the OfflineBanner → Alert + AppButton direction from `fa996f2` against
  current V2 rules, per its ACCEPT WITH REVISION conditions: preserve the persistent connectivity/sync
  lifecycle, dismissal/reappearance semantics, safe-area/z-index behavior, and dark-mode readability
  that 030-D-10 confirmed already works. Reimplement; do not cherry-pick the commit.
- **Files/areas**: `client/src/components/OfflineBanner.jsx`.
- **Dependency on previous batch**: Depends on 2.1 (token adapter) and 2.2 (`AppButton`) so the rebuild
  targets final primitives.
- **User-visible change**: Visual restyle to an Alert-based presentation with an `AppButton` (or a
  documented raw-disclosure-control exception) dismiss action; connectivity behavior itself unchanged.
- **Regression risks**: Single component, but root-level and safety-relevant — must not reduce offline
  visibility or reliability.
- **Accessibility considerations**: Accessible name/role for the persistent status region; dismiss
  control operability; dismiss/reappearance must not trap or steal focus.
- **Mobile verification**: 360, 390, light and dark; confirm no horizontal overflow (030-D-10 baseline)
  and no bottom-navigation overlap.
- **Dark-mode verification**: Required — the 030-D-10 evidence baseline was dark mode; must not
  regress.
- **Tests required**: Component test for show/dismiss/reappear lifecycle.
- **Playwright scenarios required**: Reproduce the 030-D-10 offline scenario; verify visible,
  dismissible, dark-mode-readable, no overflow.
- **Rollback boundary**: Single file, isolated revert.
- **Completion criteria**: Passes every condition listed for `fa996f2` in
  `031-frozen-candidate-evaluation.md`.
- **Release risk**: **MEDIUM** — single component, but root-level connectivity-status behavior.

### Batch 4.2 — Loading/empty state consolidation

- **Objective**: Implement V2 §7. Reduce the 26 literal "Loading…" text occurrences (DS-13) toward
  `Skeleton` (known-shape) or a local indeterminate loader (unknown-shape), and extend `EmptyState`
  adoption for page/card-level empties beyond its single current consumer — where a real inconsistency
  is visible, not as a blanket rewrite.
- **Files/areas**: Identified via source search for literal "Loading" text across the ~15 affected
  files at execution time; not enumerated here to avoid stale file lists.
- **Dependency on previous batch**: None blocking; benefits from 2.1 for consistent skeleton coloring.
- **User-visible change**: More consistent loading/empty visuals; some pages gain a proper empty-state
  message/action instead of blank or text-only output.
- **Regression risks**: Many small independent files — low risk per file, broad surface area.
  **Recommend splitting by page/feature area at execution time.**
- **Accessibility considerations**: Loading regions should be announced appropriately (`aria-live`
  where relevant); empty states must not remove a previously reachable action.
- **Mobile verification**: Spot-check converted pages at mobile widths.
- **Dark-mode verification**: Spot check.
- **Tests required**: None new beyond existing suite remaining green.
- **Playwright scenarios required**: Verify at least 3 converted pages show the correct skeleton/empty
  state under mocked loading/empty conditions.
- **Rollback boundary**: Per file/page, independently revertable.
- **Completion criteria**: No page-level loading indicator regresses; a documented, materially reduced
  count of literal "Loading…" instances, with rationale for any intentionally kept.
- **Release risk**: **MEDIUM** — broad file count even though each change is small.

### Batch 4.3 — AppButton adoption batch 2 (remaining conventional raw actions)

- **Objective**: Continue V2 §3 convergence for the ~15 non-sheet-footer conventional raw-button
  actions from the 030-C classification (auth submit/cancel, report downloads, upload template,
  retry/reset) — excluding composite/chrome/calendar/pagination controls, which are explicitly out of
  scope per Stream 2.
- **Files/areas**: Auth pages, report download/retry controls, upload template control — enumerated
  via source search for the 030-C-classified handler patterns at execution time.
- **Dependency on previous batch**: Depends on 2.2 for the established `AppButton`-in-context pattern.
- **User-visible change**: Minor visual normalization of these buttons to `AppButton` variants/touch
  targets.
- **Regression risks**: Includes the login/auth submit control, which 030-E notes as an intentionally
  distinct 56px control design — must confirm `AppButton` can represent that variant or document a kept
  exception rather than degrade the auth UX.
- **Accessibility considerations**: Preserve loading/disabled states; preserve retry/danger semantics.
- **Mobile verification**: Auth pages and report pages at mobile widths.
- **Dark-mode verification**: Verify.
- **Tests required**: Unit tests for the 2–3 highest-traffic conversions.
- **Playwright scenarios required**: Exercise login submit, one report download, one retry control
  post-conversion.
- **Rollback boundary**: Per file, independently revertable.
- **Completion criteria**: All identified conventional actions converted, or explicitly documented as
  an approved exception (e.g., the auth 56px variant).
- **Release risk**: **MEDIUM** — touches the login/auth experience, which needs care even though the
  change is otherwise routine.

---

## Milestone 5 — Reports visual cleanup

### Batch 5.1 — Report selector cleanup

- **Objective**: Implement V2 §11. Replace the 15 emoji/arbitrary-color-tile secondary report cards
  with a text-first, grouped-by-family list, using Tabler only where recognition is materially
  improved (DS-18 / DS-19).
- **Files/areas**: `client/src/pages/admin/ReportsPage.jsx` (report selector/catalogue section).
- **Dependency on previous batch**: Depends on 3.1/3.2 (so the selector and result views share one
  visual language) and benefits from 2.1.
- **User-visible change**: The selector reads as a grouped operational index rather than a colorful
  feature-marketplace grid; report identity shifts from emoji/color to text/label grouping.
- **Regression risks**: Visual-only; all 15 report entry points must remain reachable and correctly
  wired to their result views.
- **Accessibility considerations**: Each entry keeps an accessible name/role, not just a colored tile;
  keyboard navigation through the list preserved.
- **Mobile verification**: 360, 390, 639, 640 selector layout.
- **Dark-mode verification**: Grouped list styling, dark theme.
- **Tests required**: Smoke test that all 15 reports remain selectable.
- **Playwright scenarios required**: Click through a sample of 5 reports spanning families, confirming
  each still opens correctly post-redesign.
- **Rollback boundary**: Isolated to the selector section; revertable without affecting result
  rendering from Milestone 3.
- **Completion criteria**: No emoji/arbitrary-color tile remains as primary report identity; all
  reports remain reachable and visually grouped by family.
- **Release risk**: **MEDIUM** — visual-only, but every report entry point must be re-verified.

### Batch 5.2 — Reports filters/header/export hierarchy cleanup

- **Objective**: Implement the remaining V2 §11 rules: group filters by the report they affect, give
  the selected report a concise factual header (name/period/count/export), and clarify export-action
  hierarchy, addressing the DS-18 "control wall" density finding.
- **Files/areas**: `client/src/pages/admin/ReportsPage.jsx` (filter/header/export regions).
- **Dependency on previous batch**: Depends on 5.1 (selector) and Milestone 3 (result rendering).
- **User-visible change**: Filters and header become less dense/more grouped; export actions
  repositioned for hierarchy, not removed.
- **Regression risks**: Visual/layout only; no filter logic change.
- **Accessibility considerations**: Filter labels/grouping remain programmatically associated; export
  buttons keep accessible names.
- **Mobile verification**: 360, 390, 639, 640 filter/header/export layout.
- **Dark-mode verification**: Verify.
- **Tests required**: None new.
- **Playwright scenarios required**: Apply a filter and export a report post-redesign to confirm both
  still function.
- **Rollback boundary**: Isolated to this region.
- **Completion criteria**: Filters visually grouped per report, header shows name/period/count, export
  remains reachable and functional; DS-18 density finding addressed.
- **Release risk**: **MEDIUM** — layout-only change on the most complex page, requiring full
  re-verification of filter/export function.

---

## Milestone 6 — Dashboard visual cleanup

### Batch 6.1 — Admin Dashboard visual cleanup

- **Objective**: Implement V2 §10. Soften/remove the decorative greeting gradient (or justify one
  restrained metaphor), reduce colored quick-action tile variety, and resolve the accent-color overload
  (DS-17) so status colors stop competing with card-identity colors.
- **Files/areas**: `client/src/pages/admin/AdminDashboardPage.jsx` and any shared quick-action/StatCard
  components it uses.
- **Dependency on previous batch**: Depends on 1.1 (same page, nesting already fixed) and 2.1 (token
  adapter).
- **User-visible change**: Calmer, more operational dashboard; fewer simultaneous accent colors;
  quick actions restyled to the standard action hierarchy instead of a colored tile grid.
- **Regression risks**: Visual-only, but the highest-traffic admin page.
- **Accessibility considerations**: Status meaning still conveyed without color alone after re-theming;
  quick-action controls keep accessible names and 44px targets.
- **Mobile verification**: 360, 390.
- **Dark-mode verification**: Verify.
- **Tests required**: None new.
- **Playwright scenarios required**: Load `/admin/dashboard`; verify all quick actions/stat cards still
  navigate/function correctly.
- **Rollback boundary**: Isolated to this page's presentational JSX/CSS.
- **Completion criteria**: DS-17 accent-overload finding addressed on this page; screenshot review
  confirms reduced decorative density with all functional surfaces preserved.
- **Release risk**: **MEDIUM** — visual-only, but on the highest-traffic admin surface.

### Batch 6.2 — Faculty & Super Admin dashboard refinement

- **Objective**: Implement V2 §10 for the remaining dashboards. Preserve the Faculty duty hero
  (functionally justified per 030-E) while trimming repeated card treatment below it; reconcile the
  three dashboards to "one greeting/hero metaphor per dashboard" without forcing identical headers;
  leave Super Admin's already-restrained pattern largely intact.
- **Files/areas**: `client/src/pages/faculty/DashboardPage.jsx`,
  `client/src/pages/super-admin/SuperAdminDashboardPage.jsx`.
- **Dependency on previous batch**: Depends on 6.1 (shared restrained pattern) and 2.1.
- **User-visible change**: Faculty dashboard's secondary card treatment normalized; greeting styles
  reconciled across roles without removing the Faculty duty hero's justified prominence.
- **Regression risks**: Must not disturb the Faculty duty hero's check-in action, a real operational
  path.
- **Accessibility considerations**: Duty hero action button remains keyboard/touch operable after
  restyle; resolve the Faculty "Most Common" category truncation (030-D-05) as part of this batch.
  (Corrected from an earlier "Super Admin" attribution in this plan — verified against 030-E's own
  evidence and current source during Milestone 6 execution; `SuperAdminDashboardPage.jsx` has no
  Most Common card at all. See `specs/032-ui-system-implementation-migration/handoff.md`'s Milestone
  6 section.)
- **Mobile verification**: 360, 390 for both dashboards.
- **Dark-mode verification**: Verify, especially the duty hero gradient.
- **Tests required**: None new.
- **Playwright scenarios required**: Faculty check-in flow smoke test post-restyle; Super Admin
  dashboard load/navigation smoke test.
- **Rollback boundary**: Two files, independently revertable.
- **Completion criteria**: Duty hero preserved and functional; card repetition below it reduced; the
  030-D-05 truncation issue resolved; one coherent greeting metaphor documented per dashboard.
- **Release risk**: **MEDIUM** — must not regress a real operational action (duty check-in).

---

## Milestone 7 — Tokens, dependencies, enforcement

### Batch 7.1 — Dependency verification & cleanup

- **Objective**: Implement Stream 9. Verify actual (including transitive/runtime) necessity of
  `@mantine/notifications`, `@fontsource-variable/geist`, and the `cn()`/`clsx`/`tailwind-merge` chain
  (DS-12 / C-R09), the duplicate font import entry points (C-R11), and the unused `:root` raw ramps
  (C-R10). Remove only what verification confirms is unused. Explicitly **keep** Recharts — it is a
  required Mantine Charts peer/runtime dependency, not a removable zero-usage package.
- **Files/areas**: `client/package.json`, `client/src/main.jsx`, `client/src/index.css`,
  `client/src/lib/utils.ts`.
- **Dependency on previous batch**: Runs after Milestones 2–6, per Stream 9's own instruction that
  usage is only verifiable "after migrations make usage clear."
- **User-visible change**: None intended; a removed duplicate font import could marginally affect
  bundle size/network requests only.
- **Regression risks**: Low per removal, since each is preceded by a fresh grep and a successful build;
  reversible via a simple revert.
- **Accessibility considerations**: None applicable.
- **Mobile/dark-mode verification**: Full smoke pass (build + representative route load, both themes)
  after each removal, since a false "zero usage" reading would break rendering broadly.
- **Tests required**: Full existing test suite plus a production build after each removal.
- **Playwright scenarios required**: Run the existing route-traversal suite once after all removals to
  catch any missed dynamic usage.
- **Rollback boundary**: One dependency/file removal per commit, independently revertable.
- **Completion criteria**: Each removed item verified zero-usage post-Spec-032 via grep, successful
  build, and a green test suite; Recharts documented as kept for its actual reason (peer dependency).
- **Release risk**: **LOW** — each step is verify-then-remove and independently reversible.

### Batch 7.2 — Lint/import-boundary enforcement + accessibility/Playwright regression coverage

- **Objective**: Implement Stream 10. Add targeted ESLint rules preventing new violations of the
  boundaries this plan establishes (no new Radix/Framer feature-page imports beyond the documented
  `StudentSearchOverlay` exception, per C-R06; discourage new raw conventional-action buttons where
  `AppButton` fits). Add durable regression tests for focus-return (1.2) and the offline banner (4.1),
  plus targeted Playwright coverage for every fixed defect in Milestone 1 and every new responsive view
  from Milestone 3 — closing part of the DS-23 testing gap.
- **Files/areas**: `client/eslint.config.js`, the existing Playwright spec location, new/extended
  component tests.
- **Dependency on previous batch**: Depends on Milestones 1–6 substantially completing, so enforcement
  reflects the final boundary rather than a moving target. Last implementation batch in the plan.
- **User-visible change**: None (developer/CI-facing only).
- **Regression risks**: An overly strict new lint rule can break CI broadly if not scoped to new code;
  must use an allowlist/ignore pattern for historical instances rather than force-fixing everything at
  once.
- **Accessibility considerations**: This batch is itself the durable a11y regression guardrail for
  focus-return and offline-banner behavior.
- **Mobile verification**: New Playwright specs must run against the same viewport widths 030-D tested
  (360/390/412/639/640/767/768/1440).
- **Dark-mode verification**: Any new visual checks should cover both themes.
- **Tests required**: New lint-rule fixture test; focus-return unit tests (if not already added in
  1.2); new Playwright specs.
- **Playwright scenarios required**: Focus-return regression (FormModal/ConfirmDialog), Reports
  non-clipping regression across all report families from Milestone 3, OfflineBanner regression, Admin
  Dashboard nesting-error regression.
- **Rollback boundary**: Lint rules and tests are additive; can be disabled/reverted without touching
  product code.
- **Completion criteria**: CI enforces the new import/action boundaries on new code without breaking on
  documented historical exceptions; the four defect classes from Milestones 1/3/4.1 have durable
  automated regression coverage.
- **Release risk**: **MEDIUM** — risk is to developer workflow/CI stability, not runtime behavior.
