# Handoff Report

## task_id

032-ui-system-implementation-migration / Batch 1.3 — Reports mobile table clipping: interim correctness fix

## status

complete

## completed

### Scenario addressed

030-D-03 / DS-06: "Reports secondary sheet screenshots at 360/390/639; table widths 606–612 px inside
narrower viewports, detected overflow container `overflowX: visible`; visible columns clipped in
screenshots... At 640 inline, table right edges also exceeded the viewport by 5–10 px while root
overflow remained hidden."

### Reproduction before fix

Opened the "Monthly Attendance" secondary report (`/admin/reports`) inside its `ResponsiveSheet` at
390px in Chrome via `chrome-devtools` MCP: the table header row showed FACULTY/DEPT/TOTAL/COMPLETED/
**ABSENT** with ABSENT cut off at the sheet's right edge, and LATE/AUTO-OUT entirely invisible — no
scrollbar, no visible affordance that more columns existed. This matches the screenshot evidence in
030-D-03 exactly.

### Root cause

**Not** a layout/width-constraint bug (the initial hypothesis from the batch plan, and my own first
guess). Direct DOM inspection (`evaluate_script`, walking the ancestor chain from the table actually
inside the open `[role="dialog"]`) showed the scroll container was correctly narrower (348px) than the
table's content (500px `scrollWidth`), with `overflow-x: auto`/`scroll` set correctly at every level —
i.e., the table was **already fully functionally scrollable** (confirmed by setting `scrollLeft`
programmatically: the hidden columns scrolled into view). The actual defect is that Mantine's
`ScrollArea` (used internally by `Table.ScrollContainer`, which the shared `Table` component wraps)
defaults to `type: "hover"` — the scrollbar thumb renders only on pointer hover, a state that **never
fires on touch-only devices**. So every secondary-report table was scrollable but had zero visible
indication of it on mobile, which is exactly what 030-D-03's "clipped rather than presenting a clearly
discoverable horizontal-scroll surface" describes (their tooling most likely read the same "no visible
scrollbar" signal, from whichever ancestor node it inspected).

### Ownership layer changed

**Shared `Table` component** (`client/src/components/ui/Table.jsx`) — not `ResponsiveSheet`, not a
per-report fix in `ReportsPage.jsx`. Since the missing-affordance defect is a property of every table
using the shared component's default `Table.ScrollContainer` configuration (not something specific to
Reports or to `ResponsiveSheet`), and Design System V2 §6 requires "visibly scrollable... does not clip
content" as a general table rule (not a Reports-only rule), fixing it once at the shared component is
correct per "prefer fixing shared behavior once if the defect is genuinely shared" — the same principle
applied in Batch 1.2. No file in `ReportsPage.jsx` or `ResponsiveSheet.jsx` needed to change.

### Fix

One line: `<MTable.ScrollContainer minWidth={minWidth} scrollAreaProps={{ type: 'always' }}>`. Mantine's
`TableScrollContainer` forwards `scrollAreaProps` directly to its internal `ScrollArea`
(confirmed by reading `node_modules/@mantine/core/esm/components/Table/TableScrollContainer.mjs`), so
`type: 'always'` makes the scrollbar always eligible to render — Mantine still hides it entirely when a
table's content doesn't actually overflow its container (verified below). This changes **only** the
scrollbar's visibility rule; the scroll mechanism, width calculation, and minWidth behavior are
untouched.

### Files changed

- `client/src/components/ui/Table.jsx` (+9 lines: a explanatory comment and one prop)

```diff
--- a/client/src/components/ui/Table.jsx
+++ b/client/src/components/ui/Table.jsx
@@ -11,11 +11,19 @@
  */
 import { Table as MTable, Paper, Text, Center, Stack, Button } from '@mantine/core';

-/** Outer card shell + horizontal scroll container. */
+/** Outer card shell + horizontal scroll container.
+ *
+ * `scrollAreaProps={{ type: 'always' }}` overrides Mantine's ScrollArea
+ * default of `type: 'hover'` — a horizontally-overflowing table was fully
+ * scrollable but showed its scrollbar only on pointer hover, which never
+ * fires on touch, so mobile users had no visible indication there was more
+ * to scroll to (030-D-03). This only changes the scrollbar's visibility
+ * rule, not the scroll mechanism/width/behavior — Mantine still hides the
+ * scrollbar entirely when a table's content doesn't overflow. */
 export function Table({ children, minWidth = 500 }) {
   return (
     <Paper withBorder radius="md" className="overflow-hidden">
-      <MTable.ScrollContainer minWidth={minWidth}>
+      <MTable.ScrollContainer minWidth={minWidth} scrollAreaProps={{ type: 'always' }}>
         <MTable striped={false} highlightOnHover={false} withRowBorders={false}>
```

No other file was touched — not `ReportsPage.jsx`, not `ResponsiveSheet.jsx`.

### Verification matrix

All performed live in Chrome (`chrome-devtools` MCP) against the app's dev stack, logged in as
`super_admin`.

