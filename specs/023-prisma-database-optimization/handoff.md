# Handoff Report

## task_id
023-prisma-database-optimization / apply Prisma Database Optimization & Safety Review (SIMS_Prisma_Database_Optimization_Report.pdf)

## status
complete

## completed
- **Verified the report against the real codebase before applying anything** (not taken on
  faith): read the full `prisma/schema.prisma`, every relevant controller, and grepped for
  every hard-delete path. Confirmed the cascade findings (1.1/1.5) are real in the schema but
  currently dormant (nothing hard-deletes `DutySlot`/`DutyAttendance` — the generic hard-delete
  endpoint only permits `user`/`student`, both soft-deletes in practice); confirmed the
  approve/decline race (1.3) is live and serious, since `respondToRequestCore` is invoked from
  two independent entry points (the web PATCH endpoint and the Telegram inline Accept/Reject
  buttons, per `CONSTITUTION.md` §4 Notifications).
- **Schema changes** (`prisma/schema.prisma`):
  - `DutyReassignmentRequest.dutySlot` and `AttendanceAuditLog.attendance`: `onDelete: Cascade`
    → `Restrict`.
  - Added `ReassignmentRequestStatus` enum (`pending`/`approved`/`declined`/`cancelled`),
    replacing the plain-string `status` column.
  - `SystemConfig.id`: `@default(uuid())` → `@default("global")` (fixed singleton key).
  - Removed the one genuinely redundant index (`DutyAttendance`'s explicit `@@index([duty_slot_id])`,
    a strict duplicate of its own `@unique`). Added composite/prefix-superset indexes across
    `User`, `PendingInvite`, `TelegramRelinkToken`, `Student`, `StudentUploadLog`, `DutySlot`,
    `DutyAttendance`, `AttendanceAuditLog`, `ViolationType`, `Violation`, `ViolationAuditLog`,
    `AdminAuditLog`, `DutyReassignment`, `DutyReassignmentRequest`, `CalendarConfig`, `Message`,
    `PhotoAccessLog` — each matching a real query filter/sort I verified against the actual
    controller code (e.g. the `messages` composite exactly matches
    `messages.controller.js`'s `{to_user_id, deleted_by_receiver}` + `[is_read, created_at]`
    filter/sort), not applied blindly from the report's table.
- **New migration** `prisma/migrations/20260716130000_db_optimization_safety_review/migration.sql`
  (hand-written — no reachable dev DB via `prisma migrate dev` in this sandbox, same constraint
  noted in prior sessions): FK cascade changes, the enum conversion, the partial unique index
  (`duty_reassignment_requests_one_pending_per_slot`, one pending row per duty slot), the
  `system_config` singleton fix (with a guard that aborts if >1 row already exists), 4 CHECK
  constraints, the redundant-index cleanup, all new composite indexes, 2 high-value partial
  indexes (`reassignment_requests_pending_recipient_idx`, `violations_unresolved_flags_idx`),
  and `pg_trgm` + GIN trigram indexes on `students.student_name`/`registration_number`
  (confirmed the student search controller actually uses `contains + mode: 'insensitive'`,
  i.e. `ILIKE '%term%'`, before writing that justification).
- **Migration actually tested against real PostgreSQL**, not just eyeballed — used the local
  PostgreSQL 18 binaries (`C:\Program Files\PostgreSQL\18\bin`, no Docker needed) to spin up a
  disposable instance, ran all 27 migrations via `prisma migrate deploy` from scratch. **This
  caught and fixed a real bug**: my first draft created the partial unique index against the
  `status` column *before* converting it to the enum, which bakes a `text`-typed `'pending'`
  literal into the index predicate; the later `ALTER COLUMN TYPE` then fails trying to rebuild
  that dependent index against the new enum type (`operator does not exist:
  "ReassignmentRequestStatus" = text`). Fixed by reordering: enum conversion now runs before
  the partial index is created. Re-ran from a clean DB after the fix — all 27 migrations apply
  cleanly.
  - `prisma migrate diff` against the resulting live DB caught one more self-inflicted bug: an
    index name (`violations_deleted_at_is_flagged_flag_resolved_at_created_at_idx`, 64 chars)
    exceeded Postgres's 63-byte identifier limit and was silently truncated on creation, which
    would have caused permanent schema drift against `schema.prisma`. Fixed by shortening the
    name and pinning it explicitly via `map: "violations_deleted_flagged_resolved_idx"` in
    `schema.prisma` so there's no ambiguity with Prisma's own truncation/hashing.
  - The remaining `migrate diff` output (FK `ON UPDATE` clause differences on
    `attendance_audit_log_changed_by_fkey`/`violations_duty_slot_id_fkey`, missing column
    defaults on `students.year`/`semester`/`batch_year`) is **pre-existing baseline drift**,
    confirmed via `git diff` to be on fields/relations this task never touched — flagged below,
    not fixed (out of scope for this task).
