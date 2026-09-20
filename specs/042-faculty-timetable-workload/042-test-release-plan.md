# Spec 042 — Test and Release Plan

Status: **required verification plan**

## 1. Risk assessment

| Area | Risk | Reason |
| --- | --- | --- |
| Constitution/authorization | High | Approved timetable ownership differs from broad existing Super Admin language |
| Additive academic schema | High | Many related masters and database constraints |
| Recurrence/versioning | High | Incorrect boundaries can rewrite history or miscount workload |
| Conflict concurrency | High | A read-then-write race can allow double booking |
| Workload totals | Medium | Derived output but operationally important |
| Responsive UI | Medium | Mobile is the primary faculty surface |
| Admin read-only views | Medium | Broad data visibility; mutation must remain impossible |
| Single-service deployment | Low | Matches the existing architecture |
| Existing cron jobs | Medium | Must remain single-start and unaffected by this module |

## 2. Automated test layers

### 2.1 Pure unit tests

Required for:

- time parsing and minutes conversion;
- `[start, end)` overlap boundaries;
- B.Pharm/Pharm.D hierarchy rules;
- activity/subject/batch matrix;
- occurrence date generation Monday–Saturday;
- effective version selection;
- override/exclusion resolution;
- schedule status at start/end boundaries;
- duration and workload aggregation;
- privacy-safe conflict error mapping.

### 2.2 API integration tests

Use a real test PostgreSQL database for transaction and constraint behavior.

Required groups:

- academic CRUD authorization and validation;
- faculty subject eligibility;
- create each activity type;
- reject each invalid activity combination;
- owner isolation across two faculty users;
- Admin/Super Admin read access;
- Admin/Super Admin mutation denial;
- edit-one snapshot behavior;
- edit-future version split;
- cancellation and series stop;
- exclusions at global and scoped levels;
- audit event creation in the same transaction;
- transaction rollback when audit/write fails;
- maximum date range/pagination validation.

### 2.3 Concurrency tests

Launch requests simultaneously against the same database.

| Case | Expected result |
| --- | --- |
| Same faculty, overlapping times | One success, one `409` |
| Different faculty, same location | One success, one `409` |
| Different faculty, same batch | One success, one `409` |
| Whole section vs one batch | One success, one `409` |
| Different batches, different faculty/location | Both succeed |
| Back-to-back entries | Both succeed |

The test must exercise the selected PostgreSQL transaction strategy, not a mocked service.

### 2.4 Client tests

Required component/behavior coverage:

- dependent fields clear on upstream change;
- Pharm.D hides/removes Semester;
- activity changes enforce subject/batch fields;
- one batch only for Practical/Library/Sports;
- sheet focus return;
- pending submission prevents duplicate click;
- conflict response appears as actionable text;
- Admin timetable does not render mutation controls;
- weekly empty/loading/error/populated states;
- workload disclaimer always rendered with totals.

## 3. Playwright journeys

Run with separate Faculty and Admin/Super Admin fixtures.

### Faculty happy path

1. Log in as synthetic faculty.
2. Open Timetable.
3. Add a B.Pharm Theory class.
4. Add a Practical for one batch.
5. Verify weekly order and details.
6. Edit one future occurrence.
7. Edit all later occurrences.
8. Cancel one date.
9. Stop the future schedule.
10. Verify workload minutes and history.

### Validation/conflict path

1. Attempt Pharm.D with semester.
2. Attempt Practical without batch.
3. Attempt Sports with subject.
4. Attempt subject/activity not allocated.
5. Create faculty overlap.
6. Create location overlap.
7. Create whole-section/batch overlap.
8. Verify different-batch parallel success.

### Administrator path

1. Log in as Admin.
2. Create/edit/deactivate academic masters.
3. Allocate a subject to faculty.
4. Open the read-only all-faculty timetable.
5. Filter by faculty/programme/section/activity/week.
6. Open workload summary/detail.
7. Verify no timetable mutation control.
8. Directly attempt a faculty mutation endpoint and receive denial.

### Regression smoke

- Login/password change/session expiry.
- Faculty dashboard.
- Duty slot view/pick in an allowed test fixture.
- Attendance view.
- Violation page.
- Messages.
- Admin dashboard and reports.
- Existing cron process starts once.

