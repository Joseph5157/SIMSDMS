# SIMS DMS Production Fix & Improvement Plan

> Place this file in the **project root** and give it to Codex as the working instruction file.  
> Recommended filename: `SIMS_DMS_PRODUCTION_FIX_PLAN.md`

---

## 0. How to Use This File With Codex

This file is intended to guide Codex to improve the SIMS DMS project safely.

### Recommended workflow

Do **not** ask Codex to implement every item in one uncontrolled pass.

Use this order:

1. Create a new Git branch.
2. Ask Codex to read this file.
3. Ask Codex to implement **one phase at a time**.
4. After every phase:
   - review changed files
   - run Prisma generate/migration where needed
   - run build
   - run tests
   - manually verify the workflow
5. Commit each phase separately.

### Suggested branch name

```bash
git checkout -b production-hardening-phase-1
```

### Recommended Codex instruction

```text
Read SIMS_DMS_PRODUCTION_FIX_PLAN.md from the project root.

Implement only Phase 1 first.

Do not redesign unrelated UI.
Do not rename routes unnecessarily.
Do not remove existing features.
Prefer small, safe patches.
After changes, list every changed file, explain each change, and mention any migration created.
Run build/tests if possible and report errors honestly.
```

---

## 1. Current Project Understanding

The uploaded SIMS DMS project appears to use:

- Frontend: React + Vite + Tailwind + React Query
- Backend: Express.js
- ORM: Prisma
- Database: PostgreSQL
- Authentication: Telegram invite + OTP + JWT stored in httpOnly cookie
- Deployment target: Railway
- Main schema file: `prisma/schema.prisma`

Important note:

The ZIP may not contain installed dependencies. If `npm run build` fails with `vite: not found`, run dependency installation first:

```bash
npm ci
```

or if lockfiles are inconsistent:

```bash
npm install
```

---

## 2. Production Readiness Summary

### Overall project rating

**7.1 / 10**

The project has a strong MVP foundation and most domain workflows exist.

### Production readiness rating

**5.4 / 10**

The project should not be treated as fully production-ready until the high-priority security, workflow, data safety, and testing issues are fixed.

### Main blockers

1. Authenticated users may remain valid after deactivation/deletion.
2. Cookie authentication does not appear to have CSRF protection.
3. Covered faculty cannot fully perform attendance/violation workflows.
4. Duty slot and cover request workflows need transaction safety.
5. Student upload can accidentally deactivate many students.
6. PWA/service worker may cache sensitive API responses.
7. Automated tests are not sufficient.
8. Some documentation and testing scripts appear stale.

---

# 3. Implementation Phases

## Phase 1 — Security and Authentication Hardening

### 1.1 Add database-backed session validation

**Priority:** P0

**Problem:**  
`server/middleware/authenticate.js` verifies JWT but should also verify that the user still exists, is active, is not deleted, and has a valid current session version.

**Why it matters:**  
If an admin deactivates or deletes a user, the user's old JWT cookie may still work until expiry.

**Exact fix:**

- Add `session_version Int @default(0)` to `User` in `prisma/schema.prisma`.
- Include `session_version` in JWT payload during successful OTP verification.
- In `authenticate.js`, after JWT verification:
  - fetch user by ID
  - reject if user does not exist
  - reject if `deleted_at` is not null
  - reject if `status !== 'active'`
  - reject if JWT `session_version` does not match DB value
- Increment `session_version` when:
  - user is deactivated
  - user is deleted/soft-deleted
  - user is reactivated
  - user login is reset
  - user role changes

**Files likely affected:**

- `prisma/schema.prisma`
- `server/middleware/authenticate.js`
- `server/controllers/auth.controller.js`
- `server/controllers/users.controller.js`
- Prisma migration file

**Codex-ready instruction:**

```text
Implement database-backed session validation. Add session_version to User, include it in JWT payload, validate the fresh DB user on every authenticated request, and increment session_version on user deactivation, deletion, reactivation, login reset, and role-sensitive account changes.
```

---

### 1.2 Add CSRF protection for cookie auth

**Priority:** P0

**Problem:**  
Auth uses httpOnly cookies. If production cookie uses `SameSite=None` or weak same-site assumptions, mutating routes may be exposed to CSRF.

**Why it matters:**  
An attacker could trigger unwanted POST/PATCH/DELETE requests from another site if browser cookies are automatically sent.

**Exact fix:**

