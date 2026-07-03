# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / Follow-up to the session close-out (`131a7ab`/`a7be5b2`) — found and
hid a live broken UI control calling the still-unfixed `resetUserLogin` endpoint

## status
complete

## completed
- **Corrected a mistake from earlier in the session**: I had told the user
  `useResetUserLogin()` had "zero callers anywhere in the client." That was wrong — my grep
  pattern (`ResetLogin`, case-sensitive) never matched the actual camelCase variable name
  `resetUserLogin` used in `client/src/pages/admin/UsersPage.jsx`. Re-checked properly this
  time and found a real, live "Reset Telegram" menu item (visible to Super Admin, only for
  users with `status === 'pending_telegram'`) that calls
  `resetUserLogin.mutateAsync(...)` → `POST /admin/users/:id/reset-login` → the still-broken
  backend function from the prior session's findings (throws on the dead
  `prisma.otpSession.deleteMany(...)` call).
- **`client/src/pages/admin/UsersPage.jsx`**: hidden the "Reset Telegram" `Menu.Item` behind
  a `{false && ...}` guard with an explanatory comment, so it can never be clicked in
  production. Left the surrounding handler (`doResetTelegram`) and state
  (`resettingTelegram`) in place since they're harmless while unreachable and will be needed
  again — rewritten for password-reset semantics — once T029 ships.
- **`server/controllers/users.controller.js`**: added a `TODO(T029)` comment directly above
  `resetUserLogin` explaining exactly why it's broken, what needs to happen, and that its one
  UI caller has been hidden until the rewrite ships.
- Verified both edits: `node --check` passes on the controller; re-read the JSX to confirm
  braces/parens are balanced and the guard correctly prevents rendering.
- Committed as a small standalone fix, separate from the prior session's larger commit.

## failed_or_blocked
(none)

## commands_run
```
git status --short
git diff --stat -- client/src/pages/admin/UsersPage.jsx server/controllers/users.controller.js
node --check server/controllers/users.controller.js
git add client/src/pages/admin/UsersPage.jsx server/controllers/users.controller.js
git commit -m "fix: hide broken Reset Telegram button to prevent live 500, TODO -> T029"
git log -1 --format=%H
```

## constraints_discovered
- The "Reset Telegram" button's copy/behavior (relink link, not password reset) matches the
  *current* (broken) backend implementation's intent, not the future T029 rewrite's — meaning
  even once T029 ships, this UI can't just be un-hidden as-is. It needs a full rework (new
  label, confirm copy, and success handling for a temp password sent via Telegram instead of
  a `relink_link`). Noted in both the frontend comment and the backend TODO so whoever picks
  up T029 doesn't just flip the `{false && ...}` guard back on.
- This is a reminder that "no callers" claims about a hook should be verified by searching
  for the actual variable name in use, not an assumed string pattern — the earlier false
  negative came from exactly that shortcut.

## deviations_from_constitution
- None.

## files_touched
- `client/src/pages/admin/UsersPage.jsx`
- `server/controllers/users.controller.js`
- `specs/001-auth-user-accounts/handoff.md` (this file — overwritten)

## open_questions_for_owner — still carrying into the next session
1. **Super-Admin password-reset is spec'd but not coded.** `resetUserLogin` still calls
   `prisma.otpSession.deleteMany(...)` and would crash if invoked directly (e.g. via curl/
   Postman) — the one UI path to it is now hidden, but the endpoint itself is unchanged and
   still reachable by anyone who knows the URL. The rewrite is fully specified as `tasks.md`
   T029 but not implemented.
2. **No path exists to create a second Super Admin account.** The live invite schema
   (`createInviteSchema`) hard-blocks `role: 'super_admin'` for anyone, including Super
   Admin. Documented as a known gap (FR-016); not resolved.
3. **Telegram-unreachable-during-password-reset behavior is undecided** — should a reset
   still succeed (temp password returned in the API response as a fallback) or fail outright
   if the Telegram send fails? Marked OPEN in both `spec.md` and `plan.md`.
4. **Retired routes now 404 instead of 410.** `POST /users`, `GET /users/pending`, and
   `POST /users/:id/regenerate-invite` used to return an explicit `410 GONE` with a redirect
   message; they now return a plain `404`. No known caller depends on the old `410`, but
   flagging as an observable API behavior change.
