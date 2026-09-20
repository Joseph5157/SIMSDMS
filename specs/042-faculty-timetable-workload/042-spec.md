# Spec 042 — Faculty Timetable and Workload Product Specification

Status: **planning complete; implementation not started**  
Product owner decisions captured through: 2026-09-20  
Companion documents: [`README.md`](README.md), [`042-architecture.md`](042-architecture.md), [`042-data-model.md`](042-data-model.md), [`042-api-contract.md`](042-api-contract.md), [`042-implementation-plan.md`](042-implementation-plan.md), [`042-test-release-plan.md`](042-test-release-plan.md)

## 1. Purpose

Add a mobile-first Faculty Timetable and Workload module to SIMSDMS. Faculty record their own recurring classes after subject allocation has already happened offline. The system shows an accurate Monday–Saturday timetable, prevents resource clashes, preserves change history and calculates workload from actual scheduled duration.

The feature extends the current SIMSDMS application. It is not a separate product and does not replace the duty, attendance, violation or reporting modules.

## 2. Product principles

1. **Faculty ownership:** a faculty member creates and maintains only their own timetable.
2. **Administrative visibility:** Admin and Super Admin can manage academic master data and view all faculty timetables/workloads, but cannot alter faculty-owned schedule entries.
3. **History over mutation:** edits never rewrite historical occurrences.
4. **Real duration:** workload is based on the exact scheduled start/end time, with no category or batch multiplier.
5. **Mobile first:** the faculty workflow must be usable at 360 px without horizontal scrolling or desktop-only interactions.
6. **One system:** reuse existing SIMSDMS authentication, roles, UI primitives, audit infrastructure, API conventions and Railway deployment.

## 3. Actors and permissions

There are no new roles.

| Capability | Faculty | Admin | Super Admin |
| --- | ---: | ---: | ---: |
| View own timetable and workload | Yes | N/A | N/A |
| Create own timetable series | Yes | No | No |
| Edit/cancel/delete own timetable series | Yes | No | No |
| View all faculty timetables/workloads | No | Yes | Yes |
| Manage academic master data | No | Yes | Yes |
| View timetable audit/history | Own entries | Yes | Yes |
| Hard-delete timetable history | No | No | No in this module |

The final row is an intentional module-specific exception to the current broad Super Admin wording. Historical timetable records are immutable evidence and must remain recoverable. `CONSTITUTION.md` must be amended before implementation.

## 4. Scope

### 4.1 Included in the first release

- Academic hierarchy for B.Pharm and Pharm.D.
- Sections, custom batches, subjects, permitted subject activities and classroom/location records.
- Faculty-to-subject availability established by Admin from offline allocation data.
- Faculty weekly timetable, Monday through Saturday.
- Add Class workflow with dependent fields.
- Recurring schedules with effective dates.
- Conflict detection for faculty, section/batch and location.
- Edit this class, edit all future classes, Cancel Today and Delete Schedule.
- Occurrence history and audit trail.
- Exact-duration workload summaries and detail.
- Admin/Super Admin read-only timetable and workload views.
- Academic holidays/vacations/exam exclusions used by timetable occurrences and workload.
- Responsive, accessible light/dark-mode UI using the existing SIMSDMS design system.

### 4.2 Explicitly outside the first release

- Telegram timetable summaries or class reminders.
- A background timetable worker or second Railway service.
- PDF/Excel timetable or workload export.
- Attendance, delivery or classroom-presence verification.
- Approval of faculty entries by Admin.
- Automatic subject allocation.
- Student-level timetable views.
- Pharmacy Coordinator, Practice School or any new role.
- Changes to the four pinned mobile bottom navigation tabs without a separate owner decision.

## 5. Academic structure

### 5.1 Hierarchy

Admin/Super Admin maintain:

`Department → Programme → Year → Semester (B.Pharm only) → Section → Subject → Activity availability → Batch`

Classroom/Location is a separate reusable master.

### 5.2 Programme rules

| Programme | Years | Semester behavior | Special rule |
| --- | ---: | --- | --- |
| B.Pharm | 4 | Semesters I–VIII; exactly two per year | Semester is required |
| Pharm.D | 6 | No semester selection | Sixth year permits Internship Duty |

For Pharm.D, the semester field must not be shown and must not be accepted by the API.

### 5.3 Subject allocation boundary

Subject allocation happens offline. Admin records which active faculty can use which active subjects. This is an availability/eligibility list, not a timetable assignment and not an approval workflow.

Faculty may select only subjects made available to them and matching the chosen programme/year/semester.

## 6. Activity rules

