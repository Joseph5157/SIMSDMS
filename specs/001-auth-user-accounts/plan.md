# Implementation Plan: Week 1 — Authentication & User Accounts

**Feature Branch**: `001-auth-user-accounts`
**Spec**: `spec.md` — Week 1
**Constitution Version**: 2.6
**Plan Created**: 2026-06-06

---

## Overview

This plan scaffolds the full SIMS DMS project and implements the Week 1 scope: Telegram OTP login, JWT session management, role-based access control, and Admin user account management. By end of week the system must be live enough for a real faculty member to log in and an Admin to manage accounts.

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Project layout | Monorepo — `client/` + `server/` + `prisma/` at root | Per Constitution §7 |
| Auth delivery | Telegram Bot only | Per Constitution §4 — no fallback |
| Token storage | httpOnly cookie | Per Constitution §10 — never localStorage |
| OTP hash | bcrypt | Never store plain OTP |
| Session lock | `otp_sessions.attempt_count ≥ 5` | Per FR-004 |
| Audit log | `admin_audit_log` table (JSONB, immutable) | Per FR-015 / Constitution §4 |
| Validation | Zod on every POST/PATCH input | Per Constitution §2 |
| Logging | Winston (app/error), Morgan (HTTP) | Per Constitution §2, §10 |
| Self-registration | Disabled — Admin creates accounts only | Per spec Assumptions |
| First Super Admin | DB seed script | Per spec Assumptions |

---

## Folder Structure to Scaffold

```
/
├── client/
│   ├── public/
│   │   └── manifest.json                  # PWA manifest
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.jsx          # OTP request + verify screens
│   │   │   ├── admin/
│   │   │   │   └── UsersPage.jsx          # User list, create, deactivate
│   │   │   ├── faculty/
│   │   │   │   └── DashboardPage.jsx      # Stub — Week 1 placeholder
│   │   │   └── super-admin/
│   │   │       └── SessionResetPage.jsx   # Super Admin session reset
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx         # JWT guard + role gate
│   │   │   ├── RoleGuard.jsx              # Inline role check wrapper
│   │   │   └── layout/
│   │   │       └── AppShell.jsx           # Nav shell per role
│   │   ├── hooks/
│   │   │   ├── useAuth.js                 # TanStack Query — /auth/me
│   │   │   └── useUsers.js                # TanStack Query — /users
│   │   ├── utils/
│   │   │   ├── api.js                     # Axios instance — withCredentials
│   │   │   └── constants.js               # Roles enum, route names
│   │   ├── App.jsx                        # Router + ProtectedRoute wiring
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/
│   ├── routes/
│   │   ├── auth.routes.js                 # /auth/* — 3 endpoints
│   │   └── users.routes.js                # /users/* + /admin/* — 12 endpoints
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── users.controller.js
│   ├── services/
│   │   ├── otp.service.js                 # Generate, hash, verify OTP
│   │   ├── telegram.service.js            # Send message via Bot API
│   │   └── audit.service.js               # Write to admin_audit_log
│   ├── middleware/
│   │   ├── authenticate.js                # JWT cookie → req.user
│   │   ├── authorize.js                   # Role check factory
│   │   └── validate.js                    # Zod schema runner
│   ├── lib/
│   │   └── logger.js                      # Winston instance
│   ├── schemas/
│   │   ├── auth.schema.js                 # Zod — request-otp, verify-otp
│   │   └── users.schema.js                # Zod — create, update, approve
│   └── index.js                           # Express app entry point
│
├── prisma/
│   ├── schema.prisma                      # Full 13-table schema + admin_audit_log
│   └── seed.js                            # Super Admin seed
│
├── db/
│   └── seed-super-admin.js                # Standalone seed runner
│
├── .env.example
├── .gitignore
└── package.json                           # Root scripts (dev, migrate, seed)
```

---

## Phase Breakdown

### Phase A — Project Scaffold (Day 1)

**Goal**: Runnable skeleton. `npm run dev` starts both client and server with no errors.

#### A1 — Root Setup
- [ ] Initialise root `package.json` with workspaces (`client`, `server`)
- [ ] Add `.env.example` with all 7 required variables from Constitution §11
- [ ] Add `.gitignore` (node_modules, .env, dist, prisma migrations auto-generated)
- [ ] Add root scripts: `dev`, `build`, `migrate`, `seed`

#### A2 — Backend Scaffold
- [ ] `cd server && npm init`
- [ ] Install: `express cookie-parser cors helmet morgan express-rate-limit jsonwebtoken bcryptjs zod winston axios dotenv`
- [ ] Install dev: `nodemon`
- [ ] Create `server/index.js` — Express app with Helmet, CORS (credentials + origin), Morgan, rate limiter, JSON body parser, cookie-parser
- [ ] Wire `/health` endpoint returning `{ status: "ok", timestamp }`
- [ ] Create `server/lib/logger.js` — Winston with daily-rotate or file transport for errors, console for dev
- [ ] Stub all route files — each returns `501 Not Implemented` for now

