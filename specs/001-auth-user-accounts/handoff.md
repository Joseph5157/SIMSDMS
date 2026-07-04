# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Perf/reliability audit fix #3: batch the Excel student upload N+1

## status
complete

## completed
- `server/controllers/students.controller.js`'s `uploadStudents` import loop did one
  `findUnique` + one `create`/`update` per row inside a single transaction — a 1,000-row
  roster upload meant ~2,000 sequential round-trips inside one interactive transaction,
  risking Prisma's default 5s transaction timeout on a full-roster upload. The dry-run path
  a few lines above (`dryRun` branch) already avoided this by fetching all existing
  registration numbers into a `Set` in one query — the actual import path just didn't reuse
  that approach.
- Fix: inside the transaction, fetch existing registration numbers into a `Set` (identical
  pattern to the dry-run branch), split `uniqueRows` into `toCreate`/`toUpdate`, batch all
  new rows into a single `tx.student.createMany({...})`, and keep per-row `tx.student.update`
  only for rows that already exist (Prisma's `updateMany` can't apply different `data` per
  row, so this part can't be further batched without raw SQL — matching the requested scope
  of "createMany for new rows plus targeted updates for existing ones", not a full rewrite).
  Net effect: the `findUnique`-per-row is gone entirely (1 query instead of N), and the
  create path is 1 query instead of N; only updates still cost 1 query per changed row.
- Tested against the local dev DB by building real `.xlsx` buffers with `exceljs` and
  calling `uploadStudents` directly (mocked `req`/`res`, real Prisma):
  - First upload: 1 pre-existing student + 2 new rows → response showed
    `added_count: 2, updated_count: 1`; confirmed via Prisma that the existing row's name/
    semester were updated and both new rows were created with correct data.
  - Second upload re-using the same 3 registration numbers (now all existing) → confirmed
    `added_count: 0, updated_count: 3` with **no error** from the `if (toCreate.length > 0)`
    guard around `createMany` — verifies the empty-creates edge case doesn't call
    `createMany` with a zero-length array.
  - Cleaned up both test uploads' student rows, `student_upload_log` rows, and the
    resulting `STUDENT_UPLOAD` `admin_audit_log` entries afterward; confirmed via `psql` that
    `students`/`student_upload_log` are back to 0 rows and `admin_audit_log` only has the two
    original pre-existing entries (`PASSWORD_LOGIN`, `CREATE_INVITE`) left.
- `node --check server/controllers/students.controller.js` passes. Did not change the
  dry-run path, the deactivation path, the bulk-promote/bulk-deactivate endpoints (page-scoped
  to ≤20 ids, negligible per the original audit), or the response shape/API contract.

## failed_or_blocked
(none)

## commands_run
```
node --check server/controllers/students.controller.js
# test script (inline node -e, not saved to disk): built two real .xlsx buffers with
# exceljs (one mixed new+existing, one all-existing), called ctrl.uploadStudents() directly
# against the real dev DB twice, inspected added_count/updated_count and the resulting
# student rows via Prisma; cleaned up via psql DELETE (students, student_upload_log,
# admin_audit_log)
git diff -- server/controllers/students.controller.js
```

## constraints_discovered
- Prisma's `createMany` has no equivalent for per-row differing `data` in a single call —
  confirmed this is why the update side of the loop can't be collapsed the same way the
  create side was, without introducing raw SQL (e.g. a bulk `INSERT ... ON CONFLICT DO
  UPDATE`), which this codebase treats as an exception reserved for cases Prisma genuinely
  can't do at all (see the `FOR UPDATE` comment in `bot.js`), not a general optimization tool.

## deviations_from_constitution
- None.

## files_touched
- `server/controllers/students.controller.js`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner
- All three prioritized fixes from the perf/reliability audit are now complete: #1
  (`/resetpassword` bot retry+flag), #2 (`autoClockOut` atomicity + straggler recovery), #3
  (this one). #4 (Telegram broadcast throttling) remains documented backlog per explicit
  instruction — not acted on.
- (carried forward, unrelated) No path exists to create a second Super Admin account
  (FR-016); retired routes now 404 instead of 410.
- `sims-dms-dev-db` and Docker Desktop, and the client/server dev processes from the earlier
  ErrorRow spot-check session, may still be running in the background — worth stopping if
  there's no more manual testing planned this session.
