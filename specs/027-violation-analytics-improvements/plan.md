# Plan — Analytics Dashboard: Configurable Threshold, Course-Aware Year Chart, Pagination + PDF Export

Source: external findings doc reporting 7 issues on the admin Student Violations analytics
dashboard (`client/src/pages/admin/ViolationsPage.jsx` + `server/controllers/analytics.controller.js`,
the `/api/analytics/*` system — distinct from the unrelated `ReportsPage.jsx`/`reports.controller.js`).
All 7 findings were verified true against the live code before implementation.

Now implemented — see `handoff.md` for exactly what changed and how it was verified. This file
records the design as built, for future reference.

## Decisions made before implementation

- **Counselling threshold semantics**: inclusive (`>=`), matching the findings doc's literal
  wording ("2 or more violations"), not the prior strictly-greater (`>`) comparison. Default
  seeded at **4** so production output is unchanged at cutover (old `>3` = new `>=4`).
- **Year ranges**: the codebase has **3 courses** (`b_pharm`, `pharm_d`, `m_pharm`), not 2 as the
  findings doc assumed, and no dev DB was reachable to verify real data. User-confirmed ranges:
  B.Pharm 1–4, Pharm.D 1–6, M.Pharm 1–2 — all three included as chart series, and the same ranges
  now enforced at student-upload validation (previously a flat 1–6 for every course).
- **Filter sync**: `trend` (Violation Trend) intentionally skips the date-range filter by design
  (pre-existing, documented in `analytics.controller.js`) — left unchanged, to be reviewed
  separately.
- **Recorder filter on analytics**: confirmed genuinely absent from the analytics endpoints today
  (the Recorder dropdown on the page is scoped to the separate "All Records" table) — deferred to
  a future ticket, not built here.
- **Settings UI**: new dedicated page `/admin/violation-settings`, inline `Select` + Save button —
  lighter than the `DutyTimingSettingsPage` + `DutyTimingSettingsModal` pattern, since this is a
  single field rather than 12.

## Part A — Counselling threshold as an admin setting

Followed the `specs/003-admin-duty-timing-settings` precedent (`system_config` singleton +
dedicated route/controller/schema + `settingsService`), scaled to one field:
`system_config.repeat_violation_threshold` (Int, default 4) — new migration
`20260721000000_add_repeat_violation_threshold`. `server/{controllers,routes,schemas}/violation-settings.*`
mirror `duty-timing-settings.*` (no ordering-violation check needed, single field). `summary()` and
`computeRepeatViolators()` (`analytics.controller.js`) now read the threshold via
`settingsService.getSettings()` instead of `req.query.threshold ?? 3`; the query-string override
was removed from `analyticsQuery` entirely. Frontend: `client/src/hooks/useViolationSettings.js` +
`client/src/pages/admin/ViolationSettingsPage.jsx`, nav entry under Layout's "Discipline" group.

## Part B — Year chart course context + per-course year validation

`server/lib/academicStructure.js` is the new single source of truth for `COURSE_YEAR_RANGES` /
`COURSE_LABELS`, consumed by both `students.controller.js`'s bulk-upload row validator (replacing
its flat `year 1–6` check) and `GET /analytics/year-analysis`, which now groups by `(course, year)`
instead of year alone. The frontend "Violations by Year" chart pivots that into a grouped, legended
Mantine `BarChart` (one series per course) — never fabricating a bar for a course/year combo with
no data, so a single-course filter naturally shows only that course's bars.

## Part C — Counselling card pagination + PDF export

Pagination is client-side only (5/page), reusing the existing shared `client/src/components/ui/Pagination.jsx`
component — no backend change, since `computeRepeatViolators` already returns the full filtered
list. PDF export (`GET /analytics/export/counselling/pdf`) reuses `server/lib/pdf.js`'s
`buildReportPdf`/`sendPdf`, the same helper `reports.controller.js` already uses for its PDF
exports — new "⬇ PDF" button next to the existing "⬇ Excel" button, both carrying the same filters
and the now-configured (never query-param) threshold.

## Verification

`npx vitest run` (server, 207/207), `npm run lint` + `npm run build` (client, both clean). See
`handoff.md` for the full manual-verification checklist and exact commands run.
