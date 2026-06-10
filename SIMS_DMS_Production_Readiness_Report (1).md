# SIMS DMS — Production Readiness Report

**Reviewed build:** `SIMSDMS-001-auth-user-accounts` (Phase 1 + partial Phase 2)
**Reviewed by role:** Senior full-stack architect · Mobile UX designer · Security engineer · Product consultant
**Date:** 10 June 2026

Everything below references actual files in the ZIP. No generic advice.

---

## Executive Summary

This is a genuinely well-built Phase-1 system for its scale (20–30 faculty). The backend honors the constitution in most places that matter: UUID PKs, Zod validation on mutations, Winston logging (zero `console.log` in `server/`), httpOnly JWT cookies, `session_version`-based revocation, transactional slot picking with `@@unique([duty_date, session_type])` as a DB-level backstop, an immutable `violation_audit_log`, and a memory-only Excel upload pipeline. The Telegram invite-token flow in `server/lib/bot.js` with `SELECT ... FOR UPDATE` is better than most teams ship.

However, it is **not production-ready today** for four concrete reasons:

1. **The auto clock-out cron is broken by a `ReferenceError`** (`now` is undefined in `cron.js → autoClockOut`). It will throw every day at 4:30 PM IST and no faculty will ever be auto-clocked-out. The constitution lists this as a Phase-1 requirement.
2. **The login identity story is incoherent.** The bot tells users to "login with your email", the login screen asks for a "Telegram ID", the placeholder suggests `@username` — but the DB stores the numeric chat ID. A faculty member typing `@drsharma` gets `USER_NOT_FOUND` with no path to discover their numeric ID.
3. **Async controller errors hang requests.** Most controllers (attendance, duty-slots, violations, reports) have no try/catch and Express 4 does not forward rejected promises to the error handler. A Prisma error means the client spins until axios times out.
4. **Zero automated tests.** Not one `.test.js` file exists for a system that manages fines, attendance records, and audit trails.

**Overall project rating: 7/10** · **Production readiness: 5/10**

Fix the P0 list (≈2–3 days of work) and readiness jumps to ~7.5/10.

---

# Part 1 — Issue Register

Priorities: **P0** = blocks production · **P1** = fix before real faculty use it daily · **P2** = fix within 30 days · **P3** = quality/polish.

---

## 1. Backend Logic Bugs

### ISSUE-01 · P0 · Auto clock-out cron crashes daily — `now` is undefined

- **Problem:** In `server/lib/cron.js`, `autoClockOut()` contains:
  ```js
  const autoOutTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cfg.auto_checkout_hour, cfg.auto_checkout_min);
  ```
  `now` is never declared in that function scope. Every day at 16:30 IST, the job throws `ReferenceError: now is not defined`, caught only by the global `unhandledRejection` handler in `server/index.js`, which logs it and moves on.
- **Why it matters:** Auto clock-out is a constitution-mandated Phase-1 cron. Right now it has **never worked** — any faculty who forget to check out stay "checked in" forever, `out_status: auto` records never exist, the auto-clockout report (`reports.controller.js → autoClockOutReport`) is permanently empty, and slot statuses never flip to `completed`.
- **Exact fix:** Declare `const now = new Date();` at the top of `autoClockOut()` — or better, compute the timestamp in IST using `lib/time.js` so it is correct regardless of the server TZ:
  ```js
  const todayIST = formatDateIST(new Date()); // 'YYYY-MM-DD'
  const autoOutTime = new Date(`${todayIST}T${String(cfg.auto_checkout_hour).padStart(2,'0')}:${String(cfg.auto_checkout_min).padStart(2,'0')}:00+05:30`);
  ```
- **Files affected:** `server/lib/cron.js`, `server/lib/time.js`
- **Codex instruction:** "In server/lib/cron.js, function autoClockOut throws because `now` is undefined. Fix by constructing autoOutTime from IST date components using formatDateIST from server/lib/time.js and an explicit +05:30 offset. Add a unit test that calls autoClockOut with a mocked prisma and asserts updateMany is called with out_status 'auto' and auto_out true. Do not change cron schedules."

### ISSUE-02 · P0 · Async errors in controllers never reach the Express error handler

- **Problem:** `attendance.controller.js`, `duty-slots.controller.js`, `violations.controller.js`, `reports.controller.js`, `messages.controller.js` and others run async Prisma calls with no try/catch and no async wrapper. Express 4 (`express@^4.21.2` in `server/package.json`) does not catch rejected promises from route handlers. A DB hiccup → unhandled rejection → the response is **never sent** and the mobile client spins until timeout.
- **Why it matters:** On a PWA with 30-second polling (`useAttendance.js`, `useMessages.js`, `useCoverRequests.js` all set `refetchInterval: 30_000`), hung requests pile up, exhaust the browser's connection pool, and make the app feel frozen — exactly the failure mode you can't debug from a faculty member's phone.
- **Exact fix:** Add a tiny wrapper and apply it in every route file:
  ```js
  // server/middleware/asyncHandler.js
  module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  ```
  Then in routes: `router.post('/:dutySlotId/check-in', authorize('faculty'), asyncHandler(ctrl.checkIn));` The existing error handler in `server/index.js` already returns the constitution's `{error, code, message}` shape.
- **Files affected:** new `server/middleware/asyncHandler.js`; all 13 files in `server/routes/`
- **Codex instruction:** "Create server/middleware/asyncHandler.js exporting (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next). Wrap every controller reference in all files under server/routes/ with asyncHandler. Do not modify controller logic. Verify the global error handler in server/index.js still returns {error:true, code, message}."

### ISSUE-03 · P1 · Late detection and check-in use server-local time, not IST