- Add a non-httpOnly CSRF cookie, for example `sims_csrf`, after successful OTP verification.
- Axios should read `sims_csrf` and send it as `X-CSRF-Token`.
- Server should reject unsafe methods if cookie/header mismatch:
  - `POST`
  - `PATCH`
  - `PUT`
  - `DELETE`
- Exempt public auth routes only where needed:
  - OTP request
  - OTP verify
  - Telegram webhook
- Prefer `sameSite: 'lax'` if frontend/backend are deployed same-origin.
- If `sameSite: 'none'` is needed, CSRF is mandatory.

**Files likely affected:**

- `server/controllers/auth.controller.js`
- `server/index.js`
- `server/middleware/csrf.js`
- `client/src/lib/api.js`

**Codex-ready instruction:**

```text
Add CSRF protection for all unsafe cookie-authenticated requests. Generate a sims_csrf cookie after successful OTP verification, send X-CSRF-Token from Axios, and reject unsafe requests when header and cookie do not match. Exempt only public auth and Telegram webhook routes where necessary.
```

---

### 1.3 Centralize auth cookie options

**Priority:** P1

**Problem:**  
Login cookie and logout cookie-clearing options may not match exactly.

**Why it matters:**  
In production, logout may fail to clear the auth cookie if options differ.

**Exact fix:**

- Create a helper such as `server/lib/cookieOptions.js`.
- Use the same cookie options for:
  - setting `sims_token`
  - clearing `sims_token`
  - setting/clearing CSRF cookie where appropriate
- Use JWT expiry to calculate cookie `maxAge`.

**Files likely affected:**

- `server/controllers/auth.controller.js`
- `server/lib/cookieOptions.js`

**Codex-ready instruction:**

```text
Create a shared auth cookie options helper and use it for both setting and clearing sims_token. Make cookie maxAge respect JWT_EXPIRES_IN using existing expiry parsing logic.
```

---

### 1.4 Fix Telegram webhook secret validation

**Priority:** P1

**Problem:**  
If `crypto.timingSafeEqual` is used with buffers of different lengths, it can throw.

**Why it matters:**  
Invalid webhook secrets should return 403, not crash into 500.

**Exact fix:**

- Compare buffer lengths before `timingSafeEqual`.
- Prefer or additionally support Telegram's `X-Telegram-Bot-Api-Secret-Token` header.

**Files likely affected:**

- `server/routes/bot.routes.js`
- Telegram setup documentation

**Codex-ready instruction:**

```text
Fix Telegram webhook secret validation so mismatched secret lengths safely return 403 instead of throwing. Support Telegram X-Telegram-Bot-Api-Secret-Token header if possible.
```

---

### 1.5 Prevent manual Telegram ID activation

**Priority:** P1

**Problem:**  
User creation may mark a user active/verified if `telegram_id` is manually supplied.

**Why it matters:**  
Wrong Telegram IDs can accidentally activate the wrong account.

**Exact fix:**

- Always create invite-based accounts as `pending_telegram`.
- Only mark Telegram as verified through the invite token `/start` flow.
- Admin can resend/reset invite, not manually verify casually.

**Files likely affected:**

- `server/controllers/users.controller.js`
- `server/lib/bot.js`
- `client/src/pages/admin/UsersPage.jsx`

**Codex-ready instruction:**

```text
Remove automatic Telegram verification from manual user creation. A manually supplied telegram_id must not make the user active or telegram_verified. Normal activation must happen through verified invite-token Telegram bot flow.
```

---

## Phase 2 — Duty Slot, Attendance, Cover Request, and Violation Correctness

### 2.1 Add unique constraint for duty slots

**Priority:** P0

**Problem:**  
Two faculty members may be assigned to the same duty date and session under concurrent requests.

**Why it matters:**  
This breaks duty ownership, attendance, cover requests, and reporting.

**Exact fix:**

- Add a unique constraint to `DutySlot`:

```prisma
@@unique([duty_date, session_type])
```

- Handle Prisma duplicate errors with HTTP 409.

**Files likely affected:**

- `prisma/schema.prisma`
- `server/controllers/duty-slots.controller.js`
- `server/controllers/calendar.controller.js`
- Prisma migration file

**Codex-ready instruction:**

```text
Add a unique constraint on DutySlot for duty_date and session_type. Refactor slot picking and admin assignment to handle Prisma duplicate-key errors with HTTP 409.
```

---