#### A3 — Prisma Setup
- [ ] `cd prisma && npx prisma init`
- [ ] Write full `schema.prisma` — all 13 tables + `admin_audit_log` matching `SIMS_Database_Schema_v2.0.md` exactly
  - Enums: `Role`, `UserStatus`, `SessionType`, `SlotStatus`, `AttendanceInStatus`, `AttendanceOutStatus`, `ViolationType`, `ChangeType`, `CoverStatus`, `RecordStatus`
  - All FK relations with correct `onDelete` behaviour
  - All UUID `@default(uuid())`
  - `@updatedAt` on every `updated_at` field
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Verify all tables created in Railway PostgreSQL

#### A4 — Frontend Scaffold
- [ ] `npm create vite@latest client -- --template react`
- [ ] Install: `tailwindcss postcss autoprefixer @tanstack/react-query axios react-router-dom`
- [ ] Configure Tailwind — `tailwind.config.js` + `index.css`
- [ ] Configure `vite.config.js` — proxy `/api` → `http://localhost:3000` for dev
- [ ] Create `src/utils/api.js` — Axios instance with `baseURL=/api`, `withCredentials: true`
- [ ] Create `src/App.jsx` — React Router v6 with route stubs

---

### Phase B — Authentication Backend (Day 2)

**Goal**: OTP request → Telegram delivery → OTP verify → JWT cookie. Fully working in Postman/curl.

#### B1 — Telegram Service
- [ ] `server/services/telegram.service.js`
  - `sendMessage(telegramId, text)` — calls `https://api.telegram.org/bot{TOKEN}/sendMessage`
  - Returns `{ ok: true }` or throws `TelegramError`
  - Logs failure via Winston — does NOT throw to caller if Telegram is down (returns error object)

#### B2 — OTP Service
- [ ] `server/services/otp.service.js`
  - `generateOTP()` — 6-digit numeric string, crypto-random
  - `hashOTP(otp)` — bcrypt hash, rounds=10
  - `verifyOTP(plain, hash)` — bcrypt compare, returns boolean
  - `createOTPSession(userId)` — upsert `otp_sessions` row, set `expires_at = NOW + 5min`, `attempt_count = 0`, `verified = false`
  - `incrementAttempt(sessionId)` — `attempt_count++`
  - `markVerified(sessionId)` — `verified = true`

#### B3 — Auth Routes & Controller
- [ ] `POST /auth/request-otp`
  - Zod: `{ telegram_id: string }` (non-empty)
  - Look up `users` where `telegram_id = ?` and `status = active`
  - If not found: return `404 USER_NOT_FOUND`
  - Generate OTP, hash it, call `createOTPSession`
  - Call `telegram.sendMessage` — if fails, return `503 TELEGRAM_UNAVAILABLE`
  - Return `200 { message: "OTP sent" }` — never return OTP in response
  - Rate limit: 3 requests per 15 minutes per IP

- [ ] `POST /auth/verify-otp`
  - Zod: `{ telegram_id: string, otp: string }`
  - Find user by `telegram_id`, status must be `active`
  - Find latest unverified `otp_sessions` for this user
  - If no session: `401 NO_SESSION`
  - If `attempt_count >= 5`: `423 ACCOUNT_LOCKED` — do not increment further
  - If `expires_at < NOW()`: `401 OTP_EXPIRED`
  - Call `verifyOTP` — if wrong: increment attempt, check if now ≥ 5 → return appropriate error
  - If correct: `markVerified`, sign JWT `{ sub: userId, role }`, set httpOnly cookie (`sims_token`, 7d, sameSite=strict, secure in prod)
  - Return `200 { user: { id, name, role } }`

- [ ] `POST /auth/logout`
  - Requires valid JWT (authenticate middleware)
  - Clear `sims_token` cookie
  - Return `200 { message: "Logged out" }`

#### B4 — JWT Middleware
- [ ] `server/middleware/authenticate.js`
  - Read `req.cookies.sims_token`
  - Verify with `JWT_SECRET`
  - Attach `req.user = { id, role }` to request
  - If missing/invalid/expired: `401 UNAUTHORIZED`

- [ ] `server/middleware/authorize.js`
  - Factory: `authorize(...roles)` → middleware
  - Checks `req.user.role` is in allowed roles
  - If not: `403 FORBIDDEN`

---

### Phase C — User Accounts Backend (Day 2–3)

**Goal**: All 12 user/admin endpoints working. Admin can create/list/deactivate. Super Admin can reset sessions.