- **Problem:** `attendance.controller.js → resolveInStatus()` builds the late threshold with `new Date(now.getFullYear(), now.getMonth(), ...)` — server-local time. The codebase has a proper IST library (`server/lib/time.js`) used elsewhere, and `cron.js` carries the comment "Set TZ=Asia/Kolkata in Railway env vars". If `TZ` is ever missing or wrong on Railway, every late flag is off by 5.5 hours, silently.
- **Why it matters:** "Late IN flagged automatically" is a core constitution rule and it feeds the Late Arrival report. A timezone regression here corrupts attendance data with no error.
- **Exact fix:** Rewrite `resolveInStatus` using `nowIST()` from `lib/time.js`, comparing IST hour/minute against the `SystemConfig` thresholds. Remove all reliance on process TZ for business logic.
- **Files affected:** `server/controllers/attendance.controller.js`, `server/lib/time.js`
- **Codex instruction:** "In server/controllers/attendance.controller.js, refactor resolveInStatus to compute current IST hour and minute via nowIST() from server/lib/time.js (use getUTCHours/getUTCMinutes on the shifted date) and compare against settingsService thresholds. Add tests for morning slot at 08:14 IST (normal) and 08:16 IST (late) with default config."

### ISSUE-04 · P1 · No session-window enforcement on check-in