### 2.2 Make duty slot assignment transactional

**Priority:** P0

**Problem:**  
Faculty slot picking, admin assignment, and bulk assignment may have race conditions.

**Why it matters:**  
Without transactions, duplicate or inconsistent slots can be created.

**Exact fix:**

- Use Prisma transactions for:
  - faculty pick slot
  - admin assign slot
  - bulk calendar assignment
- Check global conflicts by `duty_date + session_type`, not only same faculty.
- Return clear conflict errors.

**Files likely affected:**

- `server/controllers/duty-slots.controller.js`
- `server/controllers/calendar.controller.js`

**Codex-ready instruction:**

```text
Refactor faculty pick slot, admin assign slot, and bulk calendar assignment to use Prisma transactions and global duty_date + session_type conflict checks. Return 409 for already-taken slots.
```

---

### 2.3 Allow covered faculty to check in and check out

**Priority:** P0

**Problem:**  
Attendance logic appears to allow only the original assigned faculty to check in/out.

**Why it matters:**  
Once a cover is confirmed, the volunteer should be able to perform duty attendance.

**Exact fix:**

- Update attendance slot lookup to allow:
  - `DutySlot.faculty_id === req.user.id`
  - OR `DutySlot.covered_by === req.user.id`
- Store actual check-in faculty clearly.
- Reports should distinguish:
  - original assigned faculty
  - covering faculty
  - actual duty-performing faculty

**Files likely affected:**

- `server/controllers/attendance.controller.js`
- `server/controllers/cover-requests.controller.js`
- `server/controllers/reports.controller.js`
- `prisma/schema.prisma` if additional fields are needed

**Codex-ready instruction:**

```text
Update attendance check-in/check-out logic so the logged-in faculty can act when they are either the original faculty_id or the confirmed covered_by faculty for the DutySlot. Preserve/report the actual duty-performing faculty.
```

---

### 2.4 Allow covered faculty to record violations

**Priority:** P0

**Problem:**  
Violation creation appears to validate only the original duty faculty.

**Why it matters:**  
A covering faculty member must be able to record student violations during the covered duty.

**Exact fix:**

- Permit violation creation if logged-in user is:
  - original `DutySlot.faculty_id`
  - OR confirmed `DutySlot.covered_by`
- Store the reporting faculty as the logged-in user.

**Files likely affected:**

- `server/controllers/violations.controller.js`

**Codex-ready instruction:**

```text
Update violation creation so a confirmed covering faculty member can record violations for the covered slot. Validate against faculty_id or covered_by, but save the logged-in user as the actual reporting faculty.
```

---

### 2.5 Make cover request volunteering atomic

**Priority:** P1

**Problem:**  
Two faculty members may volunteer for the same open cover request nearly simultaneously.

**Why it matters:**  
This can create inconsistent approval state.

**Exact fix:**

- Use transaction or conditional update.
- Only update if:
  - `status = 'open'`
  - `volunteer_id IS NULL`
  - `expires_at > now`
- If no rows updated, return 409.

**Files likely affected:**

- `server/controllers/cover-requests.controller.js`

**Codex-ready instruction:**

```text
Make cover request volunteering atomic. Only one faculty member may claim an open non-expired request with no volunteer. Return 409 if already volunteered or expired.
```

---

### 2.6 Prevent volunteer double-booking

**Priority:** P1

**Problem:**  
A volunteer may be confirmed for a cover while already having another duty at the same date/session.

**Why it matters:**  
Faculty cannot perform two duties simultaneously.

**Exact fix:**

- Before volunteer or confirmation, check if the faculty already has:
  - a `DutySlot` with same `duty_date` and `session_type`
  - OR a slot where they are `covered_by` for same date/session
- Reject with 409.

**Files likely affected:**

- `server/controllers/cover-requests.controller.js`
- `server/controllers/duty-slots.controller.js`

**Codex-ready instruction:**

```text
Before volunteer and confirmation, prevent faculty double-booking by checking same duty_date and session_type where the faculty is either assigned faculty_id or covered_by.
```

---

### 2.7 Prevent duplicate open cover requests

**Priority:** P1

**Problem:**  
Multiple open cover requests may exist for the same duty slot.

**Why it matters:**  
This creates confusing state and approval errors.

**Exact fix:**

- Before creating cover request, reject if an open request already exists for same `duty_slot_id`.
- When a cover is confirmed:
  - mark accepted request as covered/approved
  - close or expire sibling open requests for the same slot
  - set `DutySlot.covered_by`

