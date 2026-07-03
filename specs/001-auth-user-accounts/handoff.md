# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / End-of-session commit — auth model correction (Telegram OTP →
email/password + Telegram invite), full doc/code drift reconciliation, dev/prod DB
isolation, T040 fix, dead code removal

## status
complete

## completed
Full arc of this session, now committed (see commit hash noted below — this file was
updated once more immediately after committing to record it):

- **Auth model corrected across every doc**: discovered the codebase had abandoned Telegram
  OTP login for email + password (`7b33d90`), then further discovered the actual
  account-creation path is invite-based (`POST /invites` → Telegram-tap activation), not the
  "Admin creates directly" model either doc or an earlier pass of this session's work
  assumed. `CONSTITUTION.md`, `spec.md`, `plan.md`, and `tasks.md` were each revised — some
  more than once — until they matched the live code exactly.
- **`CONSTITUTION.md`** (v2.6 → v3.1): Admin permission reworded; Authentication section
  rewritten for the permanent password model; new Super-Admin password-reset rule added;
  §6 API table corrected to 95 endpoints/12 modules; §5 table's last OTP-era reference
  (`otp_sessions`) removed as the final cleanup step this turn.
- **`SIMS_API_Endpoints_v2.0.md`** (v2.0 → v2.2): full audit-driven sync — dead endpoints
  removed, real endpoints added, two entirely undocumented modules (Invites, Reports — 21
  endpoints) documented, two confirmed-duplicate Need Cover routes resolved out.
- **Dev/prod DB isolation**: local `.env`/`server/.env` now point at an isolated Docker
  Postgres; production `DATABASE_URL` (already rotated by the user) is gone from any local
  file.
- **T040 fixed**: `prisma/seed.js` bootstrap Super Admin now gets a real `password_hash` and
  `must_change_password = true`.
- **Migration bug fixed**: `20260613173500_add_last_password_reset_at` made idempotent
  (`ADD COLUMN IF NOT EXISTS`) — was blocking any fresh database. Confirmed harmless on
  production; resulting checksum drift reviewed and accepted by the user.
- **Dead code removed**: `createUser`/`getPendingUsers`/`regenerateInvite` and their retired
  `410`-stub routes in `users.controller.js`/`users.routes.js`/`users.schema.js`; two
  confirmed-dead duplicate routes in `cover-requests.routes.js`. Live invite/relink code
  (`invites.controller.js`, `bot.js`, `PendingInvite`, `TelegramRelinkToken`) was correctly
  identified as load-bearing and left untouched after an earlier wrong premise was caught.
- **Handoff automation extended**: now fires on `after_specify`/`after_clarify` too, not
  just `after_implement`.

## failed_or_blocked
(none — everything in this session's scope was completed or explicitly deferred as a
documented open item, listed below)

## commands_run
```
(this turn: no new shell commands beyond the git add/commit sequence — see below)
git add <17 explicitly-named files — see files_touched>
git commit -m "<see commit message>"
git log -1 --format=%H
```

## constraints_discovered
(none new this step — final cleanup only)

## deviations_from_constitution
- None — `CONSTITUTION.md` itself received its final correction this turn, with explicit
  owner instruction.

## files_touched
`.env.example`, `.specify/extensions.yml`, `.specify/extensions/handoff/README.md`,
`.specify/extensions/handoff/commands/speckit.handoff.update.md`,
`.specify/extensions/handoff/extension.yml`, `CONSTITUTION.md`,
`SIMS_API_Endpoints_v2.0.md`,
`prisma/migrations/20260613173500_add_last_password_reset_at/migration.sql`,
`prisma/seed.js`, `server/controllers/users.controller.js`,
`server/routes/cover-requests.routes.js`, `server/routes/users.routes.js`,
`server/schemas/users.schema.js`, `specs/001-auth-user-accounts/plan.md`,
`specs/001-auth-user-accounts/spec.md`, `specs/001-auth-user-accounts/tasks.md`,
`specs/001-auth-user-accounts/handoff.md` (this file). Not tracked/committed (gitignored,
correctly): `.env`, `server/.env`.

## open_questions_for_owner — carrying into the next session
1. **Super-Admin password-reset is spec'd but not coded.** `resetUserLogin` in
   `users.controller.js` still calls `prisma.otpSession.deleteMany(...)` (a model that no
   longer exists) and would still crash if invoked. The rewrite is fully specified as
   `tasks.md` T029 but not implemented.
2. **No path exists to create a second Super Admin account.** The live invite schema
   (`createInviteSchema`) hard-blocks `role: 'super_admin'` for anyone, including Super
   Admin. Documented as a known gap (FR-016); not resolved.
3. **Telegram-unreachable-during-password-reset behavior is undecided** — should a reset
   still succeed (temp password returned in the API response as a fallback) or fail outright
   if the Telegram send fails? Marked OPEN in both `spec.md` and `plan.md`.
4. **Retired routes now 404 instead of 410.** `POST /users`, `GET /users/pending`, and
   `POST /users/:id/regenerate-invite` used to return an explicit `410 GONE` with a redirect
   message; removing the dead stub handlers means they now return a plain `404`. No known
   caller depends on the old `410`, but flagging as an observable API behavior change.
