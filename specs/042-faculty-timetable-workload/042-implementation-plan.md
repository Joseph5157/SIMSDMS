# Spec 042 — Implementation Plan

Status: **ready for owner review; no product code changed**  
Recommended delivery: small, independently reviewable pull requests against a dedicated feature branch  
Deployment: existing Railway web service, staging environment first

## 1. Delivery rules

- Verify the current remote `main` before starting; the reviewed baseline is `448c1b723073a746820a7c3d2e378ecff806f227`.
- Do not build on or merge the old open `005-duty-reassignment` pull request without separately reviewing its divergence.
- One milestone may use multiple small PRs when database, backend and UI review are clearer separately.
- Every milestone updates this folder's `handoff.md` using the repository template.
- Do not merge to production-connected `main` until the staging gate in `042-test-release-plan.md` passes.
- Use only synthetic timetable seed/test data in Git.

## 2. Milestone roadmap

| # | Milestone | Outcome | Risk |
| --- | --- | --- | --- |
| 0 | Governance and technical spike | Constitution aligned; transaction strategy proven | High |
| 1 | Academic data foundation | Additive schema, seed, Admin master APIs/UI | High |
| 2 | Faculty timetable read/create | Weekly view and Add Class working | High |
| 3 | Conflict engine | Transaction-safe faculty/batch/section/location blocking | High |
| 4 | Versioned changes | Edit one/future, Cancel Today, Delete Schedule | High |
| 5 | Workload | Exact-duration faculty summaries/detail | Medium |
| 6 | Administrator views | Read-only all-faculty timetable/workload | Medium |
| 7 | Hardening and staging | Full regression, responsive/accessibility, migration rehearsal | High |
| 8 | Production release | Controlled merge/deploy with post-deploy checks | Medium |

Telegram reminders and exports are backlog milestones, not Milestone 8 requirements.

## 3. Milestone 0 — Governance and transaction spike

### Tasks

- [ ] Re-read `CONSTITUTION.md`, current `main`, open PRs and recent migrations.
- [ ] Update `CONSTITUTION.md` with the approved module scope, permissions and business rules.
- [ ] Explicitly document the Super Admin timetable mutation exception.
- [ ] Confirm route/error/test conventions from current code.
- [ ] Build a disposable test proving concurrent overlap prevention using PostgreSQL.
- [ ] Decide between serializable transaction retry and advisory-lock strategy.
- [ ] Record any justified raw SQL boundary; Prisma remains the default for all other access.
- [ ] Confirm staging uses an isolated database and non-production credentials.

### Gate

Owner approves the Constitution change. A parallel integration test proves that two conflicting simultaneous saves cannot both commit.

## 4. Milestone 1 — Academic data foundation

### Database

- [ ] Add enums and academic master models from `042-data-model.md`.
- [ ] Add series/version/override/exclusion/audit models.
- [ ] Add User relations without changing existing role enum values.
- [ ] Generate migration; manually add required checks and null-safe indexes.
- [ ] Review migration SQL for locks/destructive statements.
- [ ] Add idempotent synthetic academic seeds.

### Backend

- [ ] Add academic Zod schemas.
- [ ] Add dependent-field read endpoints.
- [ ] Add Admin/Super Admin academic CRUD endpoints.
- [ ] Add faculty-subject eligibility management.
- [ ] Add exclusion management.
- [ ] Add existing Admin audit events for master-data changes.

### Frontend

- [ ] Build `/admin/academics` using existing management-page patterns.
- [ ] Implement hierarchy, sections/batches, subjects/activities, locations and faculty-subject allocation.
- [ ] Prevent deactivation without clear impact messaging.
- [ ] Verify at 360/390/412/768/1440 px and in light/dark mode.

### Gate

Admin can configure a complete synthetic B.Pharm and Pharm.D hierarchy. Faculty can retrieve only their eligible subjects. Existing Student data is unchanged.

## 5. Milestone 2 — Faculty weekly timetable and Add Class

### Backend

- [ ] Implement one shared `Asia/Kolkata` date/time helper.
- [ ] Implement bounded occurrence resolver.
- [ ] Add `GET /timetable/mine`.
- [ ] Add faculty-only `POST /timetable` with all activity/hierarchy validation.
- [ ] Create series, first version and audit log in one transaction.

### Frontend

- [ ] Add route and constants for `/faculty/timetable`.
- [ ] Add sidebar item and faculty dashboard quick action.
- [ ] Build Monday–Saturday weekly navigation.
- [ ] Build mobile chronological day cards and desktop weekly layout.
- [ ] Build Add Class in `ResponsiveSheet`.
- [ ] Implement dependent-field clearing and server error mapping.
- [ ] Preserve current four mobile bottom tabs.

### Gate

A faculty user can create and view valid Theory, Tutorial, Practical, Library, Sports and Pharm.D Year 6 Internship Duty entries. Every activity rule from `042-spec.md` has a passing API test.

## 6. Milestone 3 — Conflict engine

### Tasks

- [ ] Implement `[start, end)` overlap helper with boundary tests.
- [ ] Detect same-faculty overlap.
- [ ] Detect same-location overlap.
- [ ] Detect same-batch overlap.
- [ ] Detect whole-section against whole-section and any batch.
- [ ] Allow different batches in parallel only with different faculty and location.
- [ ] Apply chosen transaction guard and bounded retry policy.
- [ ] Return privacy-safe structured `409` errors.
- [ ] Add friendly inline conflict Alerts in Add/Edit Class.

