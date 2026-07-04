# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Perf/reliability audit fix #1: retry+flag on /resetpassword bot
notification failure (same silent-failure class as eb53d4f, higher priority — active lockout)

## status
complete

## completed
- Following a read-only perf/reliability audit, this closes the highest-priority finding:
  `handlePasswordReset` (triggered by a user sending `/resetpassword` to the bot) commits the
  new password hash **before** the reply containing the temp password is sent, and that send
  was fire-and-forget with only `.catch(log)` — no retry, no flag. If the send failed, the
  user's old password was already dead, the temp password existed nowhere retrievable, and
  they were locked out until the 1-hour `/resetpassword` rate limit cleared (worse than the
  invite-activation case fixed in `eb53d4f`, since this is user-initiated and actively
  destructive, not just a stalled onboarding).
- **`server/lib/bot.js`**: generalized the existing invite-activation retry/flag logic
  (previously a single-purpose `notifyActivationSuccess`) into a shared
  `sendWithRetryOrFlag(chatId, text, user, auditAction)` — same 3-attempt/1s-3s-backoff retry,
  same `activation_notification_failed` flag on final failure, same audit log write, now
  parameterized by an `auditAction` string instead of hardcoding `ACTIVATION_NOTIFICATION_FAILED`.
  - `notifyActivationSuccess(chatId, text, user)` is now a one-line wrapper calling
    `sendWithRetryOrFlag(..., 'ACTIVATION_NOTIFICATION_FAILED')` — unchanged behavior.
  - Added `notifyPasswordResetSuccess(chatId, text, user)`, wrapping
    `sendWithRetryOrFlag(..., 'PASSWORD_RESET_NOTIFICATION_FAILED')`.
  - Restructured the `/resetpassword` branch in `handleWebhook` to mirror the invite-activation
    branch's shape: on success, build the reply, call `notifyPasswordResetSuccess(...)` (fire-
    and-forget, same as before) and `return` early — only the success/lockout path gets retry+
    flag. The `NOT_LINKED`/`RATE_LIMITED`/generic-error replies keep the original single-attempt
    `sendTelegramMessage(...).catch(log)` — those don't follow a destructive state change, so
    there's nothing to protect by retrying.
- Tested end-to-end against the local dev DB by calling `bot.handleWebhook` directly (mocked
  `req`/`res`, real Prisma, real `TELEGRAM_BOT_TOKEN`) with a throwaway test user
  (`telegram_id: '1'`, an invalid chat — same technique used to test T029, produces a real
  Telegram `400 chat not found` without spamming anyone):
  - `/resetpassword` succeeded (password changed, `must_change_password: true`,
    `last_password_reset_at` set, `PASSWORD_RESET_VIA_BOT` audit row written) — confirming the
    webhook still returns `200 {"ok":true}` immediately regardless of notification outcome.
  - Notification retried twice (`warn` logs at attempts 1 and 2), then failed permanently
    (`error` log), then `activation_notification_failed` flipped to `true` and a
    `PASSWORD_RESET_NOTIFICATION_FAILED` audit row was written with accurate
    `{ chatId, error }` metadata.
  - Immediately re-sent `/resetpassword` from the same chat → correctly hit `RATE_LIMITED`
    (no second password change, no second flag/audit write) — confirms the restructuring
    didn't disturb the non-success branches.
  - Sent `/resetpassword` from an unrelated unknown chat id → correctly hit `NOT_LINKED`.
  - Both `RATE_LIMITED`/`NOT_LINKED` replies logged exactly one failed send attempt each (no
    retry warnings) — confirms retry+flag is scoped to the success path only, as intended.
  - Cleaned up the test user and its audit rows afterward; confirmed dev DB back to its
    original 1-user state.
- `node --check server/lib/bot.js` passes.

## failed_or_blocked
(none)

## commands_run
```
node --check server/lib/bot.js
# test script (inline node -e, not saved to disk): created a throwaway test user with
# telegram_id '1', called bot.handleWebhook() directly for /resetpassword (success + retry +
# flag path), then again twice more (rate-limited case, not-linked case), inspecting
# activation_notification_failed / admin_audit_log / must_change_password via Prisma queries
# and psql; deleted the test user + its audit rows afterward
git diff -- server/lib/bot.js
```

## constraints_discovered
- None new — this reused the exact retry/flag mechanism and constraints already documented
  for the invite-activation fix (`AdminAuditLog.actor_id` has no system-actor concept, so the
  affected user's own id is used as `actorId`; the webhook already responds before the
  notification settles, so retry backoff doesn't affect webhook response time).

## deviations_from_constitution
- None.

## files_touched
- `server/lib/bot.js`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner
- (carried forward, unrelated) No path exists to create a second Super Admin account
  (FR-016); retired routes now 404 instead of 410.
- Next up from the same audit, per explicit priority order: #2 (autoClockOut cron
  non-atomicity) and #3 (Excel student upload N+1) — not yet started.
- `sims-dms-dev-db` and Docker Desktop are still running from earlier sessions' manual
  testing; dev servers (client :5173, server :3000) may also still be running in the
  background from the ErrorRow spot-check session.