**Files likely affected:**

- `server/controllers/cover-requests.controller.js`
- `prisma/schema.prisma` if partial uniqueness is implemented manually

**Codex-ready instruction:**

```text
Prevent duplicate open cover requests for the same duty slot. On confirmation, update DutySlot.covered_by, mark accepted request covered, and close/expire sibling open requests.
```

---

### 2.8 Add cover request cancel/reject flow

**Priority:** P2

**Problem:**  
Cover request workflow is incomplete without cancellation/rejection.

**Why it matters:**  
Faculty/admins need a clean way to cancel mistaken requests or reject unsuitable volunteers.

**Exact fix:**

- Add route for requester/admin cancel.
- Add route for admin/faculty rejection where appropriate.
- Ensure state transitions are valid.

**Files likely affected:**

- `server/controllers/cover-requests.controller.js`
- `server/routes/cover-requests.routes.js`
- `client/src/hooks/useCoverRequests.js`
- Cover request UI pages/components

**Codex-ready instruction:**

```text
Add safe cancel and reject endpoints for cover requests with valid state transitions. Update frontend hooks/UI minimally to expose these actions.
```

---

## Phase 3 — Data Safety and Student Import

### 3.1 Make student Excel upload transactional and safe

**Priority:** P0

**Problem:**  
Student import may deactivate students who are not included in the uploaded file.

**Why it matters:**  
A partial or invalid upload can accidentally deactivate the student database.

**Exact fix:**

- Add dry-run mode.
- Require explicit `deactivate_missing=true`.
- Never deactivate anyone if zero valid rows are parsed.
- Use transaction.
- Return clear import summary:
  - valid rows
  - invalid rows
  - created
  - updated
  - skipped
  - would deactivate
  - actually deactivated
- Prefer scoped deactivation by:
  - course
  - year
  - semester
  - section, if available

**Files likely affected:**

- `server/controllers/students.controller.js`
- `server/routes/students.routes.js`
- Student upload frontend page/component
- Student import documentation

**Codex-ready instruction:**

```text
Make student Excel import transactional and safe. Add dry-run mode, require deactivate_missing=true before deactivating absent students, block deactivation if zero valid rows are parsed, prefer scoped deactivation, and return a clear import summary.
```

---

### 3.2 Add student import preview UI

**Priority:** P2

**Problem:**  
Admins need to see import effects before applying changes.

**Why it matters:**  
Prevents accidental mass updates/deactivations.

**Exact fix:**

- Upload file in dry-run mode first.
- Show summary and validation errors.
- Require confirmation for actual import.
- Require separate confirmation for deactivating missing students.

**Files likely affected:**

- Student upload frontend page/component
- `client/src/hooks/useStudents.js`
- `server/controllers/students.controller.js`

**Codex-ready instruction:**

```text
Add a student import preview flow on the frontend. First call dry-run, show summary/errors, then require explicit confirmation before actual import and before deactivating missing students.
```

---

## Phase 4 — Frontend UX, Visual Hierarchy, and Mobile Improvements

### 4.1 Restrict faculty routes on frontend

**Priority:** P1

**Problem:**  
Faculty routes may not be explicitly restricted to faculty role in `client/src/App.jsx`.

**Why it matters:**  
Admin users may see confusing faculty-only screens.

**Exact fix:**

- Add `requiredRoles={['faculty']}` to faculty-only routes.
- Keep shared routes like messages available to allowed roles.

**Files likely affected:**

- `client/src/App.jsx`

**Codex-ready instruction:**

```text
Update client/src/App.jsx so faculty-only pages use requiredRoles={['faculty']}. Keep shared pages such as messages available only to appropriate authenticated roles.
```

---

### 4.2 Fix Messages pagination metadata bug

**Priority:** P1

**Problem:**  
Frontend may check `meta.totalPages` while backend returns `meta.pages`.

**Why it matters:**  
Pagination controls may not show or work correctly.

**Exact fix:**

- Use `data?.meta?.pages`.
- Keep naming consistent across backend/frontend.

**Files likely affected:**

- `client/src/pages/MessagesPage.jsx`
- Optional: backend pagination helper if consistency is desired

**Codex-ready instruction:**

```text
Fix MessagesPage pagination to use meta.pages instead of meta.totalPages, matching the backend response.
```

---