| Area | Width | Theme | Result |
| --- | --- | --- | --- |
| Reports secondary sheet (Monthly Attendance, 7 cols, needs scroll) | 360 | Dark | ✅ visible scrollbar thumb present, all columns reachable |
| Reports secondary sheet (Monthly Attendance) | 390 | Dark | ✅ visible scrollbar; before/after computed-style check confirmed `overflow-x` correct and scrollbar `opacity: 1` without hover |
| Reports secondary sheet (Monthly Attendance) | 390 | Light | ✅ visible scrollbar thumb, clearly visible against light background |
| Reports secondary sheet (Monthly Attendance) | 639 | Dark | ✅ table fits fully (7 cols visible) — correctly shows **no** scrollbar, since nothing overflows at this width |
| Reports desktop inline panel (Monthly Attendance, `!isMobile` branch) | 640 | Dark | ✅ fits without overflow at this width/report combo — same shared component, no separate fix needed; confirmed via `evaluate_script` (`needsScroll: false`) |
| Reports primary "Student Violation Report" table | 1440 (desktop) | Light | ✅ no unwanted persistent scrollbar clutter — table fits comfortably, `type: 'always'` doesn't add visible chrome when there's nothing to scroll |
| Student Violations "All Records" table (unrelated shared-Table consumer, spot check) | 1440 (desktop) | Light | ✅ no regression — 7 columns fit cleanly, no scrollbar shown, all Delete actions intact |

Programmatic confirmation (`evaluate_script`) at 390px: `scrollContainerOverflowX: "auto"`,
`viewportOverflowX: "scroll"`, `scrollbarPresent: true`, `scrollbarVisible (opacity): "1"` — the
scrollbar renders and is visible without any hover/pointer interaction, closing the "not discoverable"
finding directly.

### Lint / build / test results

- `npx eslint client/src/components/ui/Table.jsx` — clean.
- `npm run build --workspace=client` — succeeded (pre-existing >500kB chunk-size advisory only, unrelated).
- No existing unit or Playwright test covers the shared `Table` component or Reports; none were run
  because none apply (consistent with 030's DS-23 finding).
- `git diff --check` — clean (exit 0; only pre-existing CRLF warnings on unrelated files already
  modified before this task).

### Browser results

Zero new console errors or warnings at any tested width/theme. The only console output was pre-existing
and unrelated: the same Chrome DevTools "form field missing id/name" issue seen in prior batches, on
Reports' own filter controls — not introduced by this change (Reports' filter markup was not touched).

### Regressions checked

- **Desktop table behavior**: unaffected — spot-checked the Reports primary table and the unrelated
  Student Violations "All Records" table at 1440px; neither shows a persistent/unwanted scrollbar,
  confirming `type: 'always'` only affects visibility *when there is overflow*, not when there isn't.
- **Scroll mechanism/width**: unchanged — `minWidth`, the `ScrollContainer`/`ScrollArea` nesting, and
  actual scrollability (`scrollLeft` behavior) are identical before and after; only the scrollbar's
  hover-vs-always visibility rule changed.
- **ResponsiveSheet / desktop-inline dual rendering**: both paths use the same shared `Table` component,
  so the fix applies uniformly to the sheet (mobile) and inline (desktop, ≥640px) variants without a
  separate change — verified both render correctly.
- **Table's own empty/loading/error states** (`EmptyRow`, `ErrorRow`, `ErrorBlock`): untouched, still
  rendering correctly (seen throughout — every tested report showed "No records found." via `EmptyRow`
  as expected).

## failed_or_blocked

- None.

## commands_run

```
npx eslint client/src/components/ui/Table.jsx
npm run build --workspace=client
git diff --check
git diff -- client/src/components/ui/Table.jsx
git status --porcelain=v1
# read-only source inspection:
node_modules/@mantine/core/esm/components/Table/TableScrollContainer.mjs
node_modules/@mantine/core/esm/components/ScrollArea/ScrollArea.mjs
# live browser verification via chrome-devtools MCP against the already-running dev stack
# (client :5173, server :3000, dev DB sims-dms-postgres :5434 — unchanged from prior batches)
```

## constraints_discovered

- The batch plan's own guess at "files/areas" (`ReportsPage.jsx` plus "the shared Table component's
  scroll-container wrapper") anticipated the shared-component angle correctly, but the specific
  mechanism (Mantine `ScrollArea`'s `type: 'hover'` default, not a width/flex containment bug) could
  only be confirmed by live DOM inspection — the first `document.querySelector('table')` attempt
  actually grabbed the wrong (background, non-sheet) table entirely, a reminder to scope DOM queries to
  `[role="dialog"]` when a Radix-based overlay is open over the rest of the page.
- Mantine's `Table.ScrollContainer` accepts `scrollAreaProps`, forwarded directly to the underlying
  `ScrollArea` — useful for any future need to adjust scrollbar behavior without a custom wrapper.
- At the exact widths this session's specific reports/data produced, 640px did not reproduce a
  numeric overflow for "Monthly Attendance" (it fit at 562–564px available width) — the general
  mechanism was still verified correct (visible scrollbar whenever content does overflow, none when it
  doesn't); the precise pixel numbers in the original 030-D-03 capture depended on that session's exact
  report/data/font rendering and weren't expected to reproduce byte-for-byte.

## deviations_from_constitution

- None.

## files_touched

- `client/src/components/ui/Table.jsx` (modified)
- `specs/032-ui-system-implementation-migration/handoff.md` (this closure report, overwriting the
  Batch 1.2 closure report per the standing instruction to keep one current handoff per feature folder)

## deferred_for_later_batch

- This is explicitly the **interim correctness fix** per the approved plan — not the mobile card/
  compact-row redesign. Milestone 3 (Batches 3.1/3.2) still owns replacing the scroll-table presentation
  with card/compact-row views per report per the V2 §6 mobile decision rule, using `91e5b3e` as
  directional reference only. This batch's fix remains valid as the safety net under that future work,
  per the plan's own "superseded, not contradicted" language.
- No new adjacent issues were discovered during this batch's verification that need recording.

## open_questions_for_owner

- None blocking. Per the batch's hard stop: **no further Spec 032 batch has been started.** Awaiting
  owner review of this Batch 1.3 closure before Milestone 2 (Batch 2.1) begins.
