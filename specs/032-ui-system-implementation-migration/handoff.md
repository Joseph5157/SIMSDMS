# Handoff Report

## task_id

032-ui-system-implementation-migration / Milestone 4 — State & Form Consistency
(Batches 4.1 and 4.2 complete; Batch 4.3 code changes done, targeted Playwright coverage for it
still outstanding — session paused on a usage-limit warning before finishing that verification)

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
- Live-verified via a throwaway Playwright screenshot script (not committed): Users page
  loading/empty states, light and dark, 390px.

### Batch 4.3 — AppButton adoption batch 2 / form-control consistency (commit `c07ea2a`, PARTIAL)

Source-searched `client/src/**` for raw `<button>` elements (26 files matched) and classified each
against 030-C's "raw action/button semantic classification" table, keeping only the "conventional
action" category (submit/cancel/save/close/download/retry/clear) minus the 17 sheet-footer buttons
already migrated in Batch 2.2. Excluded, per the standing rules: calendar/date-grid controls
(CalendarPage, AttendancePage, SlotPickerPage prev/next + day cells), shell chrome (Layout hamburger/
theme-toggle/logout), disclosure/menu triggers (NotificationBell, SettingsPage show/hide-deactivated,
UploadStudentsDrawer show-errors, RecordViolationModal search/remarks triggers), navigation-as-button
(AdminDashboardPage/SuperAdminDashboardPage "View all", MyViolationsSummary "View all",
ProfileDrawer "Change password", MessagesPage back/tab buttons), selection/toggle composites
(CreateUserDrawer role choice, ReportsPage mode switcher, NotificationsPage filter chips, ProfileDrawer
avatar choice), the ReportsPage student-search-and-pick composite (search result buttons + "Change
student"), and Pagination's internal buttons (intentionally encapsulated).

Found and converted 7 files / ~11 controls:

- `ReportsPage.jsx` — 4 raw Excel/PDF download buttons (main Student Violation Report card +
  individual-by-student card) → `AppButton` `primary`/`secondary`. Disabled-condition expressions and
  button text (including the `downloading ? 'Preparing…' : …` swap) preserved verbatim — only the
  wrapping element and its styling changed.
- `UploadStudentsDrawer.jsx` — "Download sample template (.xlsx)" → `AppButton secondary`. This one
  accepts real visual normalization: the original had a bespoke dashed-border/light-blue "upload
  affordance" box treatment that AppButton doesn't represent; the plan's own batch description
  ("Minor visual normalization of these buttons to AppButton variants") explicitly names "upload
  template" as an expected case of this.
- `StudentsPage.jsx` — "Clear" filters text button → `AppButton ghost size="xs"`.
- `ErrorBoundary.jsx` — "Reload page" → `AppButton primary`. Verified `MantineProvider` wraps
  `ErrorBoundary` in `App.jsx` (`<MantineProvider><ToastProvider><ErrorBoundary>…`), so the
  Mantine-backed button renders correctly even in the crash-fallback path.
- `AllFacultyDutiesPage.jsx` — ad hoc mobile-branch "Retry" text button (a hand-rolled duplicate of
  what `ErrorBlock`'s own Mantine `Button` already does elsewhere) → `AppButton ghost size="xs"`,
  `onClick={refetch}` unchanged.
- `ChangePasswordPage.jsx` — "← Cancel" → `AppButton ghost`, full-width, `disabled={isLoading}`
  preserved. `handleCancel` navigation logic untouched.

**Kept as documented exceptions** (NOT converted — each now has an inline code comment explaining
why, per the plan's explicit instruction to "confirm AppButton can represent that [56px auth] variant,
or document a kept exception rather than degrade the auth UX"):

- `LoginPage.jsx` "Sign in" submit button.
- `ChangePasswordPage.jsx` "Update Password →" submit button.

Both are the same branded family: `h-14 sm:h-11` (56px mobile / 44px desktop, 030-E's documented
distinct auth sizing), `background: var(--brand-gradient-deep)` + `boxShadow: var(--shadow-brand)`,
and (Login only) an `active:scale-[0.97]` press animation. V2 §9 explicitly allows gradients "for
clear brand or task-state emphasis (login, …)" as a kept exception, and `AppButton` has no
gradient/press-scale variant — converting would degrade the auth UX rather than normalize it, which
the plan's own risk note for this exact control anticipated.

**Verification performed so far:**
- `npx eslint` on all 7 changed files (from `client/`) — clean.
- `npm run build --workspace=client` — succeeds, only the pre-existing >500kB chunk-size advisory.
- `npx playwright test e2e/login.spec.js` (both projects) — both scenarios pass; this exercises the
  kept-exception Sign-in submit button end-to-end (fill → click → navigate), satisfying the plan's
  "exercise login submit" requirement.
- Full existing Playwright suite, both projects: **116 passed, 2 failed** — the 2 failures are the
  pre-existing unrelated `e2e/duty-timing-settings.spec.js` (both projects, untouched per standing
  policy, same failure as every prior Batch 4.x handoff). No new failures — confirms the AppButton
  swaps didn't regress `ReportsPage.jsx`, `StudentsPage.jsx`, or `AllFacultyDutiesPage.jsx`, all of
  which have existing Playwright coverage exercising other parts of those same pages.

**NOT yet done (this is the reason status is "partial", not "complete"):** targeted new Playwright
coverage specifically for the *converted* controls — one report download, the Clear-filters button,
the Retry button, and the ChangePasswordPage Cancel button. The plan's stated bar is "exercise login
submit [covered above by the existing spec], one report download, one retry control post-conversion"
— the download/retry/clear/cancel-specific assertions were not written before the session paused.

## failed_or_blocked

- None outstanding for 4.1/4.2 (both fully verified and committed). Batch 4.3 is code-complete and
  regression-checked via the full suite, but its own dedicated Playwright scenarios (see above) are
  not yet written — this is a genuine gap to close before Batch 4.3 (and Milestone 4) can be called
  done, not a blocker on anything else.
- One transient issue during Batch 4.2 development (already fixed, reflected in the committed code):
  my first cut of `e2e/state-consistency.spec.js` reused one `page` across a desktop assertion then a
  viewport-resize-and-reload to check mobile — `useUsers` caches its response into `localStorage` and
  feeds it back as TanStack Query `initialData`, so the reload skipped the loading state entirely on
  the second check. Fixed by splitting into two independent tests (fresh page/context each). See
  `constraints_discovered` below.

## commands_run

```
npx eslint <changed files>            # from client/, per-file, after every edit — all clean
npm run build --workspace=client      # after each batch — succeeds, only pre-existing >500kB chunk advisory
node e2e/seed.mjs                     # against sims-dms-postgres :5434 (dev container, already running)
npm run dev                            # background: client :5173, server :3000
npx playwright test e2e/offline-banner.spec.js --project=chromium --reporter=list
npx playwright test e2e/state-consistency.spec.js --reporter=list          # both projects
npx playwright test e2e/login.spec.js --reporter=list                     # both projects, after Batch 4.3
npx playwright test --reporter=list   # full suite, both projects, after each batch (3 runs total)
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
  will silently no-op and the real network response renders instead. This is documented inline in
  `e2e/state-consistency.spec.js` — apply the same pattern to the still-to-be-written Batch 4.3 spec
  if it needs to mock/force an error state (e.g. for the Retry-control test).
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
- `downloadReportFile` (`client/src/utils/downloadFile.js`) fetches the export as a blob via `api.get`
  then synthesizes an `<a download>` click + `URL.createObjectURL` — it does NOT navigate or open a
  new tab. A Playwright test asserting "download happened" should use
  `page.waitForEvent('download')` around the click, not a URL/navigation assertion. Not yet used
  anywhere in this repo's e2e suite — will be new ground for the Batch 4.3 report-download test.
- `ChangePasswordPage.jsx`'s Cancel button only renders when `!isMandatory`
  (`currentUser?.must_change_password`), which is `false` for both e2e fixture users
  (`e2e.faculty@sims.test`, `e2e.admin@sims.test`) — so testing it just means navigating directly to
  `/change-password` after a normal login, no special fixture setup needed.

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

**Batch 4.3** (commit `c07ea2a`, partial — code done, tests pending):
- `client/src/pages/admin/ReportsPage.jsx`
- `client/src/components/UploadStudentsDrawer.jsx`
- `client/src/pages/admin/StudentsPage.jsx`
- `client/src/components/ErrorBoundary.jsx`
- `client/src/pages/faculty/AllFacultyDutiesPage.jsx`
- `client/src/pages/auth/ChangePasswordPage.jsx`
- `client/src/pages/auth/LoginPage.jsx` (comment only — documents the kept exception, no behavior
  change)

Not touched: `.tmp/`, `LEARNING_GUIDE.md` (both explicitly out of scope per instructions).

## open_questions_for_owner

- None blocking. Two deferred items to flag for future milestones:
  1. `ReportsPage.jsx`'s generic `ReportSection` loading text (`if (isLoading) return <p>Loading…</p>`)
     was deliberately left as plain text rather than given a per-report skeleton shape (Batch 4.2) —
     its ~15 branches have different column counts/layouts, so a correct fix means wiring a shape per
     report id, which felt like Reports-specific work (arguably Milestone 5) rather than a Milestone 4
     batch item.
  2. None new from Batch 4.3 — the two kept-exception auth buttons are a deliberate, documented
     design decision (see above), not an open question.

## exact_next_step

**Finish Batch 4.3's verification, then close out Milestone 4.** The code changes are committed
(`c07ea2a`) and regression-checked (full suite green apart from the pre-existing unrelated failure),
but the batch isn't done until it has its own targeted Playwright coverage per the plan's stated bar.
Concretely, in one new file `e2e/form-actions.spec.js` (or similar):

1. **Report download** (satisfies "one report download"): log in as admin, go to `/admin/reports`,
   select the Student Violation Report (default/main card), click the "⬇ Excel" `AppButton`, assert
   via `page.waitForEvent('download')` that a download fires (see the `downloadReportFile` note under
   `constraints_discovered` — it's a blob+synthetic-`<a>` click, not a navigation).
2. **Retry control** (satisfies "one retry control"): the newly-converted `AllFacultyDutiesPage.jsx`
   mobile Retry button is the most direct target — force `isError` (e.g. `page.route` the
   `/duty-slots`-family endpoint it calls to `route.abort()` or fulfill a 500 once, remembering
   `test.use({ serviceWorkers: 'block' })` first per the constraint above), click Retry, assert the
   error state clears and real content (or a second forced state) appears.
3. **Clear filters**: `/admin/students`, type into the search box, assert the `AppButton ghost`
   "Clear" appears, click it, assert the search box empties and the filter row's conditional
   rendering (`hasFilters`) hides the button again.
4. **ChangePasswordPage Cancel**: log in as faculty, `page.goto('/change-password')`, assert the
   `AppButton ghost` "← Cancel" is visible (per the `constraints_discovered` note, no special fixture
   needed — the e2e faculty user has `must_change_password: false`), click it, assert navigation to
   `/faculty/dashboard`.
5. Run `npx eslint` on the new spec's directory context is not applicable (e2e isn't linted by the
   client config — confirmed this session, root has no `eslint.config.js` either); just run the new
   spec directly plus the full suite once more afterward.
6. **Then produce the Milestone 4 Closure Report** the user's original instructions require:
   internal commits/SHAs (`bac498b`, `901d100`, `c07ea2a`, plus whatever finishes 4.3), state patterns
   changed (4.2), form/action patterns changed (4.3), OfflineBanner outcome (4.1), files/areas
   affected, Playwright/browser coverage summary, lint/build/test results, the pre-existing
   `duty-timing-settings.spec.js` failure, deferred items (the `ReportsPage.jsx` generic-loader item),
   and explicit confirmation that Milestone 5 has not begun. **Then STOP for owner review** — do not
   start Milestone 5 (Reports visual cleanup), Milestone 6 (Dashboard visual cleanup), Milestone 7, or
   21st.dev integration.

No completed work needs to be redone — Batches 4.1, 4.2, and 4.3's code are all done and verified at
the lint/build/regression-suite level; only the four targeted Batch 4.3 test scenarios above and the
closure report remain.