| Activity | Subject | Audience | Batch | Other requirement |
| --- | --- | --- | --- | --- |
| Theory | Required | Whole section | None | Subject must permit Theory |
| Tutorial | Required | Whole section | None | Subject must permit Tutorial |
| Practical | Required | One batch | Exactly one | Subject must permit Practical |
| Library | Optional | One batch | Exactly one | Subject, when present, must permit Library |
| Sports | None | One batch | Exactly one | Subject ID is rejected |
| Internship Duty | None | Pharm.D Year 6 | None | Duty name is required |

These rules supersede earlier drafts that allowed multiple batches in one entry. A Practical, Library or Sports entry targets exactly one batch. Faculty create separate entries when more than one batch needs the activity.

## 7. Add Class workflow

### 7.1 Entry point

Faculty open `/faculty/timetable` and choose **Add Class**. On mobile the form opens in the existing `ResponsiveSheet`; on desktop it uses the established responsive modal/sheet pattern.

### 7.2 Field order

1. Programme
2. Year
3. Semester, only for B.Pharm
4. Section
5. Subject, according to activity rule
6. Activity
7. Batch, when required
8. Day, Monday–Saturday
9. Start time
10. End time
11. Classroom/Location
12. Effective-from date

Internship Duty replaces Subject with a required duty name.

### 7.3 Dependent-field behavior

Changing an upstream field clears any incompatible downstream value. Examples:

- changing Programme clears Year, Semester, Section, Subject, Activity and Batch;
- changing Year clears Semester, Section, Subject, Activity and Batch;
- changing Activity clears Subject or Batch when the new rule makes it invalid;
- selecting Sports clears Subject;
- selecting Pharm.D clears Semester.

The server repeats all validation; client behavior is guidance, not a security boundary.

### 7.4 Time rules

- Day must be Monday–Saturday.
- Start and end use local college time in `Asia/Kolkata`.
- End time must be after start time.
- Exact duration is `end - start`.
- Back-to-back entries are allowed because intervals use `[start, end)` semantics.
- Overnight entries are not allowed.

## 8. Weekly timetable

### 8.1 Faculty view

The default view opens to the current week and shows Monday–Saturday. It provides:

- previous/current/next week controls;
- a compact day selector on mobile;
- per-day chronological cards on mobile;
- a weekly grid or equivalent scan-friendly layout on desktop;
- Add Class;
- activity, subject/duty name, programme/year/semester/section, batch, time and location;
- status labels for Scheduled, Completed and Cancelled;
- actions available only on owned entries.

`Scheduled` and `Completed` are computed from occurrence end time; this is schedule status, not proof that a class was delivered.

### 8.2 Administrator view

Admin/Super Admin can filter by faculty, programme, year, semester, section, activity and week. The view is read-only. It contains no create, edit, cancel or delete schedule action.

## 9. Recurrence and change behavior

### 9.1 Recurring series

A new class creates a weekly series on the selected weekday from `effective_from` until explicitly stopped. A series can have multiple effective-dated versions.

### 9.2 Edit this class only

The faculty selects an occurrence date and chooses **This class only**. The system stores a date-specific override. The recurring version and other occurrences do not change.

Allowed changes follow the same activity, ownership and conflict rules as creation.

### 9.3 Edit all future classes

The faculty selects an occurrence date and chooses **All future classes**. The current version ends immediately before that occurrence. A new version starts on that occurrence date with the changed values. Past occurrences retain the old version.

### 9.4 Cancel Today

Cancel Today suppresses one occurrence and preserves the series. The cancellation stores actor, timestamp, date and an optional reason. The occurrence is excluded from workload totals but remains visible in history as Cancelled.

### 9.5 Delete Schedule

Delete Schedule is a soft stop, not physical deletion. It ends the active version before the chosen effective occurrence. Past occurrences and audit data remain available. Future occurrences disappear.

## 10. Calendar exclusions

Admin/Super Admin can define date or date-range exclusions such as holidays, vacations and examinations. An exclusion may apply globally or to a programme/year/semester/section scope.

- Excluded occurrences do not count toward workload.
- Exclusions do not delete timetable versions.
- A date-specific faculty override cannot reinstate an administratively excluded day in the first release.
- The new academic exclusion model is separate from the existing duty `CalendarConfig`; the two domains must not be overloaded.

## 11. Conflict rules

Conflicts are checked for every affected occurrence in the requested effective range. A save is rejected when intervals overlap and any of the following is true:

1. the same faculty is scheduled twice;
2. the same classroom/location is used twice;
3. the same batch is scheduled twice;
4. a whole-section activity overlaps any activity for any batch in that section;
5. any batch activity overlaps a whole-section activity in that section;
6. two whole-section activities overlap in the same section.

