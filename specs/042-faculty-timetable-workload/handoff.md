# Handoff Report

## task_id
042-faculty-timetable-workload / Integration planning pack

## status
complete

## completed
- Reviewed the supplied Faculty Timetable and Workload requirements and the owner's corrected decisions.
- Reviewed the current `Joseph5157/SIMSDMS` repository architecture and spec conventions at `main` baseline `448c1b723073a746820a7c3d2e378ecff806f227`.
- Chose integration into the existing React/Vite, Express, Prisma/PostgreSQL Railway monolith.
- Recorded one existing Railway web service for the first release; a separate worker is deferred to a later, approved reminders phase.
- Defined faculty ownership, administrator read-only timetable access, academic masters, activity/batch rules, recurrence/versioning, conflicts, workload and UI acceptance criteria.
- Defined proposed data entities, REST APIs, authorization boundaries and transaction requirements.
- Defined milestone sequencing, PR boundaries, staging gates, regression tests and rollback behavior.
- Created the Spec 042 documentation pack under `specs/042-faculty-timetable-workload/`.

## failed_or_blocked
- Product implementation has not started; this task was planning only.
- Implementation is gated on an owner-approved `CONSTITUTION.md` amendment because the approved faculty-owned/read-only-admin timetable rule conflicts with the current broad Super Admin wording.

## commands_run
```bash
rg --files specs/042-faculty-timetable-workload | sort
wc -l specs/042-faculty-timetable-workload/*.md
rg -n "TBD|TODO|FIXME|Laravel|Telegram|Super Admin|one batch|single" specs/042-faculty-timetable-workload/*.md
rg -n "\[[^]]+\]\([^)]+\.md\)" specs/042-faculty-timetable-workload/*.md
```

## constraints_discovered
- The repository Constitution locks React/Vite, Express, Prisma/PostgreSQL, REST, Railway and a monolithic single-deploy architecture.
- The application has exactly three roles: `super_admin`, `admin`, `faculty`; Spec 042 adds no role.
- Existing `User.department` and Student course/year/semester fields are free-form/legacy and should not be reused as the normalized academic timetable hierarchy.
- `server/index.js` starts cron jobs; duplicating the entire web service later could duplicate job execution.
- The mobile shell has four pinned role-specific tabs and a unified 768 px breakpoint. The plan keeps the four tabs unchanged pending a separate owner decision.
- The repository uses a required `handoff.md` format for feature work.

## deviations_from_constitution
- Planning proposes a module-specific exception to Super Admin's current unrestricted-access wording: Admin and Super Admin may view all faculty timetables but may not mutate faculty-owned schedule entries. This deviation must be resolved by amending the Constitution before implementation.
- No code or dependency deviation was made in this planning task.

## files_touched
- `specs/042-faculty-timetable-workload/README.md`
- `specs/042-faculty-timetable-workload/042-spec.md`
- `specs/042-faculty-timetable-workload/042-architecture.md`
- `specs/042-faculty-timetable-workload/042-data-model.md`
- `specs/042-faculty-timetable-workload/042-api-contract.md`
- `specs/042-faculty-timetable-workload/042-implementation-plan.md`
- `specs/042-faculty-timetable-workload/042-test-release-plan.md`
- `specs/042-faculty-timetable-workload/handoff.md`

## open_questions_for_owner
- None required to approve this plan. The first implementation approval should explicitly authorize Milestone 0's Constitution amendment and transaction spike.