#### C1 — Zod Schemas (`server/schemas/users.schema.js`)
- `createUserSchema` — `{ name, email, phone, role, department, designation, telegram_id }`
- `updateProfileSchema` — `{ name?, phone?, department? }` (all optional)
- `approveSchema` — empty body (action is the URL itself)

#### C2 — Users Controller

**Admin endpoints:**

- [ ] `POST /users` — Admin creates account (status=active immediately). Zod validated. Check `telegram_id` unique. Returns `201`.
- [ ] `PATCH /users/:id/deactivate` — Admin. Set `status=inactive`. Guard: cannot deactivate own account.
- [ ] `GET /users` — Admin. List all users with optional query filters: `role`, `status`, `department`. Paginate (limit/offset).
- [ ] `GET /users/:id` — All Auth. Own profile always allowed; other profiles allowed for Admin+.
- [ ] `PATCH /users/:id/profile` — All Auth. Own profile only (non-Admin). Zod validated.

**Super Admin endpoints:**

- [ ] `GET /admin/audit-logs` — Super Admin. Paginated list from `admin_audit_log`. Filters: `actor_id`, `action`, `target_id`, date range.
- [ ] `POST /admin/users/:id/reset-login` — Super Admin. Find user's `otp_sessions`, set `attempt_count = 0`, `verified = false`. Write audit log entry.
- [ ] `DELETE /admin/hard-delete/:resource/:id` — Super Admin. Permanent delete by resource type. Requires `resource` to be a known table name (whitelist). Log to audit.
- [ ] `GET /admin/settings` — Super Admin. Return system settings row.
- [ ] `PATCH /admin/settings` — Super Admin. Update settings.

#### C3 — Audit Service
- [ ] `server/services/audit.service.js`
  - `logAction({ actorId, action, targetId, targetType, metadata })` — writes to `admin_audit_log`
  - Called after session reset, hard delete, account approval, deactivation
  - Fire-and-forget with error logging — audit failure never blocks the main response

---

### Phase D — Authentication Frontend (Day 3)

**Goal**: Login page working end-to-end in browser. Faculty can log in via Telegram OTP.

#### D1 — Login Page (`src/pages/auth/LoginPage.jsx`)

Two-step UI:

**Step 1 — Request OTP**
- Input: Telegram ID / username
- Button: "Send OTP"
- Calls `POST /api/auth/request-otp`
- On success: transition to Step 2
- Error states: user not found, Telegram unavailable, rate limited

**Step 2 — Enter OTP**
- 6-digit input (split or single field)
- Countdown timer showing OTP expiry (5 min)
- Button: "Verify"
- Calls `POST /api/auth/verify-otp`
- On success: redirect to role dashboard
- Error states: wrong OTP, expired, account locked

**Design notes:**
- Mobile-first, full-screen layout
- SIMS branding — college name in header
- Clear error messaging for all failure modes
- No password field anywhere

#### D2 — Auth Hook (`src/hooks/useAuth.js`)
- `useCurrentUser()` — TanStack Query fetching `GET /api/users/me`
- `useLogin()` — mutation for OTP verify
- `useLogout()` — mutation for logout, clears query cache on success

#### D3 — Protected Route (`src/components/ProtectedRoute.jsx`)
- Wraps `useCurrentUser()`
- If loading: show spinner
- If no user / 401: redirect to `/login`
- If `requiredRole` prop provided: check role, show 403 page if mismatch
- Renders `<Outlet />` on success

#### D4 — App Router (`src/App.jsx`)
```
/ → redirect to /login (if unauth) or /dashboard (if auth)
/login → LoginPage (public)
/dashboard → ProtectedRoute → role-based redirect
/admin/users → ProtectedRoute (Admin+) → UsersPage
/admin/sessions → ProtectedRoute (Super Admin) → SessionResetPage
/faculty/dashboard → ProtectedRoute (Faculty) → DashboardPage (stub)
```

---

### Phase E — User Management Frontend (Day 4)

**Goal**: Admin can create, list, approve, and deactivate users from the UI.

#### E1 — Users Page (`src/pages/admin/UsersPage.jsx`)
- Table: all users — name, role badge, dept, status, created date, actions
- Filters: role dropdown, status dropdown
- "Create User" button → slide-over / modal form
- Per-row actions: Approve (if pending), Deactivate (if active)
- Role badge colours: Super Admin = red, Admin = amber, Faculty = blue

#### E2 — Create User Form
- Fields: Name, Email, Phone, Department, Designation, Telegram ID, Role
- Zod validation mirrored client-side
- Submit → `POST /api/users`
- On success: invalidate users query, close modal, show toast

#### E3 — Session Reset Page (`src/pages/super-admin/SessionResetPage.jsx`)
- Search user by name or Telegram ID
- Show locked status indicator
- "Reset Session" button → `POST /api/admin/users/:id/reset-login`
- Confirmation dialog before reset
- Show audit log of recent resets below

