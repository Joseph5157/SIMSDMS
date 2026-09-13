# Handoff Report

## task_id

032-ui-system-implementation-migration / Batch 3.2b — Duty Reassignments mobile card
(second sub-batch of Milestone 3, Batch 3.2)

## status

complete

## completed

### Objective (from the approved plan)

Apply the V2 §6 mobile decision rule to the `duty-reassignments` `ReportSection` branch — per
owner instruction, **3.2b only**, not rolled together with 3.2c/3.2d, kept on its own commit so
each sub-batch of this HIGH-risk Reports work stays independently revertible.

### Per-table judgment (not one mechanical conversion)

This branch has two tables, and the plan explicitly calls for schema-based judgment rather than
converting both the same way:

- **Duty counts** (Faculty, Regular, Received, Reassigned away, Final duties — 5 columns, one row
  per active faculty, no actions): a short read-only comparison table. **Left unchanged** — it
  keeps the existing `Table`'s allowed-scroll-table presentation (Batch 1.3's visible-scrollbar
  fix), matching the plan's explicit allowance that "some short reference tables may legitimately
  keep the allowed scroll-table exception."
- **Reassignment history** (Date, Session, From, To, Reason, By, Attendance — 7 columns, one row
  per reassignment event with a free-text reason and an outcome): per-event operational data meant
  to be scanned individually, same shape as Batches 3.1/3.2a. **Converted to the card pattern.**

### Implementation

- `client/src/pages/admin/ReportsPage.jsx`, `case 'duty-reassignments':` — the "Duty counts" `Table`
  is byte-for-byte unchanged. The "Reassignment history" `Table` is now wrapped in
  `ResponsiveDataView` with the same `MobileList`/`MobileListItem`/`MobileListItemHeader`/
  `MobileListItemMeta` primitives as before; desktop branch is the original 7-column `Table`,
  unchanged.
- Card shows: date (title), session (subtitle), "{From} → {To}" (meta line 1), and
  "By {recorder} · {attendance} · {reason}" (meta line 2, reason omitted when null) — all 7 original
  fields preserved, no data loss.
- No new shared component extracted (same reasoning as 3.1/3.2a).

### Playwright scenario (`e2e/reports-duty-reassignments.spec.js`, new file)

7 tests, all passing on `chromium`, covering only the history table's responsive behavior (the
counts table is unchanged and already covered by Batch 1.3):
1. Desktop (1280px): both tables show the seeded data; history unchanged.
2. Mobile (360/390/412/639px): `ResponsiveSheet` shows a card, not a table, for reassignment
   history specifically (assertions scoped to that table's own heading, since the counts table
   legitimately still renders a `<table>` at every width).
3. 640px: the inline result panel also shows the history card.
4. Empty state: selecting "last year" shows the "No reassignments this month." `EmptyState`.

