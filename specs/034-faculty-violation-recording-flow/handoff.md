# Handoff Report

## task_id
034-B / Faculty Violation Recording Flow implementation (034-A audit approved, not repeated here) +
closure pass: Dashboard eligibility alignment, handoff cleanup, branch move to `feature/spec-034-
violation-recording` off current production `main`.

## status
complete

## completed
- **Lifecycle/state correctness** (`RecordViolationModal.jsx`): fresh open always resets the draft
  (`resetDraft()` on the open-transition effect); Cancel/close (button, backdrop, Esc, X) clears the
  abandoned draft and the mutation's error state (`create.reset()`); normal success closes + fully
  resets; Quick Add success keeps duty context + Quick Add on, clears only student/violation-specific
  fields. No automatic draft persistence was added.
- **Eligibility alignment**: frontend now derives eligibility exactly like the backend
  (`server/controllers/violations.controller.js createViolation`) — a *today* duty slot with an open
  attendance record (`in_time` set, `out_time` null). The old picker that let faculty choose *any*
  scheduled/completed slot from the whole month was removed entirely. A faculty member with no active
  slot sees a compact, non-submittable off-duty state (single explanatory Alert + Close button, no
  form, no submit control) instead of a disabled button. Admin mode is untouched by this gate
  (`offDuty = !adminMode && !activeSlot`).
- **Submission integrity (frontend)**: added a synchronous `useRef` in-flight guard (`submittingRef`)
  in addition to the async `isPending`-driven `disabled` prop, closing the double-click window between
  click and React re-render. `ResponsiveSheet`'s existing `confirmClose`/`onDismissAttempt` props are
  used while a submission is in flight so backdrop/Esc/X are swallowed (with a toast) instead of
  closing mid-commit.
- **Submission integrity (backend)**: `createViolation` (`server/controllers/violations.controller.js`)
  now wraps the violation insert and its audit-log write in a single `prisma.$transaction`. If the
  audit-log write fails, the transaction rolls back the violation row with it — a failed audit write
  can no longer leave behind a violation that was actually recorded while the API response (and
  therefore the UI) reports the request as failed.