#### E4 — Users Hook (`src/hooks/useUsers.js`)
- `useUsers(filters)` — paginated list with TanStack Query
- `useCreateUser()` — mutation
- `useApproveUser(id)` — mutation
- `useDeactivateUser(id)` — mutation
- `useResetSession(id)` — mutation

---

### Phase F — Seed, Testing & Polish (Day 5)

#### F1 — Database Seed
- [ ] `prisma/seed.js` — creates Super Admin user with known `telegram_id` from env
- [ ] Add `prisma.seed` to `package.json` → `node prisma/seed.js`
- [ ] Document: "Run seed before first use"

#### F2 — Environment & Deploy
- [ ] Verify all `.env` variables documented in `.env.example`
- [ ] Test Railway deployment — `npm run build` + `npm start`
- [ ] Confirm `NODE_ENV=production` sets cookie `secure: true`
- [ ] Add `CORS_ORIGIN` env var and validate in server

#### F3 — Edge Case Handling
- [ ] Rate limit `POST /auth/request-otp`: 3 per 15min per IP
- [ ] Rate limit `POST /auth/verify-otp`: covered by attempt_count lock
- [ ] `POST /auth/request-otp` when Telegram is down → `503` with friendly message
- [ ] Admin deactivating own account → `400 CANNOT_DEACTIVATE_SELF`
- [ ] Only Super Admin locked → manual DB intervention documented in README

#### F4 — Acceptance Criteria Sign-off Checklist
- [ ] SC-001: Full login flow under 60 seconds ✓
- [ ] SC-002: Expired OTP always rejected ✓
- [ ] SC-003: 5 failed attempts → lock, no bypass ✓
- [ ] SC-004: All 3 roles independently accessible, no cross-role leakage ✓
- [ ] SC-005: Admin creates/deactivates/lists users in ≤ 3 clicks ✓
- [ ] SC-006: 100% protected routes reject unauthenticated requests ✓
- [ ] SC-007: Every session reset logged in audit table ✓

---

## API Endpoints Implemented This Week

| Method | Endpoint | Controller | Auth |
|---|---|---|---|
| POST | /auth/request-otp | auth.controller | Public |
| POST | /auth/verify-otp | auth.controller | Public |
| POST | /auth/logout | auth.controller | All Auth |
| GET | /users/me | users.controller | All Auth |
| POST | /users | users.controller | Admin |
| PATCH | /users/:id/deactivate | users.controller | Admin |
| GET | /users | users.controller | Admin |
| GET | /users/:id | users.controller | All Auth |
| PATCH | /users/:id/profile | users.controller | All Auth |
| GET | /admin/audit-logs | users.controller | Super Admin |
| POST | /admin/users/:id/reset-login | users.controller | Super Admin |
| DELETE | /admin/hard-delete/:resource/:id | users.controller | Super Admin |
| GET | /admin/settings | users.controller | Super Admin |
| PATCH | /admin/settings | users.controller | Super Admin |

Total: **14 endpoints** (13 from spec + `/users/me` for frontend session)

---

## Database Tables Used This Week

| Table | Operations |
|---|---|
| `users` | SELECT, INSERT, UPDATE |
| `otp_sessions` | SELECT, INSERT, UPDATE |
| `admin_audit_log` | INSERT (immutable) |

> `admin_audit_log` handles system-level actions (session resets, account changes). Kept separate from `violation_audit_log` which is scoped to violation records only.

---

## Packages to Install

### Server
```
express cookie-parser cors helmet morgan express-rate-limit
jsonwebtoken bcryptjs
@prisma/client prisma
zod
winston
axios
dotenv
nodemon (dev)
```

### Client
```
react react-dom
vite @vitejs/plugin-react
tailwindcss postcss autoprefixer
@tanstack/react-query
axios
react-router-dom
```

---

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Telegram Bot not set up yet | Set up Bot via @BotFather before Day 1 ends — system cannot be tested without it |
| Railway PostgreSQL cold start | Add retry logic on Prisma connect in `server/index.js` |
| OTP brute-force between attempts | `attempt_count` checked before hash comparison — no timing leak |
| httpOnly cookie not sent in dev | Vite proxy `/api` → localhost:3000 handles CORS; `withCredentials: true` on Axios |
| First Super Admin chicken-and-egg | Seed script bypasses the OTP flow to insert directly into DB |

---

## What Is NOT in This Week

- Duty calendar, duty slots, attendance — Week 2
- Violations — Week 3
- Cover requests, messaging — Phase 2
- Reports — Phase 3
- Photo attachments — foundation only, not implemented
- Email/SMS notifications — never, Telegram only

---

*Plan version: 1.0 — Generated: 2026-06-06*
*Implements: spec.md Week 1 | Constitution v2.6*
