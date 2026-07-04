# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Fix the silent-failure case where invite activation succeeds but
the Telegram temp-password notification fails to send

## status
complete

## completed
- Follow-up to a diagnosis of the full invite-activation failure surface (expired/malformed/
  reused tokens, DB errors mid-transaction — all found to at least reply with a generic
  message and log a warning/error). One case was genuinely silent: if
  `handleInviteActivation` succeeds (User row created, temp password generated,
  `PendingInvite` deleted) but the subsequent `sendTelegramMessage` call fails, the user got
  nothing and the token was already consumed — unrecoverable without an admin manually
  reading server logs.
- Proposed two complementary fixes and got sign-off before implementing:
  1. Retry the success-path Telegram send (3 attempts, 1s/3s backoff) to absorb transient
     failures automatically.
  2. On exhausting retries, persist a flag on the user (`activation_notification_failed`)
     *and* write an `AdminAuditLog` entry — column for at-a-glance visibility on the Users
     admin page, audit log for full context (chat ID, error message).
- **`prisma/schema.prisma`**: added `activation_notification_failed Boolean @default(false)`
  to `User`.
- **`prisma/migrations/20260704120000_add_activation_notification_failed/migration.sql`**:
  hand-written `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (local DB at `localhost:5433` was
  not reachable to run `prisma migrate dev`, so this follows the same hand-authored pattern
  as prior migrations, e.g. `20260613173500_add_last_password_reset_at`). Ran
  `npx prisma generate` so the Prisma Client has the new field; the migration itself still
  needs to be applied (`npm run migrate` / `migrate:deploy`) against a running DB.
- **`server/lib/bot.js`**: added `notifyActivationSuccess(chatId, text, user)` — retries
  `sendTelegramMessage` up to 3 times (1s/3s backoff) for the success-path reply only; on
  final failure, flags the user row, writes an `ACTIVATION_NOTIFICATION_FAILED` audit log
  entry (`actorId`/`targetId` = the new user's own ID, since there's no system-actor concept
  in the schema), and logs at `error` level. Wired into `handleWebhook`'s `result.success`
  branch only — the `ALREADY_LINKED`/`EMAIL_CONFLICT`/generic-invalid-token branches are
  untouched, per explicit scope (their generic-message wording is a separate, lower-priority
  task).
- **`server/controllers/users.controller.js`**: added `activation_notification_failed` to
  `safeUser()` so it's returned by `GET /users` and friends.
- **`client/src/pages/admin/UsersPage.jsx`**: added a conditional amber "⚠ Notify failed"
  badge (reusing the existing `flagged` status color) next to the status badge, in both the
  mobile card view and the desktop table view.
- Verified: `node --check` on both touched server files; `npx eslint` on the touched client
  file (only pre-existing, unrelated lint errors on the already-hidden Reset Telegram button
  from a prior session — nothing new introduced).

## failed_or_blocked
- Could not run `npx prisma migrate dev` against the local dev DB (`localhost:5433` refused
  the connection — DB not running). Wrote the migration SQL by hand instead, matching the
  project's existing convention for this. **The migration has not been applied to any
  database yet** — needs `npm run migrate` (dev) or `migrate:deploy` (prod) run against a
  live DB before this ships.

## commands_run
```
npx prisma migrate dev --name add_activation_notification_failed --schema prisma/schema.prisma   # failed: DB unreachable
npx prisma generate --schema prisma/schema.prisma
node --check server/lib/bot.js
node --check server/controllers/users.controller.js
npx eslint src/pages/admin/UsersPage.jsx   # pre-existing errors only, unrelated to this change
git status --short
git diff --stat
```

## constraints_discovered
- `AdminAuditLog.actor_id` is a required FK to `User` with no "system" actor concept — for a
  bot-initiated event with no human actor, the least-wrong fit is using the affected user's
  own ID as `actorId`. Worth revisiting if a real system-actor pattern gets added later.
- The success-path Telegram send in `bot.js` was already fire-and-forget (not awaited before
  `res.status(200)` is returned to Telegram's webhook), so adding retry backoff there has no
  effect on webhook response time — confirmed by reading the surrounding code before adding
  the delay loop.

## deviations_from_constitution
- None.

## files_touched
- `prisma/schema.prisma`
- `prisma/migrations/20260704120000_add_activation_notification_failed/migration.sql` (new)
- `server/lib/bot.js`
- `server/controllers/users.controller.js`
- `client/src/pages/admin/UsersPage.jsx`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner
1. **Migration not yet applied to any database.** Run `npm run migrate` (or `migrate:deploy`
   in prod) before relying on `activation_notification_failed` in production — until then the
   column doesn't exist and any code path touching it will error at runtime.
2. **No admin action wired to the new flag yet.** The badge is purely informational for now —
   there's no button to "resend" or "mark resolved." Recovering a flagged account today still
   means a manual DB/support intervention, or (once T029 ships) the Super-Admin password
   reset. Worth deciding whether the flag should auto-clear on a successful manual reset.
3. **Super-Admin password-reset is spec'd but not coded** (`tasks.md` T029) — still the
   long-standing gap; carried forward from the prior handoff.
4. **No path exists to create a second Super Admin account** (FR-016 known gap) — carried
   forward from the prior handoff.
5. **Telegram-unreachable-during-password-reset behavior is undecided** — carried forward
   from the prior handoff; marked OPEN in `spec.md`/`plan.md`.
6. **Retired routes now 404 instead of 410** (`POST /users`, `GET /users/pending`,
   `POST /users/:id/regenerate-invite`) — carried forward from the prior handoff.