- **Dashboard quick-action eligibility alignment**: the faculty Dashboard's "Record Student Violation"
  quick action (`DashboardPage.jsx`) previously gated its own visibility on
  `todaySessions.some(s => s.slot_status === 'scheduled')` — a different, looser rule than the
  recorder's real eligibility gate, which could both under-show (hide the button for an actively
  checked-in faculty member whose slot `status` already reads `completed`) and over-show (show it for
  a merely-scheduled, not-yet-checked-in slot). Extracted the shared predicate into
  `client/src/utils/dutyEligibility.js` (`isActivelyCheckedIn`, matching
  `createViolation`'s server-side rule: `in_time` set, `out_time` still null) and now call it from both
  `RecordViolationModal.jsx` and `DashboardPage.jsx`, so the two surfaces can't drift into two
  different definitions of "on duty" again. Admin authorization is untouched — `DashboardPage.jsx` has
  no `adminMode` path. The dedicated Faculty → Student Violations entry point
  (`ViolationRecorderPage.jsx`) needed no adjustment — its trigger was already unconditional, and the
  modal's own off-duty state already handles that case correctly regardless of which trigger opened it.
  Live-verified in the browser for both the active-duty and off-duty seeded faculty fixtures.
- **Student search stability** (`StudentSearchOverlay.jsx`): display state (min-character guidance,
  loading, empty, error) now derives from the live keystroke value, not the debounced value — the
  previous query's results are hidden the instant the input changes, before the 250ms debounce timer
  even fires. Only the network request stays debounced. Added an explicit `isError`/retry state,
  distinct from zero-results. Stale-response protection relies on TanStack Query's per-key caching
  plus an explicit `debounced === trimmedQ` gate that refuses to render results that don't answer the
  currently-typed query.
- **Validation and errors**: the submit button is never silently disabled for missing fields — clicking
  it always runs `validate()` and shows field-level errors plus one concise top banner, focused into
  view. The banner auto-hides once every field clears (computed at render time, not via a
  setState-in-effect, to satisfy the `react-hooks/set-state-in-effect` lint rule). Server errors are
  shown once (the inline Alert only — the earlier duplicate toast call for the same message was
  removed).
- **Focus/accessibility**: added two explicit, contained focus-management effects in
  `RecordViolationModal.jsx` (not in `ResponsiveSheet`/`StudentSearchOverlay`) — one restores focus to
  whatever opened the sheet, one restores focus to the student-search trigger when the nested overlay
  closes. Both live-verified via chrome-devtools MCP and covered by Playwright. Quick Add now uses
  Mantine `Switch`'s own `label`/`description`/`labelPosition="left"` instead of adjacent unlabelled
  paragraphs, giving it a real accessible name (verified in the a11y tree: `"Quick-add mode Stay open
  to record multiple violations"`).
- **Workflow/layout**: desktop keeps the centered-dialog `ResponsiveSheet` behavior; mobile now uses
  `mobileMode="fullscreen"` for full keyboard/scroll space. Content order is context → student →
  violation type → conditional "Others" description → warning/fine → optional remarks → Quick Add
  (moved from the top to the bottom, next to the completion controls). The duty-slot section shrank
  from a large highlighted box + dropdown to one compact Alert strip.
- Verified both the faculty (`/faculty/violations`) and admin (`/admin/violations`, `adminMode`) reuse
  paths live in a real browser against the seeded dev DB, including a full create → visible-in-list →
  soft-delete round trip on both.
- New Playwright spec `e2e/faculty-violation-recording.spec.js` (16 tests) covering every scenario in
  the task list; all pass on both `chromium` and `mobile-chrome` projects, twice in a row (to prove the
  cleanup doesn't leave cross-run state, including the duty-slot FK issue described below).
- Added `E2E_FACULTY2_EMAIL`/`E2E_FACULTY2_PASSWORD` to `e2e/fixtures.mjs` (the second seeded faculty
  already had a working password in `e2e/seed.mjs`, just no exported constant) — it's the ready-made
  "holds a today slot but never checked in" off-duty fixture.
- 9 new/updated backend unit tests for `createViolation` (eligibility × 4, admin bypass, transaction
  atomicity on audit-write failure) — full server suite (247 tests) and client Vitest layer (18 tests)
  still pass.

## failed_or_blocked
- None outstanding. Two self-inflicted issues were found and fixed during verification, not left open:
  - A `react-hooks/set-state-in-effect` lint error from an early draft of the "auto-clear stale
    validation banner" logic — fixed by deriving the visible error at render time instead of an effect
    that called `setFormError('')`.
  - A cross-fixture interaction: soft-deleting a faculty-recorded test violation via the app's own
    Delete action left a row that still FK-referenced today's duty slot, which made
    `e2e/seed.mjs`'s `resetDutyFixtures` fail on the *next* run with a Prisma P2003 error. Fixed by
    having the spec's own cleanup hard-delete (via Prisma directly, same pattern `seed.mjs` itself
    uses) instead of going through the soft-delete UI. Confirmed fixed by running the full spec twice
    back-to-back (which forces a reseed in between).

## commands_run
Two passes: the original 034-B implementation pass (on `audit/design-system-030`), then this closure
pass, re-run in full on `feature/spec-034-violation-recording` after the branch move described below.
Both passes produced the same totals — the numbers below are the closure-pass (final, authoritative)
run.
```
# branch move (preserving the uncommitted 034-B + closure-pass changes)
git stash push -u -m "spec-034-violation-recording"
git fetch origin                                              # origin/main -> 30d6d71 (matches spec)
git switch -c feature/spec-034-violation-recording origin/main
git stash pop                                                 # no conflicts (audit/design-system-030
                                                                # is a full ancestor of origin/main —
                                                                # verified via `git merge-base
                                                                # --is-ancestor`, so this is an exact
                                                                # rebase, not a 3-way merge)

# server
cd server && npx eslint .                             # n/a — server has no lint script; see client
cd server && npx vitest run tests/violations.test.mjs  # 9/9 passed (the directly relevant file)
cd server && npx vitest run                            # 247/247 passed (full suite, 23 files)

# client
cd client && npx eslint .                              # 0 errors (1 pre-existing unrelated warning
                                                         #  in Toast.jsx, not touched by this task)
cd client && npm test                                   # 18/18 passed (vitest)
cd client && npm run build                              # succeeds

# e2e (against local disposable Postgres, sims-dms-postgres :5434; dev server restarted clean
# before each Playwright run in this pass, to rule out stale Vite/HMR state as a variable)
npm run migrate:deploy
npm run test:e2e:seed
npx playwright test e2e/faculty-violation-recording.spec.js --project=chromium      # 16/16
npx playwright test e2e/faculty-violation-recording.spec.js --project=mobile-chrome # 16/16
npx playwright test --project=chromium                                             # 88/88*
```
\* First attempt at the full 88-test regression run reported 85 passed / 1 failed / 2 not-run: one of
this spec's own viewport tests (`desktop (1440px): centered dialog`) timed out waiting for a button
click while a separate, manually-driven chrome-devtools MCP browser session was still open on this
machine competing for resources during the same 4-worker parallel run. That test — and the two after
it, only skipped because this file's `mode: 'serial'` stops the remaining tests in the file after one
failure — passed individually and as part of the file's own 16/16 runs both before and after. Closing
that extra session and re-running the full suite immediately after produced a clean 88/88 with no
retries, so this is recorded as a real-machine resource-contention flake in the *test harness*, not a
product defect: nothing in `e2e/faculty-violation-recording.spec.js` line 448-454 (the failing
assertion) depends on timing beyond a normal `expect().toBeVisible()`-class wait, and CI runs this
suite with `retries: 2` (`playwright.config.js`), which would have absorbed it automatically.

## constraints_discovered
- `e2e/seed.mjs`'s second faculty (`e2e.faculty2@sims.test`) already had a working password (same hash
  as the primary faculty fixture) — it just had no exported constant in `fixtures.mjs`, since nothing
  needed to log in as it before. It's also already the ideal "off-duty" fixture (today's afternoon
  slot, no attendance row) with no seed changes required.
- The app's PWA service worker is active in `npm run dev` (`devOptions.enabled: true`), using a
  network-first-fall-back-to-cache strategy for API routes. This silently defeats Playwright's
  `page.route()` network-failure/slow-response simulations unless the test context blocks service
  worker registration (`test.use({ serviceWorkers: 'block' })`).

## deviations_from_constitution
- None. `ResponsiveSheet` was used via its existing `mobileMode`/`confirmClose`/`onDismissAttempt`
  props, not modified. No new icon/UI library, no new raw Radix/Framer import, no new static inline
  `style={{}}` for fixed values (new markup uses Tailwind classes with `var(--…)` bracket values,
  matching the file's own pre-existing idiom).

## files_touched
- `client/src/components/faculty/RecordViolationModal.jsx` — full lifecycle/eligibility/submission-
  integrity/validation/focus/layout rewrite (see `completed` above); eligibility now sourced from the
  shared `isActivelyCheckedIn` predicate.
- `client/src/components/ui/StudentSearchOverlay.jsx` — search-state derivation now keyed off the live
  keystroke, not the debounced value; added an explicit network-failure/retry state.
- `client/src/utils/dutyEligibility.js` — new. `isActivelyCheckedIn(attendance)`, the single shared
  "actively on duty right now" predicate used by both `RecordViolationModal.jsx` and
  `DashboardPage.jsx`.
- `client/src/pages/faculty/DashboardPage.jsx` — `canDoViolation` now calls `isActivelyCheckedIn`
  instead of checking `slot_status === 'scheduled'`.
- `server/controllers/violations.controller.js` — `createViolation`'s violation insert + audit-log
  write now run inside one `prisma.$transaction`.
- `server/tests/violations.test.mjs` — added a `describe('createViolation', …)` block (9 tests).
- `e2e/fixtures.mjs` — added `E2E_FACULTY2_EMAIL`/`E2E_FACULTY2_PASSWORD`.
- `e2e/faculty-violation-recording.spec.js` — new, 16 Playwright tests.

## open_questions_for_owner
- None.