### 4.3 Redesign mobile Messages page

**Priority:** P2

**Problem:**  
Messages layout is likely too cramped on mobile if using two columns.

**Why it matters:**  
Messaging should feel native and easy on small screens.

**Exact fix:**

Mobile layout:

1. Inbox list screen
2. Tap message/conversation
3. Full-screen detail view
4. Back button returns to inbox
5. Compose opens as sheet/modal

Desktop can keep two-pane layout.

**Files likely affected:**

- `client/src/pages/MessagesPage.jsx`
- Message components if separated

**Codex-ready instruction:**

```text
Refactor MessagesPage for mobile. Use single-column inbox list on small screens, open message detail full-screen with a back button, and keep two-column layout on desktop.
```

---

### 4.4 Improve mobile tap targets

**Priority:** P2

**Problem:**  
Small buttons may be below ideal mobile tap size.

**Why it matters:**  
Small tap targets reduce mobile usability and conversion.

**Exact fix:**

- Ensure common mobile buttons are at least 44px tall.
- Keep compact buttons only inside desktop dense table contexts.
- Avoid tiny icon-only buttons without labels on mobile.

**Files likely affected:**

- `client/src/components/ui/Button.jsx`
- Admin/faculty table action components

**Codex-ready instruction:**

```text
Update Button and common action components so mobile tap targets are at least 44px high. Keep compact button styles only for desktop dense contexts.
```

---

### 4.5 Improve faculty dashboard hierarchy

**Priority:** P2

**Problem:**  
Faculty dashboard should prioritize today's duty actions.

**Why it matters:**  
Faculty users need fast daily workflows, especially on mobile.

**Recommended order:**

1. Today’s duty status
2. Check-in/check-out CTA
3. Cover request status
4. Record violation CTA
5. Recent messages
6. Upcoming slots

**Files likely affected:**

- `client/src/pages/faculty/FacultyDashboard.jsx`
- Faculty dashboard components/hooks

**Codex-ready instruction:**

```text
Improve faculty dashboard hierarchy so today's duty, check-in/check-out, cover status, and record violation action appear before secondary information on mobile.
```

---

### 4.6 Improve admin dashboard hierarchy

**Priority:** P2

**Problem:**  
Admin dashboard should show operational risk first.

**Why it matters:**  
Admins need to quickly identify problems requiring attention.

**Recommended cards:**

1. Today’s missing/unfilled duty slots
2. Absent/not checked-in faculty
3. Pending/open cover requests
4. Flagged unresolved violations
5. Pending Telegram invite users
6. Recent student import summary

**Files likely affected:**

- `client/src/pages/admin/AdminDashboard.jsx`
- Admin dashboard API/controller if new stats are needed

**Codex-ready instruction:**

```text
Improve admin dashboard hierarchy by surfacing operational risk cards first: unfilled duty slots, absent faculty, open cover requests, unresolved flagged violations, pending Telegram invite users, and last student import summary.
```

---

## Phase 5 — Reports and Messages

### 5.1 Validate report query parameters

**Priority:** P1

**Problem:**  
Report endpoints may accept invalid query params.

**Why it matters:**  
Invalid params can cause incorrect reports or server errors.

**Exact fix:**

- Add Zod validation for:
  - date ranges
  - month/year
  - faculty ID
  - student ID
  - course/year/semester filters
  - pagination params

**Files likely affected:**

- `server/routes/reports.routes.js`
- `server/validators/reports.schema.js`
- `server/controllers/reports.controller.js`

**Codex-ready instruction:**

```text
Add Zod validation for all reports endpoint query parameters, including dates, month/year, IDs, filters, and pagination.
```

---

### 5.2 Fix flagged violations report counts

**Priority:** P1

**Problem:**  
If report filters only `is_flagged: true`, resolved flag counts may be wrong.

**Why it matters:**  
Admin dashboard and reports may show misleading numbers.

**Exact fix:**

- Count unresolved flagged violations separately.
- Count resolved flag events from correct field or audit logs.
- Do not derive resolved count from a query that filters resolved records out.

**Files likely affected:**

- `server/controllers/reports.controller.js`
- Possibly `prisma/schema.prisma` if audit structure needs improvement

**Codex-ready instruction:**

```text
Correct flagged violations reporting so pending and resolved counts are calculated from appropriate fields or audit logs. Do not filter out resolved items before counting them.
```

---

### 5.3 Add report pagination and export

