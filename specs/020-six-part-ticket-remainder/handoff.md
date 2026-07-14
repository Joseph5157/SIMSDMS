# Handoff Report

## task_id
020-six-part-ticket-remainder — items ①②④⑤ of the six-part client ticket (items ③ and ⑥ were
already shipped/built; see specs/019-admin-override-recording and the reassignment-request flow).

## status
complete (build + code-level verification only — see failed_or_blocked for the live-verification gap)

## completed
- **⑤ "Not Checked In" / "Expired" → "Absent" relabel** (commit `f14bc0b`). Frontend display strings
  only; internal status values (`not_checked_in`, `expired` filter value) unchanged. Changed:
  `Badge.jsx` (`not_checked_in` label), Admin Dashboard today's-duty strip stat, Live Attendance
  stat pill + faculty-card time label, faculty Attendance summary/breakdown labels, Duty Slots
  status-filter label. Left the "Not checked in" prompt on the faculty today's-duty card (that
  faculty can still check in — not absent; the real absent case already reads "Marked absent").
- **④ Dedicated Flagged Violations page + nested-modal z-index fix** (commit `9046495`). New
  `client/src/pages/admin/FlaggedViolationsPage.jsx` at `/admin/flagged-violations` (nav item +
  route). Filters: Date / Course / Academic Year / Faculty / Violation Type + a Pending/Reviewed/All
  status select; columns S.No, Student, Reg No, Course, Type, Faculty, Duty Date, Recorded, Flag
  Note, Status; inline Mark-as-Reviewed + Delete. Both dashboard "Review all flagged violations"
  links now route here instead of Student Discipline Analytics. z-index fix: `FormModal` and
  `ConfirmDialog` gained an optional `zIndex` prop; the dashboard's nested resolve/delete dialogs now
  pass `300` (above the flagged-detail Modal's default 200); Toast layer raised 120→1000 so
  toasts are never hidden behind an open modal. Backend: `flaggedViolationsReport` now also selects
  `student.academic_year` for the year filter.
- **① All Faculty Duties page** (commit `13ca026`). New `client/src/pages/faculty/AllFacultyDutiesPage.jsx`
  at `/faculty/all-duties` (nav item + route). Read-only month view of every booked duty across all
  faculty: Faculty, Department, Duty Date, Session, Status, Original→Reassigned. Month nav +
  faculty/department search + session filter. New backend endpoint
  `GET /duty-slots/all/:year/:month` (all authenticated) returns every slot for the month via the
  existing `SLOT_SELECT` (faculty + latest reassignment already included). Kept `getMonthSlots`'s
  faculty self-scoping intact (other faculty pages depend on it). Polls every 30s.
- **② Individual Student Violation Report** (commit `bd177c9`). Second primary report card on the
  Admin Reports page: search student by name/reg (`/students/search`), pick, choose period
  (Daily/Weekly/Monthly/Yearly/Overall History), preview, download PDF or Excel. Reuses the existing
  `/reports/student-violations` endpoints scoped by `student_id` (already supported by
  `studentViolationWhere`) so exports carry the identical no-Fine column set. `useStudentViolations`
  now forwards a react-query options arg so the fetch is gated on a selected student (never pulls the
  all-students report).

## failed_or_blocked
- **No live/browser verification.** All four items verified via `npm run build` (client) + `node --check`
  (server) + close code reading only. Local Postgres has been unreachable in recent sessions, so the
  disposable-Postgres real-browser technique was not run this session. Worth a manual click-through:
  the flagged z-index (open dashboard flagged-detail modal → Mark as Reviewed → confirm must sit on
  top; toast must show above it), the new All Faculty Duties endpoint returning all faculty for a
  faculty login, and the Individual Student Report PDF/Excel content for a picked student.

## commands_run
```
cd client && npm run build            # ran after each item — all passed
cd server && node --check controllers/reports.controller.js
cd server && node --check controllers/duty-slots.controller.js routes/duty-slots.routes.js
git add <explicit files per commit> && git commit   # 4 commits, see task_id
```

## constraints_discovered
- `getMonthSlots` (`GET /duty-slots/:year/:month`) self-scopes to the caller when role === faculty, so
  it can't power an all-faculty view — a separate unscoped endpoint was required.
- `useStudentViolations` had no `enabled` gate; passing a null param still fetched ALL student
  violations. Fixed by forwarding a react-query options arg. The daily/weekly report hooks were
  already `enabled`-gated on their dates.
- Toast layer was at z-index 120 — below Mantine's default modal z-index (200) — so any toast fired
  while a raw Modal was open was already hidden behind it (not just the nested case). Raising to 1000
  fixes this globally.
- `STUDENT_VIOLATION_EXPORT_COLUMNS` already excludes Fine and matches the ticket's column list
  exactly; admin slot-less records fall back to `created_at` for the Duty Date column.

## deviations_from_constitution
None. Delete on flagged violations reuses the existing soft-delete `useDeleteViolation` flow.

## files_touched
- server/controllers/reports.controller.js (academic_year in flagged select)
- server/controllers/duty-slots.controller.js (getAllFacultyDuties + export)
- server/routes/duty-slots.routes.js (GET /duty-slots/all/:year/:month)
- client/src/pages/admin/FlaggedViolationsPage.jsx (new)
- client/src/pages/faculty/AllFacultyDutiesPage.jsx (new)
- client/src/pages/admin/ReportsPage.jsx (IndividualStudentReportCard)
- client/src/pages/admin/ViolationsPage.jsx (ResolveFlagModal zIndex prop)
- client/src/pages/admin/AdminDashboardPage.jsx (relabel + reroute + zIndex on nested modals)
- client/src/pages/admin/AttendanceLivePage.jsx, DutySlotsPage.jsx, faculty/AttendancePage.jsx (relabel)
- client/src/components/ui/{Badge,FormModal,ConfirmDialog,Toast}.jsx
- client/src/components/Layout.jsx (nav items), client/src/App.jsx (routes), client/src/utils/constants.js (routes)
- client/src/hooks/{useDutySlots,useReports}.js

## open_questions_for_owner
- Confirm the "Absent" relabel should NOT touch the faculty today's-duty "Not checked in" prompt
  (kept as-is because that faculty can still check in). If they want it worded differently there, say so.
- Individual Student Report and All Faculty Duties were not spec'd as separate feature folders; this
  batch handoff covers all four. Say if you want per-feature spec docs generated.
- Deploy: commits are on `005-duty-reassignment` (Railway auto-deploys this branch). Not pushed yet
  this session — push when ready; the flagged report's `academic_year` select needs no migration.
