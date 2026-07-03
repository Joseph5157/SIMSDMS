# Handoff Report

> Filled out by Claude Code at the end of every task — whether a full feature or a single
> implementation step — and saved to `specs/<feature-folder>/handoff.md`, overwriting the
> previous report for that feature.

## task_id
001-auth-user-accounts / super_admin login bootstrap fix + admin dashboard UX follow-ups

## status
partial

## completed
- Diagnosed why the super_admin account could never log in: `prisma/seed.js` creates the
  bootstrap super_admin without a `password_hash`, so `server/controllers/auth.controller.js:17`
  always rejected it as `INVALID_CREDENTIALS`, regardless of password typed. This is the gap
  tracked as task T040 in `tasks.md` (never implemented after the OTP→password migration in
  `7b33d90`).
- Unblocked the specific admin account directly in the production DB (bcrypt-hashed password set,
  `must_change_password` cleared) so the user could log in immediately. This was a one-off data
  fix, not a code fix — T040 (updating `prisma/seed.js` to accept `BOOTSTRAP_SUPER_ADMIN_PASSWORD`
  and hash it at creation) is still outstanding.
- Admin dashboard (`client/src/pages/admin/AdminDashboardPage.jsx`) UX pass, requested separately
  by the user after noticing Quick Actions required scrolling on mobile:
  - Added a `compact` prop to `StatCard` (smaller padding/font) and applied it to the 4 KPI cards.
  - Shrank internal padding/row-height/scroll-cap on the "Today's attendance" and "Open cover
    requests" cards.
  - Removed "Live Attendance" and "Cover Requests" from Quick Actions per user request — only
    "Student Violations" and "Reports" remain.
  - Quick Actions kept in its original position (bottom of page, after the cards), per user
    preference — an earlier attempt to move it to the top (right after the header) was explicitly
    reverted by the user.
- Fixed a dark-mode contrast bug in the shared `CardHeader` component
  (`client/src/components/Layout.jsx`): header text was hardcoded to Mantine `gray.7`
  (`rgb(73,80,87)`), which doesn't invert for dark mode and was nearly invisible against the
  dark-mode page background (`rgb(15,23,42)`). Changed to `var(--text-secondary)`, which already
  has correct light/dark values in `index.css`. Since `CardHeader` is used app-wide, this fixes
  the same invisibility issue on every page that uses it, not just the dashboard.

## failed_or_blocked
- T040 (seed script password bootstrap) is not implemented — only the single existing admin row
  was patched by hand. Re-seeding a fresh environment would reproduce the original bug.

## commands_run
```
npx prisma generate
node server/scripts/tmp-set-admin-password.js   (temporary, deleted after use)
node server/scripts/tmp-check-admin.js          (temporary, deleted after use)
npx eslint <changed files>
```

## constraints_discovered
- The local dev checkout's `DATABASE_URL` (both root `.env` and `server/.env`) points at the
  production Railway database (`acela.proxy.rlwy.net`), not a local/staging DB. Any script run
  locally against `server/lib/prisma.js` writes to production. Confirm with the user before
  running further DB-writing scripts locally.
- Local Prisma client generation was stale/broken (`server/node_modules/@prisma/client` was
  empty despite the custom generator `output` path in `prisma/schema.prisma`); running
  `npx prisma generate` from repo root fixed it. Worth doing after any fresh `npm install`.

## deviations_from_constitution
- None.

## files_touched
- `client/src/pages/admin/AdminDashboardPage.jsx`
- `client/src/components/ui/StatCard.jsx`
- `client/src/components/Layout.jsx`
- (production DB) `users` row for the super_admin account — `password_hash`,
  `must_change_password`, `last_password_reset_at` set directly, bypassing the app's normal
  password-set flow.

## open_questions_for_owner
- Should `prisma/seed.js` be updated now to implement T040 (hash a `BOOTSTRAP_SUPER_ADMIN_PASSWORD`
  env var at creation time), so re-seeding doesn't reproduce the login bug?
- Quick Actions on the admin dashboard now only exposes "Student Violations" and "Reports" —
  confirm "Live Attendance" and "Cover Requests" being reachable only via the main nav (not Quick
  Actions) is intentional going forward.
