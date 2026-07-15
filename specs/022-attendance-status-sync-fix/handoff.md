# Handoff Report

## task_id
022-attendance-status-sync-fix / attendance status correctness + centralization

## status
complete

## completed
- Diagnosed a user-reported bug report ("Attendance Status Logic & Synchronization Issue",
  6 symptoms) down to concrete, verified root causes rather than the six separate issues it
  was framed as:
  1. **`getLive()` mislabeled cron-created no-show rows as `'checked_in'`.** It checked only
     `!s.attendance` (row presence) instead of whether `in_time` was actually set. Once
     `markNoShowAbsent` (cron) creates a `duty_attendance` row for a no-show
     (`in_time: null, in_status: 'absent'`), `!s.attendance` becomes false and the old code
     fell through to `s.attendance.out_time ? 'checked_out' : 'checked_in'` — reporting
     `'checked_in'` for a genuinely absent faculty member. This is why the Admin Live
     Attendance dashboard showed absent faculty with a green "active" border/badge.
  2. **`Badge.jsx`'s `STATUS_LABELS.not_checked_in` was literally `'Absent'`.** Every consumer
     of `<Badge status="not_checked_in" />` displayed the text "Absent" for faculty who were
     simply still within their valid check-in window — a single shared-component bug that
     explains why different pages appeared to disagree about the same faculty member's state
     (they were reading the same correct `attendance_status` value, but one place rendered it
     via `Badge` — wrong label — and another via ad hoc inline text — correct label).
  3. **Faculty Dashboard gated the Check-In button on the raw, persisted `slot_status`
     column instead of the live-computed window state.** `duty_slots.status` is set to
     `'absent'` exactly once, by the cron job, and — per `CONSTITUTION.md` §4 Duty
     Attendance ("existing duty_attendance records are never retroactively recalculated") —
     is never proactively un-set. If an Admin later widens Duty Timing Settings (e.g. moves
     the afternoon session start to 2:40 PM) after a slot had already been marked absent
     under an earlier/tighter configuration, the frontend permanently hid the Check-In
     button even though `checkIn()` itself never checked `slot.status` and would have
     accepted the check-in. This is the exact reported repro ("checking in exactly at the
     configured time immediately displayed Absent").
  4. **`checkIn()` never reset `duty_slots.status` back from `'absent'`** on a successful
     recovery check-in, so even faculty who reached the check-in flow via direct API access
     left every other raw-`status` reader (Duty Slots page, `canDoViolation`, Reports) stuck
     showing absent indefinitely.
- Introduced `server/services/attendance-status.service.js` — a single `resolveAttendanceStatus()`
  used by every read path that needs "what is this slot's attendance state right now"
  (`getLive`, `getMySummary`, `getMonthSlots`). It is a superset of the pre-existing
  (correct) `getMySummary` logic: unchanged for `upcoming` / future-dated / strictly-past-day
  slots (preserves the existing tested contract that a fully-elapsed past day always reads
  `not_checked_in`), and adds one new, previously-missing branch — a **today** slot past its
  own configured auto clock-out with no check-in now live-resolves to `'absent'` without
  waiting up to 10 minutes for the cron tick, and self-heals immediately if the Admin widens
  the window.
- `getLive()` (`server/controllers/attendance.controller.js`) rewired onto the shared resolver
  — fixes root cause #1.
- `getMySummary()` rewired onto the shared resolver; `tally()` gained an `absent` count
  alongside the existing `not_checked_in` count (previously indistinguishable).
- `getMonthSlots()` (`server/controllers/duty-slots.controller.js`) now attaches a computed
  `attendance_status` to every slot via a new `attachAttendanceStatus()` helper, so the Duty
  Slots page and the Dashboard's upcoming-slots list see the same live truth as the other two
  endpoints. `getAllFacultyDuties` was deliberately left untouched (different feature, not
  implicated in the report).
- `checkIn()` now resets `duty_slots.status` back to `'scheduled'` when checking in on a slot
  whose persisted status is `'absent'` — fixes root cause #4. This is a new event overwriting
  a record, not a retroactive recalculation, so it does not conflict with the constitution's
  no-retroactive-recalc rule.
- `Badge.jsx`: `STATUS_LABELS.not_checked_in` corrected to `'Not checked in'` — fixes root
  cause #2.
- Frontend consumers switched from raw `slot_status` to the live `attendance_status` for
  attendance display/gating, now that it carries a real `'absent'` value:
  - `DashboardPage.jsx` (`TodaySessionCard`): top badge and the Check-In-button-vs-"Marked
    absent" gate both switched to `attendance_status`.
  - `AttendanceLivePage.jsx` (`FacultyCard`): border/badge/time-label logic simplified —
    dropped the `in_status === 'absent'` fallback that was only needed to work around root
    cause #1. Fixed the "Absent" stat pill, which was actually counting `not_checked_in`
    (mislabeled, same root cause #2 pattern); added a genuine "Not checked in" pill alongside
    a correctly-counted "Absent" pill.
  - `AdminDashboardPage.jsx`: same "Absent" stat mislabel fixed (was counting
    `not_checked_in`); added a real absent count/pill; the per-slot badge ternary in the
    "on duty today" list gained explicit `absent`/`upcoming` branches instead of collapsing
    everything non-checked-in into `not_checked_in`.
  - `AttendancePage.jsx` (faculty history, `AttendanceHistoryCard`): the top badge and the
    (now-redundant) duplicate inline badge were consolidated into one `attendance_status`
    badge, removing the possibility of the same card showing two disagreeing badges.
  - `DutySlotsPage.jsx` and `RecordViolationModal.jsx` deliberately left reading raw
    `slot.status` — that's the correct signal there (duty lifecycle / reassignment
    eligibility, not live attendance), and both now self-correct automatically once
    `checkIn()`'s self-heal (root cause #4 fix) runs.
- Added regression tests (`server/tests/attendance.test.mjs`): today-past-auto-checkout →
  `'absent'` without cron; strictly-past-day unchanged at `'not_checked_in'`; `getLive()`
  no longer mislabels a no-show row as `checked_in`; `checkIn()` self-heals `slot.status`
  from `'absent'`→`'scheduled'`; `checkIn()` leaves `slot.status` alone on an ordinary
  check-in. Updated `server/tests/duty-slots.test.mjs` for the new `settingsService`
  dependency in `getMonthSlots()` and added a test asserting the attached
  `attendance_status`.
- Verification: `npx vitest run` in `server/` → 12 files, 105 tests, all green (98 pre-existing
  + 7 new). `npx vite build` in `client/` → succeeds, no new errors (pre-existing chunk-size
  warning only).

## failed_or_blocked
- None. No live database/browser session was available in this environment, so this was
  verified via the existing mocked-Prisma test harness and a production client build, not a
  live UI walkthrough — same constraint noted in prior handoffs for this sandbox
  (`specs/003-admin-duty-timing-settings/handoff.md`).

## commands_run
```
npx vitest run                    # server/ — 12 files, 105 tests, all passed
npx vite build                    # client/ — succeeded, pre-existing chunk-size warning only
```

## constraints_discovered
- `attendance.controller.js`'s `getLive()` and `getMySummary()` had independently
  hand-rolled, near-duplicate no-attendance status logic (`resolveNoAttendanceStatus` vs.
  a locally-scoped `resolveAttendanceStatus`) — they had already drifted apart (`getLive`'s
  copy was missing the `in_time`-presence check the other one had), which is exactly the
  failure mode CONSTITUTION.md's centralization principle (implicit in "never hardcode a
  time-of-day threshold... always read from system_config") is meant to prevent for shared
  business logic, not just literal constants.
- `duty_slots.status` only ever takes `{scheduled, completed, absent}` in practice — there is
  no persisted `'reassigned'` value; the `reassigned` Badge status seen in the UI is a
  synthetic client-side label (`wasReassignedToMe` in `DashboardPage.jsx`), not a slot-status
  read. Worth knowing before assuming `slot_status` needs a richer enum for reassignment
  display.
- The existing `attendance.test.mjs` test "marks a past slot with no attendance as
  not_checked_in, unconditionally" is a deliberate, load-bearing contract for history views —
  the new `'absent'` branch in the shared resolver was designed to not touch that path
  (only applies to *today's* slots past their own auto clock-out).

## deviations_from_constitution
- None. The `checkIn()` self-heal writes `duty_slots.status` in response to a new check-in
  event, not a retroactive batch recalculation of existing `duty_attendance` records —
  consistent with CONSTITUTION.md §4 Duty Attendance's "never retroactively recalculated"
  rule, which is about not silently rewriting history when settings change, not about
  refusing a faculty member's own live check-in action.

## files_touched
- `server/services/attendance-status.service.js` (new)
- `server/controllers/attendance.controller.js` (edited — `getLive`, `getMySummary`,
  `checkIn`)
- `server/controllers/duty-slots.controller.js` (edited — `getMonthSlots`,
  new `attachAttendanceStatus` helper)
- `server/tests/attendance.test.mjs` (edited — 7 new tests)
- `server/tests/duty-slots.test.mjs` (edited — settings mock + new attendance_status test)
- `client/src/components/ui/Badge.jsx` (edited — `STATUS_LABELS.not_checked_in`)
- `client/src/pages/faculty/DashboardPage.jsx` (edited — `TodaySessionCard`)
- `client/src/pages/admin/AttendanceLivePage.jsx` (edited — `FacultyCard`, stat pills)
- `client/src/pages/admin/AdminDashboardPage.jsx` (edited — stat counts, badge ternary)
- `client/src/pages/faculty/AttendancePage.jsx` (edited — `AttendanceHistoryCard`)
- `specs/022-attendance-status-sync-fix/handoff.md` (this file)

## open_questions_for_owner
- This was verified statically (mocked tests + production build), not against a live
  Postgres + browser session (none reachable in this environment) — recommend a live
  walkthrough of the exact reported repro (narrow a session's window in Duty Timing
  Settings, let a slot go absent, widen the window again, confirm check-in now succeeds
  and every page agrees) before considering this fully closed.
- `getAllFacultyDuties` (the peer-visibility "All Faculty Duties" page) was intentionally
  left without a computed `attendance_status`, since it wasn't implicated in the report and
  is a different feature (peer duty visibility, not live attendance tracking). Flag if that
  page should also get one for consistency.
- None of the six original report points required schema changes — confirm that matches
  expectations, since the report's framing ("attendance workflow is not centrally managed")
  could be read as calling for a bigger architectural change than "add one shared resolver
  function and fix the bugs it exposes."
