# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Perf/reliability audit fix #2: autoClockOut cron — atomic update +
catch stragglers from prior days

## status
complete

## completed
- `server/lib/cron.js`'s `autoClockOut()` had two problems found in the audit:
  1. Two sequential `updateMany` calls (attendance, then slot) with no transaction — a
     mid-run DB drop could close attendance records without marking their slots completed,
     or vice versa.
  2. The query only looked at **today's** date (`duty_date: todayRange`). If the job didn't
     run at all one day (e.g. DB down at 4:30 PM), those open records were never revisited —
     tomorrow's run only ever looks at tomorrow's date, so a missed run left them stuck open
     forever with no self-healing path.
- Fix:
  - Widened the query to `duty_date: { lte: throughToday }` — an upper bound only, so it now
    catches today's open records **and** any straggler from a prior day in the same pass.
  - Since stragglers can span multiple different dates, and each date needs its own
    auto-checkout cutoff timestamp (today's cutoff would be semantically wrong for a
    3-day-old record), grouped the open records by their own `dutySlot.duty_date` and
    computed `autoOutUTC` per group using that group's date, not `nowInIST()`'s date.
  - Wrapped each date-group's attendance-update + slot-update in `prisma.$transaction([...])`
    so the two can't diverge if the DB drops mid-run.
- Tested against the local dev DB by calling the exported `autoClockOut()` directly:
  - Created two open attendance records (in_time set, out_time null): one dated 3 days ago
    (`2026-07-01`), one dated today (`2026-07-04`), both under the seeded Super Admin as
    faculty (FK only, role irrelevant to the test).
  - Ran `autoClockOut()` once — log confirmed "2 record(s) closed" (both picked up in the
    same run, confirming the widened query catches the straggler).
  - Verified via Prisma: the 07-01 record's `out_time` was `2026-07-01T11:00:00.000Z`
    (16:30 IST **on its own date**) and the 07-04 record's was `2026-07-04T11:00:00.000Z` —
    confirming each straggler gets its own date's cutoff, not today's. Both slots flipped to
    `status: 'completed'`.
  - Re-ran `autoClockOut()` a second time — no-op (no log output, matching the existing
    `if (openAttendance.length === 0) return;` early exit), confirming idempotency: closed
    records aren't reprocessed.
  - Cleaned up both test duty_slot/duty_attendance rows afterward; confirmed both tables
    back to 0 rows (their pre-test state).
- `node --check server/lib/cron.js` passes.
- Did not (and couldn't practically) simulate an actual mid-transaction DB crash to prove
  the atomicity guarantee under real failure — that's inherent to `prisma.$transaction`'s
  contract (either both `updateMany` calls in a group commit or neither does), not something
  that needs its own bespoke test; verified the grouping/cutoff-date logic instead, which was
  the part actually specific to this change.

## failed_or_blocked
(none)

## commands_run
```
node --check server/lib/cron.js
# test script (inline node -e, not saved to disk): created a straggler duty_slot+attendance
# dated 3 days ago and one dated today, both with in_time set and out_time null; ran
# autoClockOut() directly; inspected out_time/out_status/auto_out/slot.status via Prisma;
# re-ran to confirm idempotency; cleaned up via psql DELETE
git diff -- server/lib/cron.js
```

## constraints_discovered
- `duty_date` is `@db.Date`, which Prisma returns as a UTC-midnight JS `Date` (per the
  existing comment in `lib/time.js`) — so grouping stragglers by
  `dutySlot.duty_date.toISOString().slice(0, 10)` and reading
  `getUTCFullYear()/getUTCMonth()/getUTCDate()` off it directly gives the correct IST
  calendar date without needing any timezone conversion, consistent with how the rest of the
  codebase already treats this field.

## deviations_from_constitution
- None.

## files_touched
- `server/lib/cron.js`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner
- (carried forward, unrelated) No path exists to create a second Super Admin account
  (FR-016); retired routes now 404 instead of 410.
- Next up from the same audit, per explicit priority order: #3 (Excel student upload N+1) —
  not yet started. #4 (Telegram broadcast throttling) remains documented backlog per explicit
  instruction, not being acted on now.
- `sims-dms-dev-db` and Docker Desktop, and the client/server dev processes from the earlier
  ErrorRow spot-check session, may still be running in the background.