Parallel batch activities are allowed only when the batches differ and faculty/location do not conflict. Back-to-back entries are not overlaps.

The database write and conflict check must run in one transaction with protection against two concurrent successful saves. Client-side prechecks may improve feedback but are not authoritative.

The conflict response identifies the resource type and conflicting entry without revealing information outside the current user's authorization.

## 12. Workload

### 12.1 Calculation

For each valid occurrence:

`duration_minutes = end_minutes - start_minutes`

Totals are the sum of occurrence duration. There are:

- no activity multipliers;
- no batch multipliers;
- no special weighting for Theory, Practical, Tutorial, Library, Sports or Internship Duty.

### 12.2 Inclusion rules

Include generated occurrences inside the requested date range, using the version effective on that date and any occurrence override.

Exclude:

- Cancelled occurrences;
- calendar-excluded dates;
- occurrences after the series stop date;
- inactive/deleted academic master combinations that were never valid for that effective date.

### 12.3 Faculty presentation

Faculty can view:

- today and current-week summary;
- selected date-range total hours/minutes;
- Scheduled, Completed and Upcoming groupings;
- breakdown by activity and subject/duty;
- occurrence detail.

### 12.4 Administrator presentation

Admin/Super Admin can view the same calculation across all faculty with filters. They cannot change underlying timetable entries from the workload screen.

Every workload view includes the disclaimer: **Schedule-based workload; this does not verify attendance or class delivery.**

## 13. Audit and history

Every timetable mutation records:

- actor user ID and role;
- action (`created`, `occurrence_edited`, `future_edited`, `occurrence_cancelled`, `series_stopped`);
- series/version/override identifiers;
- affected occurrence/effective date;
- before and after values where applicable;
- timestamp;
- optional reason.

Audit history is append-only. API logs must not contain passwords, JWTs, CSRF values or sensitive cookie headers.

## 14. UI and accessibility requirements

- Reuse `Layout`, `PageHeader`, `ResponsiveSheet`, `AppButton`, form primitives, Alerts, Toasts and established loading/empty/error states.
- Use Public Sans, existing SIMSDMS brand tokens and Tabler icons.
- Support light and dark mode without one-off palette values.
- Use the repository's unified 768 px shell breakpoint.
- All interactive controls meet the existing 44 px minimum target.
- Keyboard focus returns to the triggering control after closing sheets/dialogs.
- Errors are text, not color-only.
- Mobile content is readable at 360/390/412 px without horizontal page overflow.
- The first release adds Timetable to the faculty sidebar and dashboard quick actions. It does not replace an existing pinned bottom tab without owner approval.

## 15. Security and privacy

- All routes require the existing authenticated session.
- Mutations require the existing CSRF contract.
- Faculty ownership is enforced server-side from `req.user.id`; a client-supplied faculty ID is never trusted for faculty mutations.
- Admin/Super Admin reads are role-gated.
- Master-data mutations are Admin/Super Admin only.
- Zod validates every query, path and request body.
- Standard API rate limiting applies.
- Repository seeds and tests use synthetic people, subjects and schedules only.

## 16. Acceptance criteria

The first release is acceptable when all of the following are true:

1. A faculty member can create a valid Monday–Saturday recurring class using only eligible academic data.
2. B.Pharm requires the correct semester; Pharm.D never accepts a semester.
3. Practical, Library and Sports require exactly one batch; Tutorial and Theory are whole-section.
4. Sports rejects a subject; Library accepts an optional subject; Internship Duty is limited to Pharm.D Year 6.
5. Faculty, location, batch and whole-section conflicts are blocked, including concurrent-save races.
6. Parallel different-batch entries succeed only when faculty and location are also free.
7. The weekly view is usable at 360 px and on desktop.
8. Edit one occurrence does not modify other weeks.
9. Edit future creates a new effective version and preserves the past.
10. Cancel Today removes only one occurrence from workload.
11. Delete Schedule removes only future occurrences and preserves history.
12. Workload totals equal exact scheduled minutes after exclusions, with no multipliers.
13. Admin/Super Admin can filter and view all schedules/workload but cannot mutate faculty timetable data.
14. Existing duty, attendance, violation, messaging, report and authentication tests remain green.
15. The module passes the staging, migration, rollback and responsive checks in `042-test-release-plan.md`.

## 17. Superseded requirements

For this implementation, the decisions in this specification supersede earlier drafts in the source document or mockups where they differ, especially:

- one batch per Practical/Library/Sports entry, not multi-batch entries;
- Tutorial is whole-section;
- Admin/Super Admin timetable access is read-only;
- Telegram reminders are deferred;
- current SIMSDMS React/Express/Prisma architecture replaces the earlier Laravel/Inertia/Vue direction.

