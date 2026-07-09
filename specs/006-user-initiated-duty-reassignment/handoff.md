# Handoff Report

## task_id
006-user-initiated-duty-reassignment / P27 Faculty-Requested Reassignment (Method 2, alongside existing Admin Duty Reassignment)

## status
complete

## completed
- **Finished a partial implementation abandoned mid-way in an earlier session.** The `DutyReassignmentRequest` Prisma model was already committed (in the 005-duty-reassignment branch's initial commit) and a controller + routes file existed on disk but were **never committed to git** and **never had a migration** — meaning the model/client existed but the actual `duty_reassignment_requests` table did not exist in any database, including production. This was discovered while investigating a Railway deployment crash earlier in the session (a dead `require()` for these same files, since removed from `server/index.js` — that fix predates this task and only removed the broken reference, not the underlying files).
- **Migration**: `prisma/migrations/20260709100000_add_duty_reassignment_requests/migration.sql` — creates the table matching the existing schema.prisma model exactly. Applied cleanly to a local test database (20 migrations total, no conflicts).
- **Backend** (`server/controllers/duty-reassignment-requests.controller.js`, rewritten from the abandoned version):
  - `POST /duty-reassignment-requests` — create a request. Guards: slot must be scheduled/not-past/no-attendance (same eligibility as admin reassignment), target faculty must be active, no conflicting duty for target at same date/session, no existing pending request for the same slot.
  - `GET /duty-reassignment-requests` — pending requests sent *to* the caller (their inbox).
  - `GET /duty-reassignment-requests/sent` — requests the caller sent, any status (new — needed for the "requested to X — pending/declined" UI badge).
  - `GET /duty-reassignment-requests/eligible-faculty/:dutySlotId` — dropdown data source (new): active faculty, excluding the requester and anyone already holding a duty at the same date/session.
  - `PATCH /duty-reassignment-requests/:id` — approve or decline. **Approve is a transaction**: transfers `duty_slots.faculty_id`, writes one row to the *same* `duty_reassignments` history table Admin Duty Reassignment uses (`reassigned_by` = the accepting faculty), marks the request `approved`, and auto-declines any other pending requests for the same slot. Decline just updates the request's status — no slot changes. Both paths send Telegram notifications; approve re-checks slot eligibility (time may have passed since the request was sent).
  - `server/schemas/duty-reassignment-requests.schema.js` (new, Zod validation) + `server/routes/duty-reassignment-requests.routes.js` (faculty-only, all 5 endpoints) + mounted in `server/index.js`.
- **Frontend**:
  - `client/src/hooks/useDutyReassignmentRequests.js` (new) — all 5 endpoints as TanStack Query hooks, 30s polling on the pending/sent lists.
  - `client/src/components/faculty/RequestReassignmentModal.jsx` (new) — replaces the old message-to-admin flow. Searchable colleague dropdown (data from the eligible-faculty endpoint) + optional reason.
  - `client/src/components/faculty/PendingReassignmentRequests.jsx` (new) — incoming-request card(s) on the faculty dashboard with Accept/Reject buttons.
  - `client/src/pages/faculty/DashboardPage.jsx` — removed the old `ComposeDrawer`/`useMessageRecipients`-based "Request reassignment" flow entirely (per P27 spec: "What to Remove"). Wired in the new modal + pending-requests card. Upcoming-duty rows now show "requested to X — pending" (button hidden while pending) or "X declined" (button shown again) using the new sent-requests hook.
- **`CONSTITUTION.md` updated to v3.5**: §3 (Faculty permissions — replaced message-admin wording with the peer request/accept description), §4 (renamed the section to "Duty Reassignment — Two Independent Methods", kept the existing Admin method's description intact, added the new Method 2 description in full, documented the shared `duty_reassignments` history decision), §5 (added `duty_reassignment_requests` table, updated table count 16→17), §6 (added the Duty Reassignment Requests module (5 endpoints) **and** the Analytics module (5 endpoints, from the earlier P24 Phase 1 work this session — that module had been built but never documented here), updated counts 90→100 endpoints, 12→14 modules).
- **Verified end-to-end in a real browser with two faculty accounts**, not just build/typecheck:
  - Spun up a disposable local Postgres, applied the new migration cleanly, seeded a second faculty + a future eligible duty slot.
  - As Faculty A: opened the modal, confirmed only the non-conflicting colleague appeared in the dropdown, sent a request with a reason. Confirmed the upcoming-duty row immediately showed "requested to Dr. Colleague Two — pending" and the button hid itself.
  - As Faculty B: saw the incoming request card with the correct reason text, clicked **Accept** — confirmed the duty actually transferred (appeared in Faculty B's upcoming duties as "reassigned from Dr. Test Faculty", using the *pre-existing* admin-reassignment display logic, since both methods share the same history table by design).
  - Back as Faculty A: confirmed the transferred duty appeared under the existing "Reassigned Away" section and in "Recent Activity" — again, no new frontend code needed for this, it fell out of writing to the shared `duty_reassignments` table.
  - Repeated with a second slot, this time clicking **Reject** as Faculty B: confirmed the request disappeared, the slot stayed with Faculty A, and the upcoming-duty row updated to "Dr. Colleague Two declined" with the request button reappearing (so Faculty A can try someone else).
- `npm run build --workspace=client` clean. `node --check` on all new backend files + a `require()` smoke test. `npm run test --workspace=server`: 48/53 pass — the 5 failures are the same pre-existing local-DB-unreachable `cron.test.mjs` failures from before this task (no new regressions).

## failed_or_blocked
- None.

## commands_run
```
npm run generate                                      # Prisma client regen, twice
npm run build --workspace=client                       # clean, twice
npm run test --workspace=server                        # 48/53 (5 pre-existing, unrelated failures)
node --check server/controllers/duty-reassignment-requests.controller.js
node --check server/routes/duty-reassignment-requests.routes.js
node --check server/schemas/duty-reassignment-requests.schema.js
# Local verification environment (throwaway, torn down after):
pg_ctl start -o "-p 5433"
npm run migrate:deploy                                 # 20 migrations, new one applied clean
node <scratchpad>/seed-test-data2-tmp.js               # 2nd faculty + eligible slot
npm run dev                                             # server :3000, client :5173
# ... manual browser verification of request/accept/reject (see completed) ...
pg_ctl stop
```

## constraints_discovered
- Confirmed again (see `DEPLOYMENT_TROUBLESHOOTING.md`): a Prisma model can exist in `schema.prisma` (and even be committed) with `npm run generate` succeeding, while the actual table doesn't exist in any real database, if a migration was never generated for it. `npm run migrate:deploy` will not catch this — it only reports "no pending migrations" against whatever migration files exist; it does not diff `schema.prisma` against the live schema. Worth a periodic `prisma migrate diff` or `prisma db pull` sanity check if this class of drift is a recurring risk.
- The existing "Reassigned Away" / "reassigned from" display logic on the faculty dashboard (built for Admin Duty Reassignment in 005) required **zero changes** to also correctly display Method 2 transfers, because both methods write to the same `duty_reassignments` table. This is a direct payoff of the constitution's existing "exactly one concept — Reassigned Duty" rule (§4) — worth preserving as a pattern for any future third reassignment trigger, if one is ever proposed.

## deviations_from_constitution
- None — this task's job was specifically to correct a prior deviation (undocumented Analytics module, and a half-built P27 feature that hadn't updated the constitution at all). Both are now reconciled; see completed above.

## files_touched
- prisma/migrations/20260709100000_add_duty_reassignment_requests/migration.sql (new)
- server/controllers/duty-reassignment-requests.controller.js (rewritten — was untracked/abandoned)
- server/routes/duty-reassignment-requests.routes.js (rewritten — was untracked/abandoned)
- server/schemas/duty-reassignment-requests.schema.js (new)
- server/index.js (re-added the require/mount for duty-reassignment-requests, now that the files are committed; also has the earlier-session analytics mount)
- client/src/hooks/useDutyReassignmentRequests.js (new)
- client/src/components/faculty/RequestReassignmentModal.jsx (new)
- client/src/components/faculty/PendingReassignmentRequests.jsx (new)
- client/src/pages/faculty/DashboardPage.jsx (removed ComposeDrawer-based reassignment flow; added new modal, pending-requests card, sent-status badge)
- CONSTITUTION.md (v3.5)

## open_questions_for_owner
- **Migration not yet applied to production.** Same caveat as every prior migration in this session — run `npm run migrate:deploy` against production (or let the next Railway deploy's pre-deploy step apply it) and confirm before relying on this feature in production. Given the DEPLOYMENT_TROUBLESHOOTING.md incident earlier today (Postgres credential drift), double-check the `DATABASE_URL` on the SIMSDMS service is still correct before that deploy.
- **No in-app notification generation**, same precedent as 005 — Telegram is the only channel for "you have a new reassignment request" / "your request was accepted/declined". The pending-requests card on the dashboard is polled (30s), not pushed.
- P27's spec also mentions "eligible faculty" should exclude anyone "unavailable" beyond just conflicting duty — the current implementation only checks active status + duty conflict at the same date/session. If there's a broader notion of "faculty availability" (e.g., leave calendar) elsewhere in the system, it isn't wired into this eligibility check.