`e2e/seed.mjs` extended with a second faculty user (`E2E Faculty Two`, never logs in — only
referenced as the reassignment's "to" side) and one fixed `DutySlot` (today, **afternoon** — a
different session than 3.2a's morning slot, so no unique-constraint collision) + `DutyReassignment`
(from E2E Faculty to E2E Faculty Two, reason "E2E test reassignment"). Find-then-create, matching
prior seed style.

**RED verified**: `git stash`-ed `ReportsPage.jsx` back to the pre-3.2b code and re-ran the
suite — 3 of the 4 mobile/640px tests failed for the correct reason (`getByRole('table')` found 1
instead of 0 within the history section); this is a stronger, more consistent RED signal than
Batch 3.2a's single-failure result (same Vite-HMR-timing caveat noted there still applies to the
one test that didn't fail). Restored the implementation and reconfirmed all 7 pass, plus the full
16-test Reports suite (3.1 + 3.2a + 3.2b) together.

### Verification matrix (live browser, chrome-devtools MCP against the local dev stack)

| State | Width(s) | Theme | Result |
| --- | --- | --- | --- |
| Populated (sheet) | 360, 390 | light + dark | History card renders correctly; counts table still visibly scrollable (scrollbar present) alongside it; no clipping |
| Populated (inline panel / desktop table) | 1280 | light | Both tables render correctly: counts unchanged, history unchanged, seeded data present |
| Empty | — | — | Covered by the Playwright scenario; identical `EmptyState` component already live-verified in Batches 3.1/3.2a |

One incidental finding, not a defect: toggling the theme button via a programmatic click while the
`ResponsiveSheet` was open closed the sheet. This is expected Radix Dialog "outside interaction"
dismissal behavior (its dismissable layer treats a document-level pointer event outside the dialog
content as a close trigger, including one dispatched via `element.click()` on a hidden element) —
not related to this batch's change, and not the same thing as the devtools-viewport-resize artifact
noted in the Batch 3.2a handoff (confirmed separately, see 3.2a's handoff for that one).

### Lint / build / test results

- `npx eslint client/src/pages/admin/ReportsPage.jsx` — clean.
- `npm run build --workspace=client` — succeeded (pre-existing >500kB chunk-size advisory only).
- `npx playwright test e2e/reports-duty-reassignments.spec.js --project=chromium` — 7/7 passed.
- Full `npx playwright test` (all specs, both projects): 36 passed, 2 failed — both
  `e2e/duty-timing-settings.spec.js`, the same pre-existing unrelated failure flagged in the Batch
  3.1/3.2a handoffs. Per the standing Spec 032 test policy, not touched.

### Regressions checked

- Duty counts table markup unchanged (verified live and by diff).
- Desktop reassignment-history table markup unchanged (verified live at 1280px, all 7 columns).
- Other `ReportSection` branches (14 remaining, including `student-violations` and
  `late-arrivals`/`auto-clockout`) untouched — this batch only edits one branch's second table.
- No new console errors/warnings at any tested width/theme.

## failed_or_blocked

- None.

## commands_run

```
DATABASE_URL=postgresql://postgres:devpassword@localhost:5434/sims_dms_dev node e2e/seed.mjs
npx eslint client/src/pages/admin/ReportsPage.jsx
npm run build --workspace=client
npm run dev   # background: client :5173, server :3000
npx playwright test e2e/reports-duty-reassignments.spec.js --project=chromium --reporter=list
git stash push -- client/src/pages/admin/ReportsPage.jsx   # RED-verification revert, then popped
npx playwright test e2e/reports-duty-reassignments.spec.js e2e/reports-attendance-events.spec.js e2e/reports-student-violations.spec.js --project=chromium --reporter=list
npx playwright test --reporter=list   # full suite, both projects
# live browser verification via chrome-devtools MCP: emulate(), evaluate_script() for
# scroll-into-view and tile clicks, take_screenshot(), take_snapshot()
taskkill //PID 15420 //F ; taskkill //PID 11464 //F   # stopped the dev server/client processes started for this session
```

## constraints_discovered

- Per-table judgment within a single `ReportSection` branch works fine with `ResponsiveDataView` —
  it's applied to only one of the two tables in this branch, and the untouched `Table` sits
  alongside it with no interference.
- Confirmed (new): a `ResponsiveSheet` closes on any outside pointer interaction, including a
  programmatically dispatched click on an element that isn't visually part of the sheet (e.g. a
  hidden desktop-only theme toggle) — this is standard Radix Dialog dismissable-layer behavior, not
  an app defect, but worth knowing when live-verifying secondary reports: reopen the tile after any
  such interaction rather than assuming the sheet stayed open.

## deviations_from_constitution

- None.

## files_touched

- `client/src/pages/admin/ReportsPage.jsx` (Batch 3.2b implementation: `duty-reassignments` history-table card branch)
- `e2e/reports-duty-reassignments.spec.js` (new — Batch 3.2b's required Playwright scenario)
- `e2e/seed.mjs` (extended with a second faculty user + a duty slot/reassignment fixture, idempotent)
- `specs/032-ui-system-implementation-migration/handoff.md` (this closure report, overwriting the Batch 3.2a report)

## open_questions_for_owner

- Per the plan and owner instruction, **Batch 3.2c (duty coverage/active students) and 3.2d
  (remaining reference tables) have not been started.** Awaiting review of this 3.2b closure before
  proceeding, one sub-batch at a time, each on its own commit.
- `e2e/duty-timing-settings.spec.js` remains broken on unmodified code — unchanged status from
  prior handoffs, not fixed here per standing policy.