## 4. Responsive and visual matrix

| Width | Required checks |
| ---: | --- |
| 360 | Add/Edit sheet, day cards, actions, no page overflow |
| 390 | Primary mobile acceptance |
| 412 | Wider phone behavior |
| 639/640/641 | Sheet/dialog and intermediate layout boundary |
| 767/768 | Existing unified shell breakpoint |
| 1440 | Desktop weekly/admin layouts |

At every applicable width verify:

- light and dark mode;
- long subject/location names;
- empty, loading, error and conflict states;
- visible focus and keyboard navigation;
- 44 px interactive targets;
- no color-only status;
- correct bottom-bar/content clearance.

## 5. Workload fixture ledger

Create a fixed test month containing:

- Theory: 60 minutes weekly;
- Practical: 120 minutes weekly for one batch;
- parallel Practical for a second batch by a different faculty;
- one occurrence edit with changed duration;
- one cancellation;
- one global holiday;
- one section-specific exam exclusion;
- one future version change;
- one stopped series.

Check expected minutes by hand in a committed test fixture/comment. Assert:

- no batch multiplication;
- no activity weighting;
- cancellation/exclusions contribute zero;
- parallel entries count independently for their respective faculty;
- completed/scheduled/upcoming partitions sum to total valid minutes.

## 6. Performance checks

Use staging-like volumes larger than the real system:

- 100 faculty;
- 3 academic years;
- 50 recurring series per faculty;
- overrides/exclusions across one year.

Targets are diagnostic, not premature SLAs:

- faculty one-week timetable p95 under 500 ms on staging;
- admin eight-week filtered timetable p95 under 1.5 s;
- one-faculty 366-day workload p95 under 1.5 s;
- no unbounded result or N+1 query pattern.

If targets fail, inspect query plans/indexes before adding caches or materialized tables.

## 7. Migration rehearsal

1. Restore a scrubbed production-like backup into staging.
2. Record existing row counts and health checks.
3. Run the exact production build/migration command.
4. Confirm migrations are additive and Prisma client matches.
5. Run all old and new tests.
6. Create/edit/cancel/stop representative schedules.
7. Restart the service and repeat reads.
8. Exercise rollback procedure.
9. Restore forward and rerun smoke tests.

Never test destructive rollback steps against production.

## 8. Railway release topology

First release:

- one SIMSDMS web service;
- one database per environment;
- staging and production separated;
- no timetable worker;
- no Telegram timetable variables.

Before staging, verify its prior database-credential and Telegram-variable issues are corrected. Staging must not point at production PostgreSQL or reuse production bot credentials.

## 9. Production release gate

All boxes must be checked:

- [ ] Constitution amendment approved.
- [ ] Migration SQL reviewed.
- [ ] Staging backup/restore and migration rehearsal passed.
- [ ] Server unit/integration tests passed.
- [ ] Client tests/lint/build passed.
- [ ] Full existing Playwright suite passed.
- [ ] New timetable Playwright journeys passed.
- [ ] Parallel database conflict tests passed.
- [ ] Responsive/dark/accessibility review passed.
- [ ] Admin mutation denial verified.
- [ ] Workload ledger matched exact minutes.
- [ ] Existing cron behavior verified once per web service.
- [ ] Product owner approved release.

## 10. Rollback plan

### Application rollback

1. Stop faculty access to the module through the prior application deploy/route removal.
2. Redeploy the previous known-good application version.
3. Verify login and existing core modules.
4. Preserve newly written timetable rows while assessing forward fix; the old app does not reference them.

### Database rollback

Because the first migration is additive, prefer leaving unused tables in place during an application rollback. Drop or restore database structures only when:

- a backup is verified;
- the exact affected tables/constraints are identified;
- any production timetable records are exported/preserved;
- the owner approves the destructive database action.

No automated production down-migration should delete timetable history.

## 11. Post-deploy monitoring

For at least the first operational week, review:

- API 4xx/5xx rates by timetable endpoint;
- conflict distribution;
- transaction retry/exhaustion counts;
- p95 timetable/workload latency;
- Railway CPU/memory/database connection use;
- errors in existing auth/duty/attendance/violation paths;
- cron start/duplicate evidence;
- faculty feedback at 360–412 px.

Do not enable deferred reminders or exports during this stabilization window.

