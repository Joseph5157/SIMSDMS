# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Perf/reliability audit follow-ups: document intentional inbox
polling, stagger Telegram broadcast sends (audit item #4, now acted on)

## status
complete

## completed
1. **Documented the inbox-polling decision** (`CONSTITUTION.md`, Notifications section):
   added a bullet noting `useInbox`'s 30-second `refetchInterval` (faculty dashboard +
   Messages page) is a deliberate UX choice beyond the "live attendance" 30s-polling
   rationale, confirmed intentional during the 2026-07 perf audit — so it isn't
   re-flagged as scope creep in a future review.
2. **Staggered the two Telegram broadcast loops** that previously fired all sends in a
   parallel burst (audit item #4, previously left as backlog — now addressed on request):
   - `server/controllers/calendar.controller.js`'s `notifyAllFaculty` (duty-window-open
     broadcast to all faculty).
   - `server/controllers/cover-requests.controller.js`'s `notifyFaculty` (Need-Cover
     broadcast to all faculty except the requester).
   - Both now `await sleep(50)` between each recipient's dispatch (not each send's
     completion — the sends themselves stay fire-and-forget with their existing
     per-recipient `.catch(logger.warn(...))`, unchanged). At ~40 recipients this keeps the
     whole broadcast at ~20 dispatches/sec, safely under Telegram's ~30 msg/sec limit,
     without serializing on network round-trip time (which would make broadcasts take
     several seconds longer than necessary for no benefit).
   - Deliberately did not touch failure handling, the single-recipient `notifyUser`
     (cover-requests) which needs no stagger, or anything else — scope was exactly "avoid the
     rate limit," per instruction.
3. **Tested against the local dev DB**: created 5 throwaway faculty users with fake
   `telegram_id`s, then (temporarily exporting the two normally-internal functions from
   their modules just for this test, reverted immediately after — final diff has no export
   changes) timed both functions directly:
   - `notifyAllFaculty` (5 recipients): **368ms** total.
   - `notifyFaculty` (5 recipients): **384ms** total.
   - Both comfortably exceed the 250ms floor that 5×50ms stagger gaps would impose if the
     delay is actually being awaited between iterations (versus the near-instant completion
     you'd see if the loop just fired all 5 sends with no gap) — confirms the stagger is
     real, not a no-op.
   - Confirmed existing per-recipient failure logging is untouched: all 5
     `[cover-notify] Telegram failed for faculty <id>: ...` warnings still fired in the
     `notifyFaculty` test, same format as before.
   - Cleaned up all 5 test users afterward; confirmed dev DB back to its original 1-user
     state via `psql`.
- `node --check` passes on both controllers.

## failed_or_blocked
(none)

## commands_run
```
node --check server/controllers/calendar.controller.js
node --check server/controllers/cover-requests.controller.js
# temporarily added notifyAllFaculty/notifyFaculty to their module.exports for direct
# testing, reverted both before finalizing (git diff confirmed clean, no export changes
# in the committed version)
node -e "... console.time/timeEnd around cal.notifyAllFaculty(2026, 8) ..."   # 368ms/5 recipients
node -e "... console.time/timeEnd around cover.notifyFaculty(excludeId, text) ..."  # 384ms/5 recipients
# psql DELETE to remove the 5 test faculty users afterward
git diff -- server/controllers/calendar.controller.js server/controllers/cover-requests.controller.js CONSTITUTION.md
```

## constraints_discovered
- None new. Confirmed there's no existing shared `sleep`/delay utility in `server/lib/` —
  `bot.js` defines its own local one-liner `const sleep = (ms) => new Promise(...)`, so
  adding the same local one-liner to each of these two controllers (rather than extracting a
  shared util for a single-line helper used in 3 places total) matches existing convention.

## deviations_from_constitution
- None — this is the second CONSTITUTION.md update in this feature's history (see the
  Notifications section addition above); both are additive clarifications of existing
  decisions, not changes to them.

## files_touched
- `CONSTITUTION.md`
- `server/controllers/calendar.controller.js`
- `server/controllers/cover-requests.controller.js`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner
- All 4 items from the original perf/reliability audit are now addressed: #1
  (`/resetpassword` retry+flag), #2 (`autoClockOut` atomicity+recovery), #3 (upload
  batching), #4 (broadcast stagger, this task).
- (carried forward, unrelated) No path exists to create a second Super Admin account
  (FR-016); retired routes now 404 instead of 410.
- `sims-dms-dev-db` and Docker Desktop, and the client/server dev processes from the earlier
  ErrorRow spot-check session, may still be running in the background.
