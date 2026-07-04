# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / T029 — rewrite `resetUserLogin` (Super-Admin password reset),
replacing the broken Telegram-relink implementation; closes T029 and T029a

## status
complete — committed as **`d6bf86c`** (`d6bf86c81ef2aa58de8579dd0816b1c2a6473e19`), its own
logical commit, separate from the prior `activation_notification_failed` fix committed as
**`eb53d4f`** (`eb53d4fcb68181043e747b735bcff19f9059ef94`), per explicit request.

## completed
- **Applied the previously-pending migration** (`20260704120000_add_activation_notification_failed`)
  against the local dev DB: Docker Desktop wasn't running, so started it, found the
  `sims-dms-dev-db` container stopped, started it, then ran `npm run migrate:deploy`
  (`migrate dev` refused — non-interactive environment, and the migration file already
  existed on disk from the prior session). Confirmed via `psql \d users` that
  `activation_notification_failed boolean not null default false` now exists. Left both
  Docker Desktop and the container running per explicit request, for manual UI testing.
- **Rewrote `resetUserLogin` in `server/controllers/users.controller.js`** (same endpoint,
  `POST /admin/users/:id/reset-login`, already Super-Admin-only via
  `router.use(authenticate, authorize('super_admin'))` in `admin.routes.js` — requirement
  #1 was already satisfied at the router level, no change needed there). New behavior:
  - Generates a temp password via `lib/password.js`'s `generateTempPassword()` (same
    generator already used by the invite-activation and self-service `/resetpassword` bot
    flows — `prisma/seed.js`'s bootstrap generator is a separate one-off with a different
    charset/format and isn't exported for reuse, so matching the *live* reset-flow
    convention was the better fit for "consistency" than literally importing from seed.js).
  - Hashes it with `hashPassword()` (bcrypt cost 12, same helper — already cost 12).
  - Updates `password_hash`, `must_change_password = true`, increments `session_version`
    (revokes existing sessions — matches the constitution's "resets any user's login
    session" language and the pattern already used by `deactivateUser`/`deleteUser`), and
    clears `activation_notification_failed` unconditionally (idempotent recovery path for
    that flag).
  - **Confirmed before committing** (user asked for explicit verification): the
    `prisma.user.update({ where: { id: user.id }, ... })` call (`users.controller.js:283`)
    only ever touches the target user's row. `user.id` there is the user fetched at line
    265 via `req.params.id` — the URL target — never `req.user.id` (the acting Super
    Admin, only used for the audit log's `actorId`). `session_version` is a plain per-row
    column on `User`, not shared/global state, so there is no path by which this update
    reaches any row but the one being reset. A Super Admin also cannot target their own
    row through this endpoint at all: the guard at line 271 (`user.role === 'super_admin'`)
    checks the *target's* role, and a Super Admin's own row always has that role, so
    self-targeting 403s before the update is ever reached — confirmed this is genuinely
    unreachable, not just discouraged by convention.
  - Attempts Telegram delivery via `lib/telegram.js`'s `sendMessage(chatId, text)` — **not**
    `bot.js`'s internal `sendTelegramMessage`; checked callers first (`calendar.controller.js`,
    `cover-requests.controller.js` both use `lib/telegram.js` for controller-initiated
    notifications) and matched that existing convention instead of reaching into the bot
    webhook module.
  - Never blocks on the Telegram outcome — the password is already committed before the
    send is attempted. On success: response omits the temp password (`telegram_delivered:
    true`). On failure (API error, or no `telegram_id` at all): response includes
    `temp_password` in plaintext, `telegram_delivered: false`, and the reason so the Super
    Admin can relay it manually — never silently swallowed into logs only.
  - Writes a `RESET_USER_LOGIN` audit log entry every time via the existing `logAction()`
    pattern, with `metadata: { telegram_delivered, telegram_error }`.
  - Removed the `TODO(T029)` comment and the entire old relink-token/`otpSession` code path;
    removed the now-unused `crypto` import (nothing else in the file used it).
- **Re-enabled the UI control in `client/src/pages/admin/UsersPage.jsx`**: replaced the
  `{false && ...}` guard and "Reset Telegram" label with a live "Reset Password"
  `Menu.Item`, visible to Super Admin for any non-super-admin user regardless of status
  (matches the backend's only real restriction — role, not status). Confirm dialog copy
  now describes a password reset, and branches its wording on whether the target has a
  `telegram_id` at all. On success: toast only, if Telegram delivery succeeded. On Telegram
  failure: a dedicated Mantine `Modal` (not a toast) shows the temp password in a monospace
  box with a Copy button, since a toast disappearing would lose the only copy of that
  password.
- **`client/src/hooks/useUsers.js`**: `useResetUserLogin()` now invalidates the `['users']`
  query on success, so the "⚠ Notify failed" badge (added in the prior commit) disappears
  from the list immediately after a successful reset clears the flag.
- **`specs/001-auth-user-accounts/tasks.md`**: checked off T029 and T029a (the
  Telegram-unreachable-during-reset decision — confirmed as "reset always succeeds, temp
  password returned as fallback").
- **Tested end-to-end against the local dev DB**, calling the real controller function
  directly (mocked `req`/`res`, real Prisma client, real `TELEGRAM_BOT_TOKEN`) against two
  throwaway test users (deleted afterward, DB confirmed back to its original 1-user state):
  - No `telegram_id` → `telegram_delivered: false`, `telegram_error: "NO_TELEGRAM_ID"`,
    `temp_password` present in response, DB row updated correctly.
  - `telegram_id: "1"` (invalid chat, pre-flagged `activation_notification_failed: true`) →
    real Telegram API call, real `400 Bad Request: chat not found` error caught, same
    fallback response shape, and confirmed `activation_notification_failed` flipped back to
    `false` by the reset.
  - Confirmed via `psql` both times: `password_hash` set, `must_change_password = true`,
    `session_version` incremented, `activation_notification_failed = false`, and a
    `RESET_USER_LOGIN` row in `admin_audit_log` with accurate `telegram_delivered`/
    `telegram_error` metadata for each case.
  - Also verified the super-admin guard (403) and not-found guard (404) still work.
  - Re-ran the same two cases again after switching the Telegram import from `bot.js` to
    `lib/telegram.js` to re-confirm behavior held with axios-based errors too.
- Verified: `node --check` on the controller; `npx eslint` on both touched client files —
  zero errors (this also incidentally cleared the pre-existing `no-constant-binary-expression`
  lint error from the old `{false && ...}` guard, since that code is now gone).
- **Split the working tree into two commits** rather than one bundled commit, per explicit
  request that T029 be "its own logical commit," separate from the earlier
  `activation_notification_failed` fix. Both changes had landed in the same two files
  (`users.controller.js`, `UsersPage.jsx`) across non-overlapping regions in the same
  session; reconstructed the intermediate (fix-only) state from `git show HEAD` + the
  fix-only hunks, committed that first as `eb53d4f`, then restored the final T029 content
  on top for this commit — confirmed via `git diff --stat`/`git diff` at each step that
  each commit's diff matched its intended scope exactly before committing.

## failed_or_blocked
(none)

## commands_run
```
docker ps --filter "publish=5433"                       # daemon not reachable initially
Start-Process "Docker Desktop.exe"; poll `docker ps` until responsive
docker ps -a                                             # found sims-dms-dev-db, Exited
docker start sims-dms-dev-db
npm run migrate:deploy                                   # applied the pending migration
docker exec ... psql -c '\d users'                       # confirmed column exists
docker exec ... psql -c 'SELECT ... FROM users'          # pre/post state checks
node --check server/controllers/users.controller.js
node -e "require('./server/controllers/users.controller.js')"   # circular-dep smoke test
npx eslint src/pages/admin/UsersPage.jsx src/hooks/useUsers.js
# end-to-end test script (scratchpad, deleted after use): created 2 throwaway users, called
# ctrl.resetUserLogin() directly (no-Telegram + bad-Telegram cases), re-ran after switching
# bot.js -> lib/telegram.js import, cleaned up both test users + audit rows via psql DELETE
git diff -U1 <files>                                      # inspected hunk boundaries
git show HEAD:<file> > scratch                             # extracted pre-session baseline
# reconstructed intermediate (fix-only) file content by hand, staged, committed as eb53d4f
git commit  # eb53d4f — activation_notification_failed fix
# restored final T029 content, staged remaining files
git commit  # this commit — T029
git diff --stat
```

## constraints_discovered
- **Two parallel Telegram-send helpers exist**: `server/lib/bot.js`'s internal
  `sendTelegramMessage` (used only by the bot webhook handler itself, raw `fetch`, no
  timeout) and `server/lib/telegram.js`'s `sendMessage` (axios, 8s timeout) — the latter is
  the one already used by every *controller* that sends a Telegram notification
  (`calendar.controller.js`, `cover-requests.controller.js`). Initially wired this up
  against `bot.js` by mistake (it "worked" — no circular-dependency error — but was the
  wrong convention); caught it by grepping for existing callers before finalizing, and
  switched to `lib/telegram.js` to match. Worth a note for anyone touching this later: pick
  `lib/telegram.js` for anything triggered by an admin/controller action, and reserve
  `bot.js`'s helper for the webhook's own reply logic.
- `tasks.md`'s T029 description says to use `server/lib/telegram.js`'s `sendMessage` — it
  was right and I initially deviated from it; corrected to match.
- axios error messages from `lib/telegram.js` are less descriptive than raw `fetch` errors
  (`"Request failed with status code 400"` vs. the full Telegram JSON body) — but this
  matches the existing convention in `cover-requests.controller.js`'s error logging, so kept
  it consistent rather than enriching just this one call site.
- Docker Desktop was not running at all (not just the container) — needed a full daemon
  start, not just `docker start <container>`, before any of this could be tested locally.

## deviations_from_constitution
- None.

## files_touched
- `server/controllers/users.controller.js`
- `client/src/pages/admin/UsersPage.jsx`
- `client/src/hooks/useUsers.js`
- `specs/001-auth-user-accounts/tasks.md`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten, then updated once more
  immediately after to add this commit's hash)

## open_questions_for_owner
1. **No "resend"/"acknowledge" action wired to `activation_notification_failed` beyond this
   reset.** The Super-Admin password reset now clears the flag as a side effect, which is a
   real recovery path, but there's still no dedicated UI to just re-attempt the original
   invite-activation Telegram message without also rotating the password. Low priority since
   the reset flow fully covers recovery either way.
2. **No path exists to create a second Super Admin account** (FR-016 known gap) — carried
   forward, unrelated to this task.
3. **Retired routes now 404 instead of 410** (`POST /users`, `GET /users/pending`,
   `POST /users/:id/regenerate-invite`) — carried forward, unrelated to this task.
4. **`sims-dms-dev-db` and Docker Desktop are still running** — left running on request for
   manual UI testing of this reset flow. Let me know when it's safe to stop them.
