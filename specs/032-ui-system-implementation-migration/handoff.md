# Handoff Report

## task_id

032-ui-system-implementation-migration / Milestone 4 — State & Form Consistency
(Batches 4.1 and 4.2 complete; Batch 4.3 not started)

## status

partial

## completed

### Batch 4.1 — OfflineBanner rebuild (commit `bac498b`)

Rebuilt `client/src/components/OfflineBanner.jsx` fresh against current HEAD/V2, using the frozen
candidate `fa996f2` only as directional reference (not cherry-picked), per its ACCEPT WITH REVISION
conditions in `031-frozen-candidate-evaluation.md`.

- Swapped the hand-rolled static `style={{...}}` block for `Alert` (tone="warning") + `AppButton`
  (variant="icon", dismiss control).
- `client/src/components/ui/Alert.jsx` gained a `...rest` spread so `role`/`aria-live`/`aria-label`
  reach the root div (needed for the banner's screen-reader announcement; doesn't affect its other
  callers, which don't pass those props).
- **Revision beyond the frozen candidate**: replaced the 📡 emoji with Tabler `IconWifiOff`/`IconWifi`
  (swaps by connectivity state) — V2 §9 restricts emoji from "status system" roles, and the frozen
  candidate (pre-V2) had kept the emoji.
- Connectivity/dismissal lifecycle, position (`fixed inset-x-0 top-0 z-[70]`), and `md:hidden`
  breakpoint are byte-identical to before — only the presentation layer changed.
- New `e2e/offline-banner.spec.js` (4 tests): show/dismiss/stays-dismissed-while-offline,
  back-online auto-hide after ~2s, desktop never shows (md:hidden), dark-theme render with zero
  uncaught JS exceptions. All pass, both Playwright projects.
- Live-verified via a throwaway Playwright screenshot script (not committed) at 390px, light and
  dark — banner renders correctly, readable, no clipping, dismiss button is a proper 44px target.

### Batch 4.2 — Loading/empty state consolidation (commit `901d100`)

Fixed the DS-13 finding: table "loading" rows were rendered via `EmptyRow`'s "no records" 📭 icon
reused with `message="Loading…"` — visually **identical to the empty-result state**, which is a
real, visible inconsistency (not just a literal-text nitpick). Fixed on 9 files:

- `AuditLogsPage.jsx`, `AllFacultyDutiesPage.jsx`, `ViolationsPage.jsx`, `FlaggedViolationsPage.jsx`,
  `UsersPage.jsx` (main table + Pending Invites table), `MyViolationsTable.jsx`, `SettingsPage.jsx`
  (Violation Types tab), `DutySlotsPage.jsx` — desktop `EmptyRow(message="Loading…")` →
  `TableRowSkeleton`; mobile ad hoc `<div>Loading…</div>` → stacked `CardSkeleton`. Both primitives
  already existed and were already used this way at `StudentsPage.jsx` — this batch extends that
  existing convention, it doesn't invent a new one.
- `DutySlotsPage.jsx` mobile branch had **no loading indicator at all** (a real gap: it would flash
  "No {filter} slots" during load) — added one, matching the pattern used everywhere else.
- Mobile ad hoc `<div>No X found.</div>` / dashed-border boxes → `EmptyState`, matching what each
  page's own desktop `EmptyRow` already did correctly for the same condition (same pages as above,
  plus `StudentsPage.jsx`'s mobile empty text, which had the identical defect).
- **Left ~11 other "Loading…" instances untouched** (App.jsx splash screen, `TrendBreakdownDrawer`,
  `StudentDetailsDrawer` ×2, `MessagesPage` ×2, `AttendanceLivePage`, `CalendarPage`,
  `SettingsPage`'s Duty-Timing/Violations tabs ×2, generic `ReportsPage.jsx` `ReportSection` loader) —
  these are legitimate local indeterminate loaders for small/variable-shape regions with no table
  sibling exhibiting the empty-vs-loading confusion. `ReportsPage.jsx` specifically was left alone
  because its `ReportSection` loader is shared across ~15 report branches with different column
  counts; giving it a correct per-branch skeleton shape is Reports-specific work, arguably Milestone
  5 territory, and disproportionate to this batch's scope — **recorded as deferred, not done**.
- New `e2e/state-consistency.spec.js` (5 tests): Users page desktop/mobile skeleton-while-loading,
  Users page empty→EmptyState, Flagged Violations desktop+mobile skeleton, Student Violations
  desktop skeleton. All pass, both Playwright projects.
- Full existing Playwright suite re-run: 113/116 passed; the 3 failures are the pre-existing
  unrelated `e2e/duty-timing-settings.spec.js` (×2 projects, untouched per standing policy) plus one
  self-inflicted flake in my own new spec that was found and fixed before the final commit (see
  Constraints below) — final state is clean.
- Live-verified via a throwaway Playwright screenshot script (not committed): Users page
  loading/empty states, light and dark, 390px.

## failed_or_blocked

- None outstanding. One transient issue during Batch 4.2 development (not a blocker, already fixed
  and reflected in the committed code): my first cut of `e2e/state-consistency.spec.js` reused one
  `page` across a desktop assertion then a viewport-resize-and-reload to check mobile — `useUsers`
  caches its response into `localStorage` and feeds it back as TanStack Query `initialData`, so the
  reload skipped the loading state entirely on the second check. Fixed by splitting into two
  independent tests (fresh page/context each). See `constraints_discovered` below — this is a real
  hook behavior worth knowing about for any future test/instrumentation of pages using `useUsers`.

## commands_run

```
npx eslint <changed files>            # from client/, per-file, after every edit — all clean
npm run build --workspace=client      # after each batch — succeeds, only pre-existing >500kB chunk advisory
node e2e/seed.mjs                     # against sims-dms-postgres :5434 (dev container, already running)
npm run dev                            # background: client :5173, server :3000
npx playwright test e2e/offline-banner.spec.js --project=chromium --reporter=list
npx playwright test e2e/state-consistency.spec.js --reporter=list          # both projects
npx playwright test --reporter=list   # full suite, both projects, after each batch
# throwaway Playwright screenshot scripts (light/dark, loading/empty) — written to and run from
# the session scratchpad / a gitignored temp file in repo root, deleted immediately after; not committed
```

## constraints_discovered

- **The app's PWA service worker intercepts some GET API calls (e.g. `GET /users`) at the SW
  fetch-handler level in dev**, which Playwright's `page.route()` cannot see or mock — confirmed by
  a throwaway debug spec where a catch-all `page.route('**/*', ...)` saw `/users/me` but never saw
  the `/users` list call, even though `page.on('request'/'response')` logged it normally. Any future
  Playwright test that needs to intercept/mock an API call **must** pass
  `test.use({ serviceWorkers: 'block' })` (or set it per-test via `browser.newContext`), or the mock
  will silently no-op and the real network response renders instead. This is now documented inline in
  `e2e/state-consistency.spec.js` and should be treated as standing guidance for Milestone 4.3 and
  beyond, not re-discovered each time.
- **`useUsers` (`client/src/hooks/useUsers.js`) persists its response to `localStorage`
  (`getCacheKey`/`setCacheKey`) and passes it back as TanStack Query `initialData`.** Any test or
  future instrumentation that reloads/revisits `/admin/users` in the *same* browsing context after an
  initial load will see `isLoading: false` immediately — the loading branch will not fire a second
  time without a fresh context/localStorage. No other hook touched in this milestone does this
  (`useReport`, `useViolations`, `useFlaggedViolations` are plain `useQuery` with no persistence).
- Route-matching precision matters more than usual in this app: a bare substring glob like
  `**/users**` also matches the SPA's own `/admin/users` document navigation (client-routed pages
  still trigger a real document request on `page.goto`), and a looser regex like `/\/users(\?|$)/`
  without anchoring to the API origin does the same. Anchor route patterns to
  `^http://localhost:3000/<exact-path>(\?|$)` when precision matters.

## deviations_from_constitution

- None.

## files_touched

**Batch 4.1** (commit `bac498b`):
- `client/src/components/OfflineBanner.jsx`
- `client/src/components/ui/Alert.jsx`
- `e2e/offline-banner.spec.js` (new)

**Batch 4.2** (commit `901d100`):
- `client/src/pages/super-admin/AuditLogsPage.jsx`
- `client/src/pages/faculty/AllFacultyDutiesPage.jsx`
- `client/src/pages/admin/ViolationsPage.jsx`
- `client/src/pages/admin/FlaggedViolationsPage.jsx`
- `client/src/pages/admin/UsersPage.jsx`
- `client/src/components/faculty/MyViolationsTable.jsx`
- `client/src/pages/admin/SettingsPage.jsx`
- `client/src/pages/admin/DutySlotsPage.jsx`
- `client/src/pages/admin/StudentsPage.jsx`
- `e2e/state-consistency.spec.js` (new)

Not touched: `.tmp/`, `LEARNING_GUIDE.md` (both explicitly out of scope per instructions).

## open_questions_for_owner

- None blocking. One deferred item to flag: `ReportsPage.jsx`'s generic `ReportSection` loading text
  (`if (isLoading) return <p>Loading…</p>`) was deliberately left as plain text rather than given a
  per-report skeleton shape — its ~15 branches have different column counts/layouts (tables, cards,
  non-table summaries), so a correct fix means wiring a shape per report id, which felt like Reports
  work (arguably Milestone 5 scope) rather than a Milestone 4 batch item. Flagging for whoever plans
  Milestone 5, or a future Milestone 4 sub-batch if the owner wants it pulled forward.

## exact_next_step

Start **Batch 4.3 — Form-control consistency** (the remaining Milestone 4 sub-batch per
`032-migration-batch-plan.md` and the user's stated Milestone 4 scope: "AppButton adoption batch 2 /
form-control consistency"). Before writing code:

1. Re-read `specs/031-ui-architecture-design-system-decision/031-design-system-v2.md` §3 (Action
   system) and §4 (Forms), and `031-canonical-component-matrix.md`'s Forms rows — both already read
   this session, decisions are current.
2. Source-search for the ~15 non-sheet-footer conventional raw-button actions from the 030-C
   classification (auth submit/cancel, report downloads, upload template, retry/reset) per
   `032-migration-batch-plan.md` Batch 4.3 — not yet enumerated this session.
3. Standing constraint from the plan: the login/auth submit control is an intentionally distinct 56px
   design (030-E) — confirm `AppButton` can represent that variant, or document it as a kept
   exception, rather than degrading the auth UX.
4. Do NOT convert native/semantic controls, composite/chrome/calendar/pagination raw buttons, or
   direct-Mantine-appropriate contexts — per the standing architecture rules in this milestone's
   instructions and V2 §4's explicit "approved direct-use path, not a bypass" language for ordinary
   Mantine fields.
5. Apply the same verification discipline as 4.1/4.2: lint, build, targeted Playwright (the plan
   calls for exercising login submit + one report download + one retry control post-conversion),
   remember `test.use({ serviceWorkers: 'block' })` if any new spec needs to mock a network call.
6. After 4.3, run the full regression suite once more and produce the Milestone 4 Closure Report the
   user's instructions require (internal commits/SHAs, state/form patterns changed, OfflineBanner
   outcome, coverage summary, lint/build/test results, known pre-existing failures, deferred items —
   including the `ReportsPage.jsx` item above — and confirmation Milestone 5 has not begun), then
   STOP for owner review.