- **Problem:** `checkIn()` validates only `isToday(slot.duty_date)`. A faculty member can check in for an afternoon slot at 6:00 AM (status `normal`, since it's before the late threshold) and check out a minute later — duty "completed" without being present.
- **Why it matters:** Constitution: "Faculty can only check IN during their assigned duty session window." The whole point of the system is replacing a paper process people gamed.
- **Exact fix:** Add `session_start_morning_*` / `session_start_afternoon_*` (and optionally session end) to `SystemConfig` (`prisma/schema.prisma` + migration + `settings.service.js`), and reject check-in before `session_start − grace` and after session end with a `409 OUTSIDE_SESSION_WINDOW` error.
- **Files affected:** `prisma/schema.prisma`, new migration, `server/services/settings.service.js`, `server/schemas/settings.schema.js`, `server/controllers/attendance.controller.js`
- **Codex instruction:** "Add session_start_morning_hour/min and session_start_afternoon_hour/min SmallInt columns to SystemConfig in prisma/schema.prisma with defaults 8:00 and 13:00, generate a migration, expose them through settings.service.js and the updateSettingsSchema Zod schema, then in checkIn reject with 409 code OUTSIDE_SESSION_WINDOW if current IST time is more than 30 minutes before session start or after auto_checkout time."

### ISSUE-05 · P1 · Calendar auto-close fires at the *start* of the last day, not the end

- **Problem:** `cron.js → autoCloseCalendar` runs at `0 0 * * *` and closes the window when `istNow.getUTCDate() === lastDay` — i.e., at 00:00 on the 31st, the entire last day of picking is removed. The constitution says the window "auto-closes on the last day of the month", which faculty will read as "I have until the end of the month."
- **Exact fix:** Change the condition to close when the IST date is the **1st** (closing the previous month's window), or schedule at `59 23 L * *` semantics by checking `istNow.getUTCDate() === lastDay` at a `55 23 * * *` schedule.
- **Files affected:** `server/lib/cron.js`
- **Codex instruction:** "In server/lib/cron.js change autoCloseCalendar to run at '55 23 * * *' Asia/Kolkata and keep the lastDay check, so the window closes at 23:55 IST on the actual last day instead of 00:00. Update the inline comment."

### ISSUE-06 · P2 · Violations can be recorded against any owned slot, on any date

- **Problem:** `violations.controller.js → createViolation` verifies slot ownership (`faculty_id` or `covered_by`) but not that the slot is **today** or that the faculty has checked in. A faculty member can log violations against last month's slot, or a slot three weeks in the future.
- **Why it matters:** Constitution: "Violations are recorded by Faculty **during their duty session**." Backdated fines are exactly the kind of dispute the `is_flagged` system was built to avoid.
- **Exact fix:** In `createViolation`, after the ownership check, require `isToday(slot.duty_date)` (reuse `lib/time.js`) and an existing `duty_attendance` row with `in_time != null` and `out_time == null` for the slot. Return `409 NOT_ON_DUTY` otherwise. Make this Admin-overridable later if needed.
- **Files affected:** `server/controllers/violations.controller.js`
- **Codex instruction:** "In createViolation in server/controllers/violations.controller.js, after the slot ownership check add: reject 409 code NOT_ON_DUTY unless isToday(slot.duty_date) from server/lib/time.js is true AND a dutyAttendance row exists for the slot with in_time not null and out_time null. Keep all existing checks."

### ISSUE-07 · P2 · Constitution violation: raw SQL outside reports

- **Problem:** `server/lib/bot.js` uses `tx.$queryRaw` twice for the invite-token lookup. CONSTITUTION.md §2: "all DB access goes through Prisma, no raw SQL **except complex reports**." The first query is legitimately for `FOR UPDATE` row locking (Prisma 5 has no native support) — but the second (`SELECT id FROM users WHERE telegram_id = ...`) has no such excuse.
- **Exact fix:** Keep the `FOR UPDATE` query but add a comment citing the constitution exception and the locking rationale; replace the second raw query with `tx.user.findFirst({ where: { telegram_id: chatId, id: { not: targetUser.id } } })`. Note: `$queryRaw` tagged templates are parameterized, so this is a governance issue, not an injection risk.
- **Files affected:** `server/lib/bot.js`
- **Codex instruction:** "In server/lib/bot.js replace the second $queryRaw (telegram_id duplicate check) with tx.user.findFirst using Prisma query syntax. Keep the FOR UPDATE raw query but add a comment explaining it exists because Prisma lacks row-level locking."

---

## 2. Authentication & Telegram OTP

### ISSUE-08 · P0 · The login identifier is incoherent end-to-end

- **Problem:** Three different stories in one flow:
  1. `server/lib/bot.js` activation reply: *"Visit … and **login with your email**."*
  2. `client/src/pages/auth/LoginPage.jsx`: label **"Telegram ID"**, placeholder **"@username or numeric ID"**.
  3. `auth.controller.js → requestOtp` does `prisma.user.findUnique({ where: { telegram_id } })` — and `bot.js` stores the **numeric chat ID** there. A `@username` will *never* match. Faculty don't know their numeric chat ID; most will type `@username`, get `USER_NOT_FOUND`, and call the admin.
- **Why it matters:** This is the front door. SC-001 in your own spec requires login in under 60 seconds; this flow guarantees first-login failure for anyone who follows the bot's own instructions.
- **Exact fix (recommended):** Standardize on **email** as the login identifier (it's already `@unique` on `users`, and the invite flow has bound the chat ID by the time anyone can log in):
  - `auth.schema.js`: `requestOtpSchema`/`verifyOtpSchema` accept `email` (keep `telegram_id` temporarily for back-compat).
  - `auth.controller.js`: look up by email; deliver OTP to the stored `telegram_id`.
  - `LoginPage.jsx`: label "Email", `type="email"`, `autoComplete="email"`.
  - Bot message already says email — now it's true.
- **Files affected:** `server/schemas/auth.schema.js`, `server/controllers/auth.controller.js`, `client/src/pages/auth/LoginPage.jsx`, `client/src/hooks/useAuth.js`, `TELEGRAM_INVITE_FLOW_TESTING.md`
- **Codex instruction:** "Switch login identity to email. In server/schemas/auth.schema.js change requestOtpSchema and verifyOtpSchema to require a valid email field. In server/controllers/auth.controller.js requestOtp and verifyOtp, find the user with prisma.user.findUnique({where:{email}}) and keep all existing status/lockout/cooldown logic; OTP still goes to user.telegram_id. Update client/src/pages/auth/LoginPage.jsx to ask for Email (type=email, autoComplete=email) and useRequestOtp/useVerifyOtp in client/src/hooks/useAuth.js to send {email}. Keep generic error messages to avoid account enumeration."

### ISSUE-09 · P1 · OTP request leaks account existence

- **Problem:** `requestOtp` returns `404 USER_NOT_FOUND` for unknown IDs, `403 TELEGRAM_NOT_LINKED` for pending users, `403 ACCOUNT_LOCKED` for locked ones — a clean enumeration oracle on an unauthenticated, public endpoint. (`verifyOtp` does this correctly with a generic `INVALID_CREDENTIALS`.)
- **Exact fix:** For unknown/inactive users, return the same `200 {"message":"If an account exists, an OTP has been sent."}`. Keep `ACCOUNT_LOCKED` (the user must know to contact admin) and `TELEGRAM_NOT_LINKED` (legitimate onboarding state) — but only after a successful identity match policy decision; at minimum collapse `USER_NOT_FOUND` into the generic response.
- **Files affected:** `server/controllers/auth.controller.js`
- **Codex instruction:** "In requestOtp in server/controllers/auth.controller.js, replace the 404 USER_NOT_FOUND responses (unknown user, deleted, status not active) with a single 200 response {message:'If an account exists with this email, an OTP has been sent.'}. Keep ACCOUNT_LOCKED and TELEGRAM_NOT_LINKED behavior unchanged. Do not reveal whether the account exists in logs returned to the client."

### ISSUE-10 · P1 · OTP sessions are never invalidated after use of a newer one, and old rows accumulate

- **Problem:** `verifyOtp` picks the latest unexpired session, but earlier unexpired OTPs remain valid (a user can request at minute 0 and minute 2; both codes work). And no cron ever deletes expired `otp_sessions` rows.
- **Exact fix:** On creating a new OTP session, `updateMany` previous unverified sessions for that user to expired (`expires_at: new Date()`); add a daily cleanup in `cron.js` deleting `otp_sessions` where `expires_at < NOW() - interval 7 days`.
- **Files affected:** `server/controllers/auth.controller.js`, `server/lib/cron.js`
- **Codex instruction:** "In requestOtp, before creating a new otpSession, run prisma.otpSession.updateMany({where:{user_id:user.id, verified:false}, data:{expires_at:new Date()}}). In server/lib/cron.js add a daily job at 03:00 IST deleting otpSession rows with expires_at older than 7 days."

### ISSUE-11 · P2 · Logout doesn't clear the CSRF cookie; clearCookie options drift

- **Problem:** `auth.controller.js → logout` clears `sims_token` with hand-written options (`sameSite: 'strict'`) instead of `clearCookieOptions()` from `lib/cookieOptions.js` (which exists, exported, unused), and never clears `sims_csrf`.
- **Exact fix:** Use `clearCookieOptions()` for both cookies, and align its `sameSite` with `authCookieOptions()`.
- **Files affected:** `server/controllers/auth.controller.js`, `server/lib/cookieOptions.js`
- **Codex instruction:** "In logout in auth.controller.js, clear both sims_token and sims_csrf using clearCookieOptions() imported from ../lib/cookieOptions. In cookieOptions.js make clearCookieOptions sameSite match authCookieOptions (none in production, lax in dev)."

---

## 3. Security (beyond auth)

### ISSUE-12 · P1 · CSRF token rotates on every GET — races with parallel TanStack queries

- **Problem:** `server/middleware/csrf.js` sets a brand-new `sims_csrf` cookie on **every** GET. Dashboards fire 3–6 parallel queries (e.g., `AdminDashboardPage` + 30s polling hooks). Responses race; the cookie can change between the moment `client/src/utils/api.js` reads it (`getCookie('sims_csrf')`) and the moment the browser attaches the cookie header — producing sporadic `403 CSRF_TOKEN_INVALID` on legitimate mutations. It also adds `Set-Cookie` to every GET, defeating any HTTP caching.
- **Exact fix:** Only issue a token when the cookie is absent:
  ```js
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.cookies?.sims_csrf) { ...set cookie... }
  ```
  Double-submit doesn't require rotation per request.
- **Files affected:** `server/middleware/csrf.js`
- **Codex instruction:** "In server/middleware/csrf.js, only generate and set the sims_csrf cookie on GET/HEAD when req.cookies.sims_csrf is missing. Keep the timing-safe validation for mutations exactly as is."

### ISSUE-13 · P1 · Global rate limit will 429 the whole college (shared NAT IP)

- **Problem:** `server/index.js` global limiter: **100 requests / 15 min per IP** in production. Your own polling design (three hooks at 30s = ~90 requests/15min **per logged-in user**) means **one** active admin dashboard nearly exhausts the limit — and a college campus typically NATs all faculty behind one or two public IPs. Expect mass `RATE_LIMITED` errors within minutes of go-live.
- **Exact fix:** Raise the global cap substantially (e.g., 2,000/15min/IP) as a DoS backstop only, and add a per-user limiter keyed on the JWT `sub` for authenticated routes. Keep the strict 5/15min OTP limiter in `auth.routes.js` (that one is correct).
- **Files affected:** `server/index.js`
- **Codex instruction:** "In server/index.js raise globalLimiter max to 2000 in production. Add a second authenticated limiter (max 600/15min) applied after authenticate-capable routes, with keyGenerator using the JWT sub claim when the sims_token cookie parses, falling back to IP. Do not change the OTP limiter in auth.routes.js."

### ISSUE-14 · P2 · CSP allows `'unsafe-inline'` scripts

- **Problem:** `server/index.js` helmet config: `scriptSrc: ["'self'", "'unsafe-inline'"]` with the comment "Vite module scripts + preloads". Production Vite builds emit external module scripts and do **not** need inline script permission; `'unsafe-inline'` neuters CSP's primary XSS defense. (`styleSrc 'unsafe-inline'` is genuinely needed — `LoginPage.jsx` and `Sidebar.jsx` use inline style objects heavily.)
- **Exact fix:** Remove `'unsafe-inline'` from `scriptSrc`, build, and verify the bundle loads. Keep it for `styleSrc`.
- **Files affected:** `server/index.js`
- **Codex instruction:** "In the helmet contentSecurityPolicy in server/index.js, remove 'unsafe-inline' from scriptSrc only. Run the production build and confirm the client loads with no CSP violations in the console."

### ISSUE-15 · P2 · Production cookies use `SameSite=None` but the app is same-origin

- **Problem:** `lib/cookieOptions.js` sets `sameSite: 'none'` in production, but `server/index.js` serves `client/dist` from the **same origin** in production. `None` is only needed for cross-site cookies and maximally weakens CSRF posture (your CSRF middleware then becomes the only line of defense).
- **Exact fix:** Use `sameSite: 'lax'` in production (works for same-origin SPA + top-level navigations). Only switch to `none` if you later split the client to a different domain.
- **Files affected:** `server/lib/cookieOptions.js`
- **Codex instruction:** "In server/lib/cookieOptions.js change authCookieOptions and csrfCookieOptions sameSite to 'lax' in all environments, with a comment explaining 'none' is only required if the client is ever served from a different origin than the API."

### ISSUE-16 · P3 · Webhook accepts the secret in the URL path

- **Problem:** `bot.routes.js` validates `/bot/webhook/:secret` from the URL. URL paths land in proxy/Morgan access logs. Telegram ≥6.9 sends `X-Telegram-Bot-Api-Secret-Token`, which you already check as a fallback.
- **Exact fix:** Make the header the primary (eventually only) mechanism; register the webhook with `secret_token` and a static path. Redact `:secret` from Morgan logs meanwhile.
- **Files affected:** `server/routes/bot.routes.js`, `server/index.js` (morgan format), `TELEGRAM_WEBHOOK_REGISTRATION_GUIDE.md`

---

## 4. Database Schema

Strong overall: matches the constitution's hard rules (UUIDs, `DECIMAL(8,2)` for `fine_amount`/`default_fine`, timestamps everywhere, soft deletes, immutable audit log, the right indexes including `cover_requests(status, expires_at)` and `violations(is_flagged)`, plus a smart `@@unique([duty_date, session_type])` on `duty_slots`).

### ISSUE-17 · P1 · Schema documentation has drifted from reality — constitution forbids this

- **Problem:** `SIMS_Database_Schema_v2.0.md` says **13 tables**; `prisma/schema.prisma` has **15 models** (added: `AdminAuditLog`, `SystemConfig`) plus undocumented columns: `users.otp_failed_attempts`, `users.session_version`, `users.telegram_invite_token`, `users.telegram_invite_expires_at`, and the `pending_telegram` status. The constitution: "Never add a new table or column without checking this constitution first." The additions are *good* — the paperwork wasn't done.
- **Exact fix:** Publish `SIMS_Database_Schema_v2.1.md` and bump CONSTITUTION.md §5 to 15 tables, documenting `system_config`, `admin_audit_log`, the invite-token flow, and the 4-state `UserStatus`.
- **Files affected:** `SIMS_Database_Schema_v2.0.md`, `CONSTITUTION.md`, `SIMS_API_Endpoints_v2.0.md`
- **Codex instruction:** "Generate SIMS_Database_Schema_v2.1.md from prisma/schema.prisma covering all 15 models, all columns, enums, and indexes, in the same table format as v2.0. Update CONSTITUTION.md section 5 table list and version note accordingly."

### ISSUE-18 · P2 · `messages.deleted_by_*` purge path deletes physically

- **Problem:** `messages.controller.js → deleteMessage` performs `prisma.message.delete` when both parties have deleted — a physical delete by non-Super-Admin, which the constitution prohibits ("Never physically delete records unless the caller is Super Admin using the hard-delete endpoint"). Defensible product behavior, but it contradicts the written rule.
- **Exact fix:** Either add `deleted_at` to `Message` and soft-delete, or amend the constitution with an explicit carve-out for mutually-deleted messages.
- **Files affected:** `server/controllers/messages.controller.js`, `prisma/schema.prisma` or `CONSTITUTION.md`

### ISSUE-19 · P3 · Missing FK index on a few hot paths

- `violations(violation_type_id)` (used by the violation-type breakdown report) and `messages(from_user_id)` lack explicit indexes (Prisma/Postgres does not auto-index FK columns). At 30 faculty this is invisible; add them in the next migration for free insurance.

---

## 5. Workflow Reviews

### Attendance (Module 6) — **7/10**
What's right: idempotent check-in/out with clear 409 codes (`ALREADY_CHECKED_IN`, `NOT_CHECKED_IN`), cover-aware ownership (`faculty_id` OR `covered_by` — "Phase 4" comments), `getLive` shaping a clean polling payload with `performed_by_id`, Admin override behind `overrideSchema` validation. What's broken: ISSUE-01 (auto clock-out dead), ISSUE-03 (local-time late detection), ISSUE-04 (no session window). Fix those three and this module is done.

### Violations (Module 7) — **8/10**
Best module in the codebase. Every mutation writes `violation_audit_log` via `auditViolation()` with before/after snapshots; `editViolation` correctly blocks edits after flagging (`ALREADY_FLAGGED`); `getViolation` enforces faculty-own-records; "Others" type requires `custom_violation`; warning-only zeroes the fine; pagination capped at 100. Gaps: ISSUE-06 (no on-duty check), and `listViolations` date filter builds the day range in server-local time (same IST inconsistency family as ISSUE-03).

### Duty Slots (Module 5) — **8/10**
`pickSlot` is textbook: limit check + availability check + create inside `prisma.$transaction`, with `P2002` handled as a friendly `SLOT_TAKEN` — the `@@unique` constraint backstops any race. `getAvailableSlots` returns `slots_remaining`, which the mobile picker needs. Gap: date strings flow through `new Date('YYYY-MM-DD')` (UTC midnight) while `monthDateRange` uses local-time boundaries — works only while `TZ=Asia/Kolkata`; consolidate on `lib/time.js`.

### Need Cover (Module 9) — **6/10**
Transactionally sound (`createCoverRequest` checks `max_cover_requests_per_slot` inside the transaction; extra endpoints `reject-volunteer` and cancel are sensible additions beyond the API doc). **Missing: Telegram notifications.** The constitution lists cover requests under "All system notifications… sent via Telegram Bot only," yet `cover-requests.controller.js` never imports `lib/telegram` — faculty won't know a broadcast exists unless they open the app, which defeats a 48-hour-expiry broadcast model. Add notify-all-faculty on create, notify-requester on volunteer, notify-both on confirm (fire-and-forget like `calendar.controller.js → notifyAllFaculty`).
**Codex instruction:** "In server/controllers/cover-requests.controller.js, after successful createCoverRequest send a Telegram broadcast to all active faculty except the requester (pattern from notifyAllFaculty in calendar.controller.js, fire-and-forget with .catch logging); after volunteer notify the requester; after confirmCover notify requester and volunteer. Never block or fail the HTTP response on Telegram errors."

### Students (Module 3) — **8/10**
Memory-only multer with MIME filter and 5MB cap, dedicated `handleUploadError` for clean 413/415 responses, upsert-by-`registration_number` with `student_upload_log` error capture. Verify one behavior against the constitution: rows present in DB but missing from the uploaded Excel must be **deactivated** (`deactivated_count` exists in the schema — confirm `uploadStudents` in `students.controller.js` actually performs that pass).

### Messages (Module 10) — **7/10**
Correct two-sided soft delete flags, auto-mark-read on `GET /messages/:id`, phase-5 indexes migration exists, 30s inbox polling. Gap: ISSUE-18, and no max-length sanity beyond Zod (confirm `sendMessageSchema` caps `body`).

### Reports — **7/10**
All 16 endpoints exist in `reports.routes.js`, Admin-gated, with in-memory aggregation over Prisma (fine at this scale, and conveniently constitution-compliant: zero raw SQL). Gaps: no CSV/Excel **export** (a discipline office will ask for this in week one — you already ship `exceljs`); date filters share the local-time issue; no caching headers (each report re-aggregates per request, acceptable for now).

---

## 6. Frontend

### Architecture — **7/10**
The hooks layer is the right call: one file per domain (`useViolations.js`, `useDutySlots.js`, …), components never call axios directly, `staleTime: 30_000` default matching the polling architecture, CSRF interceptor + 401-redirect interceptor in `utils/api.js`, role-grouped pages, `ProtectedRoute` with `requiredRoles`, `ErrorBoundary` at the root.

### ISSUE-20 · P1 · `/faculty/*` routes are open to every authenticated role — and admins get a broken experience

- **Problem:** In `client/src/App.jsx`, the faculty route group uses `<ProtectedRoute user={user} isLoading={isLoading} />` with **no** `requiredRoles`. An admin navigating to `/faculty/attendance` renders faculty pages whose API calls (`POST /attendance/:id/check-in` is `authorize('faculty')`) will all 403. Server RBAC holds (good), but the client invites dead-end screens.
- **Exact fix:** `requiredRoles={['faculty']}` on that route group (or deliberately allow super_admin and handle empty states).
- **Files affected:** `client/src/App.jsx`
- **Codex instruction:** "In client/src/App.jsx add requiredRoles={['faculty']} to the faculty ProtectedRoute group. Verify an admin visiting /faculty/dashboard is redirected per ProtectedRoute's existing deny behavior."

### ISSUE-21 · P2 · Two competing styling systems

- **Problem:** `LoginPage.jsx` and large parts of `Sidebar.jsx` are built with multi-hundred-line inline `style={{}}` objects; the rest of the app uses Tailwind + the `ui/` kit (`Button.jsx`, `Table.jsx`, `Modal.jsx`…). There's also a parallel shadcn track (`components/ui/dialog.tsx`, `lib/utils.ts`, `components.json`, both `radix-ui` and `shadcn` in `client/package.json`) that's barely used. This forces ISSUE-14's `unsafe-inline` styles and doubles every future restyle.
- **Exact fix:** Migrate LoginPage and Sidebar to Tailwind; delete the unused shadcn scaffolding or commit to it — not both.
- **Files affected:** `client/src/pages/auth/LoginPage.jsx`, `client/src/components/Sidebar.jsx`, `client/package.json`

### Mobile UX — **7.5/10**
Genuinely mobile-first: bottom tab bar with `env(safe-area-inset-bottom)`, bottom-sheet drawer (`translateY` transition, `bottom: 60`), `h-12` touch targets in `Button.jsx` (≥44px ✓), 6-box OTP input with `inputMode="numeric"`, auto-advance, backspace/arrow navigation, and paste distribution — that's better than most banking apps. `MOBILE_DESIGN_RULES.md` exists and is followed.

Gaps:
1. **OTP autofill (P2):** the OTP inputs lack `autoComplete="one-time-code"`. iOS/Android won't offer the code from the notification. One attribute on the first input in `LoginPage.jsx`.
2. **Tables on phones (P2):** `ui/Table.jsx` has a single `overflow-x-auto` wrapper — admin pages (`UsersPage`, `ViolationsPage`, `StudentsPage`) become sideways-scroll spreadsheets on a 360px screen. Add a card-list variant under `md:` for the three highest-traffic tables.
3. **Optimistic IN/OUT (P2):** the constitution specifies "Optimistic UI on IN/OUT button," but `useAttendance.js` mutations have no `onMutate` optimistic update — on flaky campus Wi-Fi the button feels dead for 2–4 s. Add TanStack `onMutate`/`onError` rollback to check-in/check-out.
4. **Visual hierarchy (P3):** `PageHeader` title at `text-lg` with `text-xs text-slate-400` subtitles is timid for a glance-first duty app; the faculty dashboard's primary state ("You're ON DUTY / next duty Thu AM") should be the largest element on screen. 12px slate-400 on white is also borderline WCAG AA — bump to `slate-500`/13px minimum.

### ISSUE-22 · P2 · PWA runtime API caching is a silent no-op (and would be risky if it worked)

- **Problem:** In `client/vite.config.js`, the Workbox `runtimeCaching.urlPattern` is `/^\/(?:auth|users|…)\//` — anchored to start-of-string, but Workbox matches against the **full URL** (`https://host/users/me`), so it never matches. Net effect: no API caching at all (offline shows a blank shell). And if you "fixed" the regex naively, you'd be caching authenticated per-user JSON in a shared cache — worse.
- **Exact fix:** Match with a function (`({url}) => url.pathname.startsWith(...)`), cache **only** safe, role-agnostic GETs (`/violation-types`, `/calendar/:y/:m`), `NetworkFirst` with short `maxAgeSeconds`, and never cache `/users/me`, `/messages`, `/attendance`. Add a real offline fallback page.
- **Files affected:** `client/vite.config.js`
- **Codex instruction:** "In client/vite.config.js VitePWA workbox.runtimeCaching, replace the regex urlPattern with a function matcher ({url}) => ['/violation-types','/calendar'].some(p => url.pathname.startsWith(p)), NetworkFirst, maxEntries 20, maxAgeSeconds 3600. Explicitly do not cache /users, /messages, /attendance, /auth. Add a navigateFallback offline page."

### ISSUE-23 · P3 · Manifest icon will fail install prompts

`client/public/manifest.json` ships a single SVG icon with `"sizes": "any"`. Chrome's installability check wants at least a 192×192 and 512×512 **PNG**, and `purpose: "any maskable"` on one SVG is an anti-pattern (maskable needs safe-zone padding). Generate 192/512 PNGs + a separate maskable.

---

## 7. Deployment, Testing, Documentation

### Deployment — **7/10**
`railway.toml` is correct and tidy: nixpacks, `npm run generate && build`, `migrate:deploy` before `start`, `/health` healthcheck (registered before the rate limiter — nice), restart policy. `trust proxy 1` is set for Railway. `.env.example` exists. Gaps: `/health` doesn't probe the DB (a dead `DATABASE_URL` still reports `ok` — add a `SELECT 1` via `prisma.$queryRaw` with a constitution-exception comment, or `prisma.user.count` with a timeout); single-instance assumption for `node-cron` is fine now but document "do not scale to 2 replicas" or jobs run twice; graceful shutdown (`SIGTERM` → close server → `prisma.$disconnect`) is missing, so Railway redeploys can drop in-flight requests.

### ISSUE-24 · P0 · Zero tests, zero CI

- **Problem:** No `*.test.js` anywhere (the only "test" is the manual `test-invite-flow.js` script). This system computes **fines**, locks **accounts**, and keeps **legally-sensitive audit trails** — with no regression net. ISSUE-01 is exactly the class of bug one smoke test would have caught.
- **Exact fix:** Vitest + Supertest. Priority order: (1) auth flow incl. lockout-after-5 and cooldown, (2) `pickSlot` race/limit logic, (3) `createViolation` + audit-log write, (4) cron functions as pure units, (5) CSRF middleware. Add GitHub Actions running lint + tests on PR.
- **Files affected:** new `server/tests/`, `package.json`, `.github/workflows/ci.yml`
- **Codex instruction:** "Add vitest and supertest to the server workspace. Create server/tests covering: auth.controller (OTP request cooldown, 5-failure lockout, successful verify sets cookie), duty-slots pickSlot (limit reached, slot taken, success) with a mocked Prisma client, cron autoClockOut as a pure function, and csrf middleware (missing token 403, valid token passes). Add .github/workflows/ci.yml running npm ci, lint, and tests on push and PR."

### Documentation — **6.5/10**
Unusually rich for a solo Phase-1 project (CONSTITUTION, schema/API docs, MOBILE_DESIGN_RULES, DEPLOYMENT_VERIFICATION_CHECKLIST, webhook guide, invite-flow testing guide). But it has drifted: `specs/001-auth-user-accounts/spec.md` still references a **Coordinator** role and "4 roles" (US-2, FR-009, SC-004) — the constitution abolished Coordinator in v2; ISSUE-17 covers the schema drift; the API doc doesn't list shipped endpoints like `PATCH /calendar/:y/:m/working-days`, `POST /cover-requests/:id/reject-volunteer`, `GET /users/me`, `/reports/*`, `/bot/webhook`. Stale specs are how the next contributor reintroduces Coordinator.

---

# Part 2 — Verdicts

## Ratings

| Dimension | Score | One-line justification |
|---|---|---|
| Mobile UX | 7.5/10 | Real bottom-nav PWA with excellent OTP input; tables and optimistic IN/OUT missing |
| Visual hierarchy | 6.5/10 | Clean but timid; primary duty state under-emphasized; low-contrast captions |
| Frontend architecture | 7/10 | Disciplined hooks layer; dual styling systems and one RBAC route-group hole |
| Backend architecture | 7.5/10 | Clean route→schema→controller layering; missing async error wrapper |
| Auth & Telegram OTP | 6/10 | Strong internals (lockout, cooldown, session_version); incoherent login identifier |
| Role-based access | 8/10 | Server-side RBAC consistent across all 13 route files; one client gap |
| Database schema | 8.5/10 | Constitution-grade; docs drifted |
| Attendance workflow | 7/10 | Solid, but auto clock-out is dead and the session window isn't enforced |
| Violations workflow | 8/10 | Audit-complete; needs on-duty enforcement |
| Duty slots workflow | 8/10 | Transactional with DB-level uniqueness backstop |
| Cover requests | 6/10 | Correct mechanics, zero notifications |
| Admin dashboard | 7/10 | Full coverage incl. live polling board |
| Faculty dashboard | 7/10 | Functional; needs duty-state prominence + optimistic UI |
| Reports | 7/10 | All 16 present; no export |
| Messages | 7/10 | Works; physical-delete edge case |
| Security | 6.5/10 | Good cookie/JWT/CSRF posture undermined by rotation bug, rate-limit sizing, CSP inline scripts |
| Performance | 7.5/10 | Right-sized for 30 users; rate limiter is the actual bottleneck |
| Deployment | 7/10 | Railway config correct; shallow healthcheck, no graceful shutdown |
| Testing | 1/10 | None |
| Documentation | 6.5/10 | Abundant but drifted |

**Overall project rating: 7/10** — disciplined, constitution-driven engineering, clearly beyond typical Phase-1 quality.
**Production readiness: 5/10** — one dead cron, one broken login story, hanging error paths, and no tests mean real faculty would hit failures in week one.

## Top 10 Urgent Fixes (in order)

1. **ISSUE-01** — Fix `now` ReferenceError in `cron.js → autoClockOut` (system currently never auto-clocks-out).
2. **ISSUE-08** — Unify login identity on email across bot message, `LoginPage.jsx`, and `auth.controller.js`.
3. **ISSUE-02** — `asyncHandler` wrapper on all routes so Prisma errors return JSON instead of hanging.
4. **ISSUE-13** — Resize the global rate limiter before the campus NAT 429-storms everyone.
5. **ISSUE-12** — Stop rotating the CSRF cookie on every GET.
6. **ISSUE-24** — Minimum test suite + CI (auth lockout, pickSlot, createViolation, crons).
7. **ISSUE-03 + ISSUE-04** — IST-correct late detection and session-window check-in enforcement.
8. **ISSUE-20** — `requiredRoles={['faculty']}` on the faculty route group in `App.jsx`.
9. **Cover-request Telegram notifications** (constitution-mandated, currently absent).
10. **ISSUE-09** — Remove the account-enumeration oracle from `/auth/request-otp`.

## Top 10 Feature Improvements

1. CSV/Excel export on all 16 reports (you already ship `exceljs`).
2. Optimistic IN/OUT with `onMutate` rollback in `useAttendance.js`.
3. Mobile card-list views for Users / Students / Violations tables.
4. Telegram duty reminders (evening-before + morning-of) — small cron addition.
5. `autoComplete="one-time-code"` + Telegram deep-link button on the login screen.
6. Faculty dashboard "duty state hero" (ON DUTY now / next duty / check-in CTA).
7. Unread-message badge on the Messages tab via the existing 30s inbox poll.
8. Admin "month-readiness" checklist on `CalendarPage` (working days set → holidays blocked → open window).
9. Violation receipt view (printable/shareable summary per violation for the student file).
10. Proper PWA offline shell + safe runtime caching (ISSUE-22) and installable icons (ISSUE-23).

## 30-Day Roadmap

**Week 1 — Stop the bleeding (P0s).** Fix ISSUE-01, ISSUE-02, ISSUE-08, ISSUE-12, ISSUE-13, ISSUE-20. Stand up Vitest + CI with the first 10 tests (auth lockout, pickSlot races, autoClockOut). Deploy to Railway staging; run `DEPLOYMENT_VERIFICATION_CHECKLIST.md` end-to-end with a real Telegram account.

**Week 2 — Business-rule integrity.** ISSUE-03/04 (IST + session window), ISSUE-05 (auto-close timing), ISSUE-06 (on-duty violation recording), ISSUE-09/10/11 (auth hardening), cover-request Telegram notifications. Expand tests to attendance and violations controllers.

**Week 3 — Mobile polish + reports.** Optimistic IN/OUT, card-list tables, OTP autofill, dashboard duty-state hero, contrast fixes, report CSV export, PWA caching/icon fixes (ISSUE-22/23). Migrate LoginPage/Sidebar off inline styles; delete the unused shadcn track (ISSUE-21).

**Week 4 — Hardening + truth in docs.** CSP without inline scripts (ISSUE-14), SameSite=lax (ISSUE-15), webhook header-only secret (ISSUE-16), DB-probing `/health` + graceful shutdown, FK indexes (ISSUE-19), message-delete policy decision (ISSUE-18). Publish Schema v2.1 + API v2.1, purge "Coordinator" from `specs/001/spec.md`, bump CONSTITUTION to v2.7. Then a 3–5 faculty pilot week before full rollout.

## Final Codex Prompt (all high-priority fixes, safely)

```
You are working on the SIMS DMS monorepo (Node/Express + Prisma in /server and /prisma, React/Vite in /client). Read CONSTITUTION.md first and do not violate it: UUID PKs, DECIMAL(8,2) money, Zod on all inputs, Winston only (no console.log in server code), httpOnly cookies, exactly 3 roles, soft deletes. Make each numbered change in its own commit, smallest possible diff, no refactors beyond what is specified, and run the client build plus all tests after each commit.

1. server/lib/cron.js — autoClockOut references an undefined `now`. Build autoOutTime from IST components using formatDateIST from server/lib/time.js with an explicit +05:30 offset. Also change autoCloseCalendar's schedule to '55 23 * * *' (Asia/Kolkata), keeping the last-day check, so the window closes at end of the last day.

2. Create server/middleware/asyncHandler.js exporting (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next). Wrap every controller handler in every file under server/routes/ with it. Do not change controller code.

3. Unify login on email. server/schemas/auth.schema.js: requestOtpSchema and verifyOtpSchema take a validated email field. server/controllers/auth.controller.js: look up users by email; OTP still delivered to user.telegram_id; preserve cooldown, 5-attempt lockout, and session_version logic. Replace the 404 USER_NOT_FOUND responses in requestOtp with a single generic 200 {message:'If an account exists with this email, an OTP has been sent.'} (keep ACCOUNT_LOCKED and TELEGRAM_NOT_LINKED). In requestOtp, expire prior unverified otpSession rows for the user before creating a new one. client/src/pages/auth/LoginPage.jsx: field becomes Email (type=email, autoComplete=email); add autoComplete="one-time-code" to the first OTP box. client/src/hooks/useAuth.js: send {email}. The bot.js activation message already says email — leave it.

4. server/middleware/csrf.js — only set the sims_csrf cookie on GET/HEAD when req.cookies.sims_csrf is absent. Keep timing-safe validation unchanged. In auth.controller.js logout, clear both sims_token and sims_csrf using clearCookieOptions() from ../lib/cookieOptions, and align clearCookieOptions sameSite with authCookieOptions.

5. server/index.js — raise globalLimiter max to 2000 in production as a DoS backstop; add an authenticated per-user limiter (600/15min) keyed on the JWT sub from the sims_token cookie, falling back to IP. Leave the OTP limiter in auth.routes.js untouched. Remove 'unsafe-inline' from CSP scriptSrc only (keep it for styleSrc) and verify the production build loads.

6. client/src/App.jsx — add requiredRoles={['faculty']} to the faculty ProtectedRoute group.

7. server/controllers/attendance.controller.js — rewrite resolveInStatus to use nowIST() from server/lib/time.js instead of server-local Date construction. Add session_start_morning_hour/min (default 8:00) and session_start_afternoon_hour/min (default 13:00) to the SystemConfig model with a Prisma migration, expose them via settings.service.js and the Zod settings schema, and reject checkIn with 409 OUTSIDE_SESSION_WINDOW when current IST time is more than 30 minutes before session start or after the auto-checkout time.

8. server/controllers/cover-requests.controller.js — after createCoverRequest succeeds, fire-and-forget Telegram messages to all active faculty except the requester (copy the notifyAllFaculty pattern in calendar.controller.js, .catch into Winston); notify the requester on volunteer; notify requester and volunteer on confirmCover. Telegram failures must never affect HTTP responses.

9. Testing: add vitest + supertest to the server workspace. Write tests for: OTP request cooldown and generic-response behavior; 5-failure account lockout; successful verify sets the sims_token cookie; pickSlot limit-reached, slot-taken, and success paths (mocked Prisma); autoClockOut unit test asserting auto_out true and out_status 'auto'; csrf middleware 403-on-missing and pass-on-valid. Add .github/workflows/ci.yml running npm ci, client build, server lint, and tests on push/PR.

10. Docs: regenerate SIMS_Database_Schema_v2.1.md from prisma/schema.prisma (all 15 models), update CONSTITUTION.md section 5 to match, and remove all Coordinator/4-role references from specs/001-auth-user-accounts/spec.md.

Acceptance: all tests green, client production build succeeds with no CSP console errors, npm run migrate works on a fresh database, and grep confirms zero console.log under server/ (prisma/seed.js excluded).
```

---

*End of report. Every issue above cites the actual file and function reviewed; nothing here is speculative boilerplate.*