### Gate

All conflict matrix cases pass, including a real parallel-request database test. A back-to-back boundary succeeds.

## 7. Milestone 4 — Versioned changes and history

### Tasks

- [ ] Add series detail/history endpoints.
- [ ] Add occurrence edit as a complete snapshot override.
- [ ] Add all-future edit as version split.
- [ ] Add Cancel Today.
- [ ] Add Delete Schedule as future stop.
- [ ] Add stale-version protection.
- [ ] Reuse conflict engine for every modified occurrence/effective range.
- [ ] Add action menu and scope confirmation UI.
- [ ] Add clear destructive copy explaining preserved history.
- [ ] Add faculty history view.

### Gate

Past occurrence output remains byte-for-byte equivalent after future edits/stops, apart from response metadata intentionally added by the new action. Cancelled occurrences are absent from normal weekly/workload output but visible in history.

## 8. Milestone 5 — Faculty workload

### Tasks

- [ ] Build shared workload service on top of the occurrence resolver.
- [ ] Add faculty summary and paginated detail endpoints.
- [ ] Add today/week/custom-range presentation.
- [ ] Add activity and subject/duty breakdowns.
- [ ] Add Scheduled/Completed/Upcoming groupings.
- [ ] Add schedule-based disclaimer.
- [ ] Test exclusion/cancellation/version boundaries and minute totals.

### Gate

For a fixed fixture, API totals equal a hand-calculated minute ledger. No category or batch multiplier appears in code or output.

## 9. Milestone 6 — Administrator read-only views

### Tasks

- [ ] Add filtered `/timetable/admin` API.
- [ ] Add administrator workload summary/detail APIs.
- [ ] Add `/admin/timetable` route and navigation.
- [ ] Build faculty/programme/year/semester/section/activity/date filters.
- [ ] Reuse responsive timetable/workload display components where authorization permits.
- [ ] Ensure no timetable mutation control is rendered.
- [ ] Add API authorization tests proving Admin/Super Admin timetable mutations return 403/route unavailable.

### Gate

Admin/Super Admin can inspect all synthetic schedules and totals but cannot mutate any faculty series through UI or API.

## 10. Milestone 7 — Hardening and staging

### Tasks

- [ ] Run Prisma validation/generation and migration rehearsal from a production-like snapshot with scrubbed data.
- [ ] Run all server unit/integration tests.
- [ ] Run all client tests, lint and production build.
- [ ] Run the repository's full Playwright suite.
- [ ] Add timetable Playwright journeys from `042-test-release-plan.md`.
- [ ] Verify 360/390/412/639/640/641/767/768/1440 viewports.
- [ ] Verify keyboard, focus return, labels, status-by-more-than-color and dark mode.
- [ ] Verify existing Duty/Attendance/Violations/Messages/Reports flows.
- [ ] Measure administrative 366-day workload and 8-week timetable queries.
- [ ] Verify backup and rollback steps.
- [ ] Complete faculty/Admin UAT with synthetic or approved staging data.

### Gate

Every required test gate passes in staging. Migration and rollback are rehearsed. Product owner explicitly approves production release.

## 11. Milestone 8 — Production release

### Tasks

- [ ] Take/verify Railway database backup.
- [ ] Confirm migration is additive and matches the staged artifact.
- [ ] Merge approved PRs to `main` in the planned order.
- [ ] Observe Railway migration/build/start logs.
- [ ] Check `/health`, login and one read-only smoke path.
- [ ] Create/verify production academic masters before enabling faculty usage.
- [ ] Run faculty create/edit/cancel/delete smoke with an approved test account and clean up through supported behavior.
- [ ] Monitor errors, conflict rates, query latency and existing cron health.
- [ ] Update README/API/schema docs and close handoff.

### Gate

Post-deploy smoke and monitoring are clean, existing modules work, and the owner opens the module to faculty.

## 12. Recommended PR boundaries

1. `042-0-constitution-and-conflict-spike`
2. `042-1-academic-schema-and-api`
3. `042-1-academic-admin-ui`
4. `042-2-faculty-timetable-create-read`
5. `042-3-conflict-engine`
6. `042-4-versioned-changes`
7. `042-5-workload`
8. `042-6-admin-readonly-views`
9. `042-7-staging-hardening`

Do not combine all module work into one large PR.

## 13. Definition of done

- Product acceptance criteria in `042-spec.md` pass.
- API behavior matches `042-api-contract.md`.
- Schema and constraints match `042-data-model.md`.
- Required tests and release gates in `042-test-release-plan.md` pass.
- Constitution, README, API/schema documentation and `handoff.md` are current.
- No deferred item is silently shipped: Telegram, worker service, exports and mobile bottom-tab replacement remain out of scope unless separately approved.

## 14. Deferred backlog

### Telegram reminders

Only after separate approval:

- 8:30 AM `Asia/Kolkata` daily summary;
- 15-minute pre-start reminders;
- dedicated Railway worker entry point;
- database-backed notification idempotency/claiming;
- reconciliation after edits, cancellations and exclusions.

### Exports

Only after on-screen totals are accepted:

- PDF/Excel reports mirroring active filters;
- exact occurrence detail, totals and disclaimer;
- permission parity with on-screen data.