**Priority:** P2

**Problem:**  
Reports may use fixed limits such as `take: 200`.

**Why it matters:**  
Admins need complete data and exports.

**Exact fix:**

- Add pagination to large reports.
- Add CSV or XLSX export endpoints for:
  - attendance report
  - student violations
  - fines
  - duty coverage
  - student history

**Files likely affected:**

- `server/controllers/reports.controller.js`
- `server/routes/reports.routes.js`
- `client/src/pages/admin/ReportsPage.jsx`

**Codex-ready instruction:**

```text
Add pagination to heavy reports and implement CSV/XLSX export for attendance, violations, fines, duty coverage, and student history reports.
```

---

### 5.4 Add database indexes for messages

**Priority:** P2

**Problem:**  
Message inbox and sent queries may slow down as data grows.

**Why it matters:**  
Message pages are frequently used and should stay fast.

**Exact fix:**

Add indexes similar to:

```prisma
@@index([to_user_id, created_at])
@@index([from_user_id, created_at])
@@index([to_user_id, is_read])
```

**Files likely affected:**

- `prisma/schema.prisma`
- Prisma migration file

**Codex-ready instruction:**

```text
Add database indexes to Message for inbox, sent, and unread queries: to_user_id + created_at, from_user_id + created_at, and to_user_id + is_read.
```

---

## Phase 6 — API, Backend Quality, and Error Handling

### 6.1 Add async route error wrapper

**Priority:** P0

**Problem:**  
Async route errors may not consistently reach the central Express error handler.

**Why it matters:**  
Rejected promises can cause hanging requests or unhandled errors.

**Exact fix:**

- Add `server/lib/asyncHandler.js`:

