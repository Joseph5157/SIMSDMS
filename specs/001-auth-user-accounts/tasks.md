# Tasks: Week 1 — Authentication & User Accounts

**Input**: Design documents from `/specs/001-auth-user-accounts/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Codebase Status

The project scaffold (Phase A from plan.md) is already complete — Express backend, React frontend, Prisma schema, Tailwind CSS, TanStack Query, and routing are all in place. Auth uses email/password (not Telegram OTP), which is the current working approach. Tasks below address completing, fixing, and polishing the Sprint 1 scope within the existing architecture.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify scaffold completeness, fill infrastructure gaps

- [ ] T001 Add missing `otp_sessions` model to `prisma/schema.prisma` per Constitution §5 — fields: `id` (UUID), `user_id` (FK to users), `otp_hash` (VarChar), `expires_at` (DateTime), `attempt_count` (SmallInt default 0), `verified` (Boolean default false), `created_at`, `updated_at`
- [ ] T002 [P] Create `server/services/otp.service.js` — functions: `generateOTP()` (6-digit crypto-random), `hashOTP(otp)` (bcrypt rounds=10), `verifyOTP(plain, hash)`, `createOTPSession(userId)`, `incrementAttempt(sessionId)`, `markVerified(sessionId)`
- [ ] T003 [P] Create `server/services/telegram.service.js` — move logic from `server/lib/telegram.js` into proper service with `sendOTP(telegramId, otp)` and `sendMessage(telegramId, text)`, return `{ ok: true }` or throw `TelegramError`, log failures via Winston
- [ ] T004 Run `npx prisma migrate dev --name add-otp-sessions` to create the migration after T001

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST be complete before user story work

**Status**: Middleware (authenticate.js, authorize.js, validate.js) already exists and is functional. Focus is on gaps and hardening.

- [ ] T005 Verify `server/middleware/authenticate.js` — ensure JWT cookie `sims_token` is read, verified, user status checked (active, not deleted), session_version validated, and `req.user = { id, role }` attached correctly
- [ ] T006 [P] Verify `server/middleware/authorize.js` — ensure `authorize(...roles)` factory checks `req.user.role` against allowed roles, returns 403 FORBIDDEN if not
- [ ] T007 [P] Verify `server/middleware/validate.js` — ensure Zod schema runner returns 422 with field-level errors on validation failure
- [ ] T008 [P] Verify `server/lib/logger.js` — ensure Winston logger has console transport (dev) and file transport (prod), no `console.log` usage in server code
- [ ] T009 Verify CORS config in `server/index.js` — ensure `credentials: true` and `origin` matches `CORS_ORIGIN` env var, and cookie-parser is wired before routes

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Faculty Logs In via Email/Password (Priority: P1) MVP

**Goal**: A faculty member logs in with email + password, receives a JWT in an httpOnly cookie, and reaches their dashboard. Session persists across browser restarts within the 7-day JWT window.

**Independent Test**: Log in as a seeded faculty user → verify dashboard loads → close browser → reopen → verify session persists without re-login.

### Implementation for User Story 1

- [ ] T010 [US1] Verify `POST /auth/login` in `server/controllers/auth.controller.js` — email/password lookup, bcrypt verify, JWT sign with `{ sub, role, session_version }`, httpOnly cookie set (`sims_token`, 7d, sameSite=strict, secure in prod), CSRF token issued
- [ ] T011 [US1] Verify `POST /auth/logout` in `server/controllers/auth.controller.js` — clears `sims_token` and `sims_csrf` cookies using matching options (path, domain, sameSite)
- [ ] T012 [US1] Verify `POST /auth/change-password` in `server/controllers/auth.controller.js` — validates current password (skips if `password_hash` is null for first-time set), hashes new password with bcrypt(12), sets `must_change_password = false`
- [ ] T013 [P] [US1] Verify Zod schemas in `server/schemas/auth.schema.js` — `loginSchema` validates `{ email: string().email(), password: string().min(8) }`, `changePasswordSchema` validates `{ current_password, new_password }`
- [ ] T014 [US1] Verify rate limiting on `POST /auth/login` in `server/routes/auth.routes.js` — max 5 requests per 15 minutes per IP
- [ ] T015 [P] [US1] Verify `client/src/pages/auth/LoginPage.jsx` — email/password form, error states (invalid credentials, rate limited, service unavailable), SIMS branding, mobile-first layout
- [ ] T016 [P] [US1] Verify `client/src/hooks/useAuth.js` — `useCurrentUser()` fetches `GET /api/users/me`, `useLogin()` mutation calls `POST /api/auth/login`, `useLogout()` clears query cache on success
- [ ] T017 [US1] Verify auth redirect flow in `client/src/App.jsx` — unauthenticated users redirect to `/login`, authenticated users redirect to role-based dashboard, `must_change_password` forces password change page
- [ ] T018 [US1] Verify `client/src/components/ProtectedRoute.jsx` — loading spinner while checking auth, redirect to `/login` on 401, role check with 403 "Access Denied" UI, renders `<Outlet />` on success

**Checkpoint**: Faculty can log in, see dashboard, log out, session persists across browser restarts

---

## Phase 4: User Story 2 — Admin Creates and Manages User Accounts (Priority: P2)

**Goal**: Admin can create new faculty/admin accounts, view all users with filters, and deactivate/reactivate accounts. New users receive an invite flow.

**Independent Test**: Log in as Admin → create a new Faculty user → verify user appears in list → deactivate the user → verify they cannot log in → reactivate → verify login works again.

### Implementation for User Story 2

- [ ] T019 [US2] Verify `POST /users` in `server/controllers/users.controller.js` — Admin creates account with `{ name, email, role, department, designation, phone, telegram_id }`, Zod validated, checks `email` uniqueness, checks `telegram_id` uniqueness if provided, returns 201
- [ ] T020 [US2] Verify `GET /users` in `server/controllers/users.controller.js` — Admin-only, returns paginated list with optional filters (`role`, `status`, `department`), includes `limit`/`offset` pagination
- [ ] T021 [US2] Verify `GET /users/:id` in `server/controllers/users.controller.js` — all authenticated users can view own profile; Admin+ can view any profile
- [ ] T022 [US2] Verify `PATCH /users/:id/profile` in `server/controllers/users.controller.js` — all authenticated users can update own profile (`name`, `phone`, `department`), Zod validated
- [ ] T023 [US2] Verify `PATCH /users/:id/deactivate` in `server/controllers/users.controller.js` — Admin-only, sets `status = inactive`, guards against self-deactivation with `400 CANNOT_DEACTIVATE_SELF`
- [ ] T024 [P] [US2] Verify `PATCH /users/:id/reactivate` in `server/controllers/users.controller.js` — Admin-only, sets `status = active`
- [ ] T025 [US2] Verify Zod schemas in `server/schemas/users.schema.js` — `createUserSchema` validates `{ name, email, role, department?, designation?, phone?, telegram_id? }`, `updateProfileSchema` validates optional fields
- [ ] T026 [P] [US2] Verify `client/src/pages/admin/UsersPage.jsx` — table with name, role badge, department, status, created date, actions column; filters for role and status; "Create User" button opens modal/form; per-row deactivate/reactivate actions
- [ ] T027 [P] [US2] Verify `client/src/hooks/useUsers.js` — `useUsers(filters)` paginated query, `useCreateUser()` mutation, `useDeactivateUser(id)` mutation, `useReactivateUser(id)` mutation, proper cache invalidation on mutations
- [ ] T028 [US2] Verify duplicate prevention — `POST /users` rejects duplicate `email` with clear error message, rejects duplicate `telegram_id` with clear error message

**Checkpoint**: Admin can create, list, filter, deactivate, and reactivate user accounts

---

## Phase 5: User Story 3 — Super Admin Resets a Locked User Session (Priority: P3)

**Goal**: Super Admin can reset any locked user account, restoring their ability to log in. All resets are logged in the audit trail.

**Independent Test**: Lock a test account (e.g., by setting `otp_failed_attempts >= 5` or `status = inactive`), then as Super Admin reset the session → verify the user can log in again → verify audit log entry was created.

### Implementation for User Story 3

- [ ] T029 [US3] Verify `POST /admin/users/:id/reset-login` in `server/controllers/users.controller.js` — Super Admin only, resets `otp_failed_attempts = 0` and `session_version` increment on target user, writes entry to `admin_audit_log` with `{ actorId, action: 'SESSION_RESET', targetId, targetType: 'user' }`
- [ ] T030 [US3] Verify `server/services/audit.service.js` — `logAction({ actorId, action, targetId, targetType, metadata })` writes immutable row to `admin_audit_log`, fire-and-forget with error logging (audit failure never blocks main response)
- [ ] T031 [US3] Verify `GET /admin/audit-logs` in `server/controllers/users.controller.js` — Super Admin only, paginated list from `admin_audit_log`, filters: `actor_id`, `action`, `target_id`, date range
- [ ] T032 [P] [US3] Verify `client/src/pages/super-admin/SessionResetPage.jsx` — search user by name or Telegram ID, show locked status indicator, "Reset Session" button with confirmation dialog, calls `POST /api/admin/users/:id/reset-login`, shows recent audit log of resets below
- [ ] T033 [P] [US3] Verify reset mutations in `client/src/hooks/useUsers.js` — `useResetSession(id)` mutation with cache invalidation, `useAuditLogs()` query for audit trail display
- [ ] T034 [US3] Verify authorization — only `super_admin` role can access `POST /admin/users/:id/reset-login` and `GET /admin/audit-logs`; Admin and Faculty get 403

**Checkpoint**: Super Admin can reset locked accounts, all resets appear in audit log

---

## Phase 6: User Story 4 — Role-Based Access Control Enforced on All Routes (Priority: P2)

**Goal**: Every authenticated user can only access screens and API endpoints permitted for their role. Unauthorized access results in a clear denial, not a crash or blank screen.

**Independent Test**: Log in as Faculty → attempt to navigate to `/admin/users` → verify "Access Denied" is shown. Log in as Admin → attempt to navigate to `/super-admin/sessions` → verify denial.

### Implementation for User Story 4

- [ ] T035 [US4] Verify all backend routes use `authorize()` middleware — every route in `server/routes/users.routes.js` and `server/routes/auth.routes.js` has appropriate role guards matching plan.md endpoint table
- [ ] T036 [US4] Verify frontend `ProtectedRoute` wrappers in `client/src/App.jsx` — Admin routes wrapped with `requiredRole={['admin', 'super_admin']}`, Super Admin routes with `requiredRole={['super_admin']}`, Faculty routes with `requiredRole={['faculty']}`
- [ ] T037 [P] [US4] Verify 403 "Access Denied" UI in `client/src/components/ProtectedRoute.jsx` — shows clear message with user's current role, provides link back to their own dashboard
- [ ] T038 [US4] Verify expired JWT handling — when `sims_token` cookie expires, next API call returns 401, frontend intercepts and redirects to `/login` automatically via Axios interceptor in `client/src/utils/api.js`
- [ ] T039 [US4] Verify `GET /users/me` endpoint returns correct user profile including role — this is the session check endpoint used by `useCurrentUser()` hook

**Checkpoint**: All routes enforce RBAC, unauthorized access shows clear denial, expired sessions redirect to login

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, seed data, deployment readiness

- [ ] T040 [P] Verify `prisma/seed.js` — creates Super Admin user with known credentials from env vars (`BOOTSTRAP_SUPER_ADMIN_EMAIL`, `BOOTSTRAP_SUPER_ADMIN_PASSWORD`), generates password hash with bcrypt, sets `status = active`, `must_change_password = false`
- [ ] T041 [P] Verify `.env.example` — all 7+ required env vars documented: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `BOOTSTRAP_SUPER_ADMIN_EMAIL`
- [ ] T042 [P] Verify `server/index.js` health endpoint — `GET /health` returns `{ status: "ok", timestamp }`, `GET /health/db` verifies Prisma connection
- [ ] T043 Verify cookie security — in production (`NODE_ENV=production`), `sims_token` cookie has `secure: true`, `sameSite: strict`, `httpOnly: true`
- [ ] T044 [P] Verify error response format — all API errors follow `{ error: true, code: "ERROR_CODE", message: "Human-readable message" }` per Constitution §6
- [ ] T045 Edge case: Admin attempting to deactivate own account returns `400 CANNOT_DEACTIVATE_SELF`
- [ ] T046 Edge case: Creating user with duplicate email returns clear error with code `DUPLICATE_EMAIL`
- [ ] T047 [P] Verify no `console.log` in server code — all logging uses Winston logger per Constitution §10
- [ ] T048 Acceptance criteria sign-off: full login flow works end-to-end, all 3 roles independently accessible, no cross-role data leakage, admin CRUD on users works in <=3 clicks, every session reset logged in audit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration must complete first for otp_sessions)
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - US1 (Login) can start after Phase 2 — no dependencies on other stories
  - US2 (User Management) can start after Phase 2 — may share user lookup logic with US1
  - US3 (Session Reset) depends on US1 being testable (need login to test reset)
  - US4 (RBAC) depends on US1 and US2 (need login + user creation to test role enforcement)
- **Polish (Phase 7)**: Depends on all user stories being verified

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P2)**: Can start after Phase 2 — Independent of US1 at the API level
- **US3 (P3)**: Needs US1 working to test reset-then-login flow
- **US4 (P2)**: Cross-cutting — verifies all stories enforce roles correctly

### Within Each User Story

- Backend verification before frontend verification
- Controller logic before schema/validation checks
- Core flow before edge cases

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel (T002, T003)
- All Phase 2 tasks marked [P] can run in parallel (T006, T007, T008)
- Within each user story, tasks marked [P] can run in parallel
- US1 and US2 can be worked on in parallel once Phase 2 is complete

---

## Parallel Example: User Story 1

```bash
# Launch Zod schema + frontend verifications in parallel:
Task: "Verify Zod schemas in server/schemas/auth.schema.js"  (T013)
Task: "Verify LoginPage in client/src/pages/auth/LoginPage.jsx"  (T015)
Task: "Verify useAuth hook in client/src/hooks/useAuth.js"  (T016)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (add otp_sessions, create services)
2. Complete Phase 2: Foundational (verify middleware)
3. Complete Phase 3: User Story 1 (login flow)
4. **STOP and VALIDATE**: Test full login flow end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add US1 (Login) -> Test independently -> Working auth (MVP!)
3. Add US2 (User CRUD) -> Test independently -> Admin can manage users
4. Add US3 (Session Reset) -> Test independently -> Super Admin can unlock accounts
5. Add US4 (RBAC) -> Test independently -> All roles properly enforced
6. Polish -> Edge cases, seed, deployment readiness

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- "Verify" tasks mean: read the existing code, test it works, fix any bugs found
- Each user story should be independently completable and testable
- Stop at any checkpoint to validate story independently