- **Controller changes** (`server/controllers/duty-reassignment-requests.controller.js`):
  - `createRequest`: wrapped the `create()` call in try/catch for Prisma `P2002` → `409
    REQUEST_EXISTS`, matching the existing P2002-handling convention already used in
    `duty-slots.controller.js` (`pickSlot`). The pre-existing `findFirst` pre-check stays as a
    fast path; the DB constraint is now the real guard.
  - `respondToRequestCore`: both the decline and approve branches now do a conditional
    `updateMany({ where: { id, status: 'pending', to_faculty_id } })` and check `count !== 1`
    before proceeding, instead of trusting the earlier `findUnique` read. For approve, this had
    to move from an array-form `$transaction` (which runs every statement unconditionally) to
    the interactive callback form, so a lost race throws and aborts the *entire* transaction —
    no slot transfer, no `duty_reassignments` history row, no sibling-request auto-decline — not
    just the status update.
  - `cancelRequest`: same conditional-`updateMany` treatment, guarding the requester-cancels-
    while-target-concurrently-responds race (same root cause as 1.3, not explicitly named in the
    report but the same class of bug on the same `status` field).
- **`server/services/settings.service.js`**: `findFirst()`+`create()` → `findUnique({where:
  {id: 'global'}})` with an `upsert` fallback (atomic at the DB level, not just "check then
  insert" with a fixed key — closes the race completely rather than narrowing it).
- **Tests**: updated `cancelRequest`'s existing test (it asserted on `.update()`, now
  `.updateMany()`) and added 5 new tests: `createRequest` P2002→409, and for
  `respondToRequest` — decline happy path, decline-loses-race→409, approve happy path
  (asserting the transaction's `dutySlot.update`/`dutyReassignment.create` were called), and
  approve-loses-race→409 (asserting those same calls were **not** made — proving the whole
  transaction aborted, not just the status field). Full server suite: **169/169 passing**
  (up from 164 baseline).
- **Live end-to-end smoke test** against the same disposable Postgres (script written to the
  session scratchpad, deleted after): ran the real `createRequest`/`respondToRequestCore`
  controller functions (not mocks) against real data — duplicate pending request correctly
  rejected (409 via the partial unique index), approve correctly transferred slot ownership and
  wrote exactly one `duty_reassignments` row, re-processing the same already-approved request
  was correctly rejected with no double-write, and the `CHECK` constraint rejected an
  `INSERT` with `from_faculty_id = to_faculty_id` at the DB level. All 5 checks passed.
- `npx prisma validate` and `npm run generate` (client regeneration) both clean throughout.

## failed_or_blocked
- None — but see the migration-not-yet-run-in-real-dev/production caveat below.

## commands_run
```
npx prisma validate --schema prisma/schema.prisma
npm run generate
# Disposable local Postgres via C:\Program Files\PostgreSQL\18\bin (no Docker):
initdb / pg_ctl start / createdb
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma   # 27/27 applied
node node_modules/prisma/build/index.js migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --script
psql -f prisma/migrations/20260716130000_db_optimization_safety_review/migration.sql  # line-level failure isolation
npx vitest run duty-reassignment-requests   # 12/12
npx vitest run                              # 169/169 (server workspace)
pg_ctl stop  # both disposable instances torn down after verification
```

## constraints_discovered
- **No Docker daemon in this sandbox**, but PostgreSQL 18 binaries exist locally at
  `C:\Program Files\PostgreSQL\18\bin` (`initdb`, `pg_ctl`, `createdb`, `psql`) — usable to spin
  up a fully disposable Postgres instance (`initdb -D <dir> -A trust`, `pg_ctl start -o "-p
  <port>"`) without any container runtime. This is the technique to reach for whenever a schema
  or migration change needs real verification and Docker isn't available — don't skip
  verification just because Docker is down.
- Creating a partial/dependent index against a column *before* converting that column's type to
  an enum can break the later `ALTER COLUMN TYPE`, because Postgres has to rebuild the
  dependent index's predicate under the new type and the literal's type got locked in at
  original creation. Order enum conversions before any index that filters on that column.
- Postgres identifier limit is 63 bytes; a name at 64+ chars is silently truncated at creation
  time with no error, which then causes a real `prisma migrate diff` drift against
  `schema.prisma` later. Long composite index names generated by hand (not by `prisma migrate
  dev`, which handles this itself) need a manual length check or an explicit `map:`.
- `prisma migrate diff --from-url <db> --to-schema-datamodel schema.prisma --script` is a
  reliable way to confirm a live database and `schema.prisma` agree after a hand-written
  migration — caught both self-inflicted issues above before they reached any real environment.

## deviations_from_constitution
- None. Still Prisma/PostgreSQL, no new tables beyond what the constitution's §5 table list
  already includes, no new roles or endpoints. The polling-vs-WebSocket rule (§2) is untouched
  by this change entirely (it's a DB-layer change, no realtime behavior involved).

## files_touched
- prisma/schema.prisma
- prisma/migrations/20260716130000_db_optimization_safety_review/migration.sql (new)
- server/controllers/duty-reassignment-requests.controller.js
- server/services/settings.service.js
- server/tests/duty-reassignment-requests.test.mjs

## open_questions_for_owner
- **Migration not yet applied to any real (dev/staging/production) database.** It was fully
  verified against disposable throwaway Postgres instances only. Before running
  `npm run migrate:deploy` against the real dev DB (`sims_dms_dev`, currently unreachable in
  this sandbox — no Docker daemon running) or staging/production:
  1. **Back up first.**
  2. Check for existing duplicate pending rows (the partial unique index step will hard-fail
     otherwise): `SELECT duty_slot_id, COUNT(*) FROM duty_reassignment_requests WHERE status =
     'pending' GROUP BY duty_slot_id HAVING COUNT(*) > 1;`
  3. Check `system_config` has at most one row (the singleton step aborts with an explicit
     `RAISE EXCEPTION` otherwise, rather than guessing which row to keep).
  4. Confirm `pg_trgm` can be installed in the target database (needs superuser or a
     pre-installed extension on managed Postgres like Railway — usually fine, but worth
     confirming on the actual Railway plan before deploy).
- **Pre-existing schema/migration drift found but not fixed** (confirmed via `git diff` to
  predate this task, on relations this task never touched): `violations.dutySlot`'s `onDelete`
  behavior, `attendance_audit_log.changedBy`'s `onUpdate` clause, and missing column defaults
  on `students.year`/`semester`/`batch_year` all differ between what a fresh `prisma migrate
  dev` would generate from the current `schema.prisma` and what the actual hand-written
  migration history produced. Not blocking, but worth a dedicated cleanup pass at some point —
  `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma --script`
  against the real dev DB will show the exact remaining diff once it's reachable again.
- Report items not applied, by design (already resolved or out of scope): §5.1 DutySlot
  uniqueness — already confirmed intentional in `CONSTITUTION.md` and
  `specs/005-duty-reassignment/handoff.md`, no change made. `User.onDelete: Restrict` (§1.4) —
  already Prisma's implicit default for that unannotated required relation and the hard-delete
  endpoint never physically deletes a `User` row, so left as-is rather than adding a redundant
  explicit annotation.