```js
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

- Wrap async handlers in `server/routes/*.routes.js`.

**Files likely affected:**

- `server/lib/asyncHandler.js`
- All `server/routes/*.routes.js`
- `server/index.js` if error handler needs adjustment

**Codex-ready instruction:**

```text
Create an asyncHandler helper and wrap every async controller route so rejected promises flow to the centralized error handler.
```

---

### 6.2 Add database-backed health check

**Priority:** P2

**Problem:**  
A simple `/health` response can be healthy even when DB is down.

**Why it matters:**  
Deployment monitoring needs to know if the app can actually serve data.

**Exact fix:**

- Add `/health/db`.
- Run lightweight Prisma query.
- Return degraded/unhealthy if DB fails.

**Files likely affected:**

- `server/index.js`
- `server/routes/health.routes.js` if separated

**Codex-ready instruction:**

```text
Add a database-backed health check endpoint that performs a lightweight Prisma query and returns unhealthy/degraded status when the database is unavailable.
```

---

### 6.3 Hide sensitive Telegram IDs in normal responses

**Priority:** P2

**Problem:**  
`telegram_id` may be exposed in user response objects.

**Why it matters:**  
Telegram chat IDs are sensitive identifiers.

**Exact fix:**

- Restrict full Telegram ID to admin-only user management if required.
- Mask it in responses.
- Do not expose it in normal `/me` responses unless needed.

**Files likely affected:**

- `server/controllers/users.controller.js`
- `server/controllers/auth.controller.js`
- Any `safeUser()` helper

**Codex-ready instruction:**

```text
Audit user response serialization and avoid exposing full telegram_id except in admin-only user-management contexts where necessary. Prefer masked values.
```

---

## Phase 7 — PWA, Performance, and Deployment

### 7.1 Remove API runtime caching from PWA

**Priority:** P0

**Problem:**  
PWA/service worker runtime caching may cache sensitive API responses.

**Why it matters:**  
Auth, messages, reports, attendance, students, and admin data should not remain offline on shared devices.

**Exact fix:**

- Remove API endpoint runtime caching from `client/vite.config.js`.
- Cache only safe static assets.

**Files likely affected:**

- `client/vite.config.js`

**Codex-ready instruction:**

```text
Remove runtime caching for all API endpoints from the PWA service worker configuration. Cache only static assets and never cache auth, user, message, report, attendance, violation, student, or admin API responses.
```

---

### 7.2 Use deterministic deployment install

**Priority:** P2

**Problem:**  
Deployment may use `npm install` instead of `npm ci`.

**Why it matters:**  
Production builds should be deterministic.

**Exact fix:**

- Update Railway build command to use `npm ci` if lockfile exists.
- Ensure Prisma generate runs before build/start.

**Files likely affected:**

- `railway.toml`
- `package.json`

**Codex-ready instruction:**

```text
Update deployment build commands to use npm ci when lockfiles are present, run Prisma generate before build/start, and keep production deployment deterministic.
```

---

### 7.3 Update environment documentation

**Priority:** P2

**Problem:**  
Some required production env vars may be missing from `.env.example`.

**Why it matters:**  
Wrong env configuration can break Telegram links, auth cookies, timezone behavior, and CORS.

**Exact fix:**

Add/verify:

```env
APP_URL=
TZ=Asia/Kolkata
CORS_ORIGIN=
JWT_SECRET=
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
DATABASE_URL=
NODE_ENV=production
```

**Files likely affected:**

- `.env.example`
- `README.md`
- Deployment docs

**Codex-ready instruction:**

```text
Update .env.example and deployment docs with APP_URL, TZ=Asia/Kolkata, CORS_ORIGIN, JWT settings, Telegram bot/webhook secrets, DATABASE_URL, and production cookie/security notes.
```

---

## Phase 8 — Testing and Documentation

### 8.1 Replace stale invite flow test

**Priority:** P0

**Problem:**  
Existing `test-invite-flow.js` may not match current auth behavior.

**Why it matters:**  
Wrong tests give false confidence.

**Exact fix:**

- Remove or rewrite stale test.
- New tests should use current auth model:
  - Telegram invite
  - OTP request
  - OTP verify
  - httpOnly cookie auth
  - logout
  - deactivated user rejection

**Files likely affected:**

- `test-invite-flow.js`
- Test setup files
- `server/package.json` or root `package.json`

**Codex-ready instruction:**

```text
Remove or rewrite stale test-invite-flow.js so it matches the current Telegram invite + OTP + httpOnly cookie auth flow. Add meaningful automated tests for login, logout, role restrictions, and deactivated user rejection.
```

---

### 8.2 Add workflow integration tests

**Priority:** P1

**Required tests:**

1. Auth invite linking
2. OTP request and verify
3. Cookie auth
4. Logout
5. Deactivated user rejection
6. Admin/faculty role restrictions
7. Duplicate duty slot prevention
8. Cover volunteer race prevention
9. Covered faculty attendance
10. Covered faculty violation creation
11. Student import dry-run
12. Student import safe deactivation
13. Reports validation
14. Messages pagination

**Files likely affected:**

- Test setup files
- `server/package.json`
- Existing test scripts

**Codex-ready instruction:**

```text
Add integration tests for auth, duty slots, cover requests, attendance, violations, student import, reports validation, and messages pagination. Mock Telegram sending where needed.
```

---

### 8.3 Update documentation

**Priority:** P2

**Problem:**  
Documentation may not match current cookie auth and Telegram invite flow.

**Why it matters:**  
Future development and deployment can go wrong.

**Files likely affected:**

- `README.md`
- `TELEGRAM_INVITE_FLOW_TESTING.md`
- `TELEGRAM_WEBHOOK_REGISTRATION_GUIDE.md`
- `SIMS_API_Endpoints_v2.0.md`
- `SIMS_Database_Schema_v2.0.md`

**Codex-ready instruction:**

```text
Update project documentation to match current production behavior: httpOnly cookie auth, Telegram invite activation, OTP request using Telegram ID, required env vars, CSRF behavior, and deployment steps.
```

---

# 4. Top 10 Urgent Fixes

1. Add database-backed session validation in `authenticate.js`.
2. Add CSRF protection for cookie-based auth.
3. Fix covered faculty attendance.
4. Fix covered faculty violation creation.
5. Add unique duty slot constraint on `duty_date + session_type`.
6. Make duty slot picking/admin assignment transactional.
7. Make cover request volunteering/confirmation atomic and conflict-safe.
8. Make student upload transactional with dry-run and safe deactivation.
9. Remove sensitive API caching from PWA config.
10. Replace stale auth/invite test with real automated tests.

---

# 5. Top 10 Feature Improvements

1. Mobile-first message inbox/detail experience.
2. Report export to CSV/XLSX.
3. Admin operational risk dashboard.
4. Faculty “Today’s Duty” action card.
5. Cover request cancel/reject flow.
6. Attendance override audit log UI.
7. Student upload preview and import history.
8. Unread message count and announcement mode.
9. Secure violation photo evidence with audit logging.
10. Notifications for cover approval, attendance reminders, and flagged violation resolution.

---

# 6. 30-Day Roadmap

## Week 1 — Security and auth

- Add session validation and session revocation.
- Add CSRF protection.
- Fix logout cookie clearing.
- Remove PWA API caching.
- Add async error wrapper.
- Add DB health check.
- Update env docs.

## Week 2 — Core workflow correctness

- Add duty slot uniqueness.
- Make duty assignment transactional.
- Fix covered faculty attendance.
- Fix covered faculty violation creation.
- Fix cover request race conditions.
- Add volunteer double-booking prevention.
- Add cover cancel/reject flow.

## Week 3 — Data safety and reports

- Rebuild student import as dry-run + transaction.
- Add scoped deactivation.
- Validate report query params.
- Fix flagged violation counts.
- Add pagination and export to key reports.
- Add DB indexes for messages and common reports.

## Week 4 — UX, testing, deployment

- Redesign mobile messages.
- Improve faculty dashboard hierarchy.
- Improve admin dashboard operational cards.
- Add integration tests.
- Add CI pipeline.
- Update documentation.

---

# 7. Production Verification Checklist

After each phase, verify:

## Backend

```bash
npm run generate
npm run build
npm test
```

If scripts differ, inspect `package.json` and use the project-defined commands.

## Prisma

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev --name production_hardening_phase_X
```

For production:

```bash
npx prisma migrate deploy
```

## Frontend

```bash
cd client
npm run build
```

## Manual checks

- Admin can create invite user.
- Telegram invite links correctly.
- OTP request works.
- OTP verify sets auth cookie.
- Logout clears cookie.
- Deactivated user is rejected immediately.
- Faculty can pick available slot.
- Duplicate duty slot is rejected.
- Faculty can request cover.
- Volunteer can claim cover.
- Confirmed volunteer can check in/out.
- Confirmed volunteer can record violations.
- Admin can see reports.
- Messages pagination works.
- Student import dry-run does not write.
- Student import cannot deactivate all students on empty/invalid upload.

---

# 8. Final All-Phase Codex Prompt

Use this only after understanding that it is safer to run one phase at a time.

```text
You are working on the SIMS DMS project.

Read SIMS_DMS_PRODUCTION_FIX_PLAN.md from the project root.

Act as a senior full-stack engineer. Implement the production-readiness fixes safely in phases.

Rules:
- Do not redesign unrelated features.
- Do not rename public routes unless necessary.
- Do not remove existing functionality unless it is unsafe or stale.
- Prefer small, reviewable changes.
- Use transactions for workflow-critical changes.
- Add Prisma migrations for schema changes.
- Add or update tests for every critical workflow changed.
- After each phase, list changed files, explain changes, and report test/build results honestly.

Start with Phase 1 only:
1. Session validation and revocation
2. CSRF protection
3. Auth cookie helper
4. Telegram webhook secret validation
5. Prevent manual Telegram ID activation

After completing Phase 1, stop and report:
- Changed files
- Migration names
- Commands run
- Test/build result
- Remaining risks
```

---

# 9. Important Warning

This is the right direction, but avoid this mistake:

> Do not ask Codex to “fix everything” in one single pass.

That can create large risky changes, broken migrations, and hidden regressions.

Better approach:

- Phase 1: security/auth
- Phase 2: workflows
- Phase 3: student import/data safety
- Phase 4: UX
- Phase 5: reports/messages
- Phase 6: testing/docs/deployment

Each phase should be reviewed, tested, and committed separately.

---

# 10. Suggested Commit Plan

```bash
git add .
git commit -m "chore: add production fix plan"

git checkout -b phase-1-auth-security
# implement Phase 1
git commit -m "fix: harden auth sessions cookies csrf and telegram verification"

git checkout -b phase-2-duty-cover-workflows
# implement Phase 2
git commit -m "fix: make duty cover attendance and violation workflows consistent"

git checkout -b phase-3-student-import-safety
# implement Phase 3
git commit -m "fix: add safe transactional student import"

git checkout -b phase-4-mobile-ux
# implement Phase 4
git commit -m "feat: improve mobile UX and dashboard hierarchy"

git checkout -b phase-5-reports-messages
# implement Phase 5
git commit -m "fix: improve reports validation exports and message pagination"

git checkout -b phase-6-tests-docs-deploy
# implement Phase 6+
git commit -m "test: add production workflow coverage and update docs"
```

---

## End of file
