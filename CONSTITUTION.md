# SIMS DMS — Project Constitution

> This file is the single source of truth for the SIMS Discipline Management System.
> Claude Code must read and follow this document before taking any action on this codebase.
> Do not deviate from decisions recorded here without explicit instruction from the project owner.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Project Name | SIMS Discipline Management System (SIMS DMS) |
| Institution | SIMS College of Pharmacy |
| Purpose | Replace the manual paper-based discipline process with a digital system for managing faculty duties, student violations, and reporting |
| Scale | Single college, ~20–30 faculty members |
| Status | Active development — Phase 1 in progress |

---

## 2. Non-Negotiable Tech Stack

These decisions are locked. Do not suggest alternatives or use different tools.

### Frontend

| Tool | Purpose |
|---|---|
| React.js | UI framework — PWA + responsive |
| Vite | Build tooling — replaces Create React App |
| TanStack Query | API state management, caching, 30-second polling |
| Tailwind CSS | Mobile-first responsive styling — all custom layout, typography, and one-off components |
| Mantine (`@mantine/core`, `@mantine/hooks`) | Accessible form primitives (`TextInput`, `Select`, `Checkbox`, `Switch`, `NumberInput`) and overlay focus handling (`Modal`, nav `Drawer`) — kept specifically for behavior not worth re-implementing (focus trapping, keyboard nav, ARIA wiring), not for general styling. **Mantine's color palette is derived from the Tailwind DS tokens** (`client/src/App.jsx` `mantineTheme` object); if brand or status colors change, both `index.css @theme` and `mantineTheme.colors` must be updated in sync to prevent palette drift. |
| Workbox | PWA service worker caching |

> **Evaluated and rejected (2026-07-01): Server-Driven UI (SDUI) for the Admin desktop panel.** SDUI earns its complexity when UI needs to change without a redeploy (native apps gated by app-store review) or one backend serves many heterogeneous clients. Neither applies — this is a single web admin panel for one college's admin team, redeploys are a `git push` to Railway, and scale is ~20-30 faculty. Stick with React + Tailwind + TanStack Query above; do not revisit without a changed scale/deploy constraint.

### Backend

| Tool | Purpose |
|---|---|
| Node.js + Express | Server — monolithic architecture, no microservices |
| Prisma | ORM — all DB access goes through Prisma, no raw SQL except complex reports |
| Zod | Input validation — all API inputs must be validated with Zod schemas |
| Helmet.js | Secure HTTP headers — applied globally |
| express-rate-limit | Brute force protection on OTP and all API routes |
| Morgan + Winston | Morgan for HTTP request logging, Winston for app/error logs |

### Infrastructure

| Layer | Decision |
|---|---|
| Database | PostgreSQL — hosted on Railway |
| Hosting | Railway — both staging and production |
| Auth | Email + password → JWT stored in httpOnly cookie + CSRF token. Telegram is used for notifications only, never for login |
| Real-time | 30-second polling — no WebSockets, no SSE |
| API style | REST — no GraphQL |
| App structure | Monolithic — single repo, single deploy |
| PWA updates | Optimistic UI on IN/OUT button |
| Reliability | Railway auto-backups + `/health` endpoint + error boundaries |

---

## 3. User Roles & Permissions

There are exactly 3 roles. Do not add, merge, or rename roles.

### Super Admin
- Full unrestricted access to all modules, roles, and data in the system
- Manages Admin accounts (create, deactivate)
- Resets any user's login session or password (including locked accounts) — generates a temporary password, forces a change on next login, and notifies the user via Telegram
- Views all audit logs across all roles and modules
- Configures system-wide settings
- Can permanently hard-delete any record — the only role that can do this
- Has all Admin permissions

### Admin
- Creates, activates, and deactivates user accounts
- Manages the duty calendar (open/close window, block holidays, set working days, set sessions per faculty)
- Assigns duty slots to faculty who missed the window
- Uploads and manages student Excel data
- Views all duty slots and live attendance dashboard
- Overrides attendance records with a reason
- Reviews and resolves flagged violation records
- Views all violations, can hide records
- Manages violation types
- Confirms or rejects Need Cover requests
- Configures max cover requests per slot
- Configures Duty Timing Settings — Morning/Afternoon session start times, late-arrival cutoffs, not-checked-in cutoffs, and auto clock-out times (`/duty-timing-settings`, shared with Super Admin — the only `system_config` fields Admin can edit; other system-wide settings such as `cover_ttl_hours` remain Super-Admin-only via `/admin/settings`)
- Access to all 16 reports

### Faculty
- Picks their own duty slots during the open window
- Checks IN and OUT for their own duty sessions
- Records student violations during their duty
- Posts "Need Cover" broadcast when unable to attend a duty slot
- Flags their own violation records for review
- Views own duty history, violations recorded, pending requests
- Can send/receive internal messages

---

## 4. Core Business Rules

These are non-negotiable rules encoded in the planning document. Every feature must respect them.

### Authentication
- Login is via registered email + password. No Telegram OTP, no SMS, no email OTP.
- Passwords are hashed with bcrypt (cost factor 12) — plaintext is never stored or logged.
- JWT stored in httpOnly cookie — never in localStorage. A CSRF token (`sims_csrf` cookie +
  `X-CSRF-Token` header) is required on every mutating request.
- `session_version` on the user row is embedded in the JWT and checked on every request.
  Incrementing it (on deactivate, reactivate, delete, role change, or password reset)
  instantly revokes all of that user's existing sessions — this is the forced-logout
  mechanism.
- New accounts and any admin-reset account are flagged `must_change_password = true` and are
  forced to set a new password via `POST /auth/change-password` before using the rest of the
  system.
- `POST /auth/login` is rate-limited per IP (50 requests / 15 min in production). There is no
  per-account failed-attempt lockout counter — brute-force defense is IP-level rate limiting
  only.
- All routes except `/auth/login` require a valid JWT.
- **Admin-triggered password reset**: Super Admin can trigger a password reset for any user.
  This generates a new temporary password, sets `must_change_password = true`, increments
  `session_version` (revoking any existing session), and notifies the user of the temporary
  password via Telegram — no email, no SMS. This is the system's only "forgot password"
  recovery path; there is no self-service reset.

### Duty Calendar
- Admin manually opens the scheduling window whenever ready — it does not auto-open.
- Before opening, Admin blocks holidays and sets working days for the month.
- When Admin opens the window, ALL faculty receive an instant Telegram notification.
- Faculty pick their sessions during the open window only.
- Window auto-closes on the last day of the month.
- Admin can also manually close the window early at any time.
- If faculty do not pick slots before window closes, Admin manually assigns their slots.
- Number of sessions per faculty per month is configurable by Admin (default: 3).
- Maximum cover requests per duty slot is configurable by Admin — not a fixed number.

### Duty Attendance
- Faculty can only check IN during their assigned duty session window.
- Late IN is flagged automatically based on the Admin-configured, per-session late-arrival cutoff (`system_config` — see Duty Timing Settings, §3 Admin permissions). There is no hardcoded time; session start, late cutoff, not-checked-in cutoff, and auto clock-out are each independently configurable for Morning and Afternoon.
- If faculty do not check OUT, the system auto-clocks them out at the configured per-session auto clock-out time via cron job — Morning and Afternoon may have different times (e.g. 12:00 PM vs 5:00 PM), evaluated independently.
- A faculty member who has not checked in by the configured not-checked-in cutoff for their session is flagged as such on the live attendance dashboard.
- Changing a Duty Timing Setting takes effect immediately for future check-ins/clock-outs only — existing `duty_attendance` records are never retroactively recalculated.
- Admin can override any attendance record but must provide a reason.
- Auto-out records are flagged (`auto_out = true`) and visible in reports.

### Violations
- Violations are recorded by Faculty during their duty session.
- Violation types are managed by Admin. The "Others" type is system-locked and cannot be deleted.
- Each violation has a fine amount. Faculty can override the default fine.
- Faculty can mark a violation as "warning only" (no fine).
- Photo attachments are removed from all phases — violations are text-only records.
- Faculty can flag their own violation record for Admin review (replaces correction request module).
- A flagged violation sets `is_flagged = true` on the violation row — no separate table or module.
- Admin reviews and resolves flags. Resolution is logged in `violation_audit_log`.
- Admin can hide a violation record — hidden records are not physically deleted.
- All changes to violations are tracked in `violation_audit_log` — this log is immutable.

### Need Cover (replaces Reschedule Requests)
- Faculty post a "Need Cover" broadcast when they cannot attend a duty slot.
- The broadcast is visible to all other faculty — not a one-to-one request.
- Any available faculty can volunteer to cover the slot.
- Admin confirms or rejects the cover assignment.
- Unanswered broadcasts auto-expire after 48 hours (cron job checks `expires_at`).

### Notifications
- All system notifications (duty window open, cover requests, reminders, admin-triggered
  password resets) are sent via Telegram Bot only.
- No email, no SMTP, no SMS — Telegram is the sole notification channel.
- Telegram is notification-only. It plays no role in login or session issuance (see
  Authentication) — a user with no Telegram linked can still log in with email + password,
  they simply won't receive Telegram notifications.
- The in-app message inbox (`useInbox`, faculty dashboard + Messages page) also polls every
  30 seconds. This is a deliberate UX choice beyond the "live attendance" 30-second-polling
  rationale — confirmed intentional (2026-07) during a perf audit, not scope creep. Noting
  it explicitly here so it isn't flagged again as an unintended over-application of the
  polling pattern.

### Students
- Student data is uploaded via Excel. Upsert logic — `registration_number` is the unique key.
- Existing records are updated, new ones created, missing ones deactivated — never deleted.
- Failed upload rows are stored in `student_upload_log.errors` (JSONB).
- Students can be promoted to the next semester/year by Admin.

### Data & Safety
- All deletes are soft deletes using `deleted_at` — except Super Admin hard delete.
- **Exception — messages**: a `messages` row is physically deleted when both `deleted_by_sender = true` and `deleted_by_receiver = true`. This is the only non-Super-Admin physical delete permitted in the system. It is intentional: retaining abandoned message rows indefinitely after both parties have dismissed them provides no audit value and would accumulate unbounded storage. The `violation_audit_log` and `admin_audit_log` tables remain fully immutable and are unaffected by this exception.
- All tables use UUID primary keys — never sequential integers.
- All monetary values use `DECIMAL(8,2)` — never floats.
- Every table has `created_at` and `updated_at` timestamps.

---

## 5. Database — 14 Tables

All migrations must match this schema exactly. Full column definitions in `SIMS_Database_Schema_v2.1.md`.

| Table | Purpose |
|---|---|
| `users` | All system users — 3 roles: Faculty, Admin, Super Admin |
| `students` | Student master data uploaded via Excel |
| `duty_slots` | Monthly duty assignments per faculty |
| `duty_attendance` | Faculty IN/OUT timestamps and status per duty slot |
| `violation_types` | Predefined violation categories (system-locked types cannot be deleted) |
| `violations` | All recorded student violations — includes `is_flagged` for review and photo fields as foundation |
| `violation_audit_log` | Immutable change history scoped to violation records only |
| `admin_audit_log` | Immutable system-level audit trail — session resets, account changes, hard deletes, settings |
| `cover_requests` | Need Cover broadcasts — open to all faculty, confirmed by Admin |
| `calendar_config` | Monthly window config — open/close state, blocked holidays, working days, sessions per faculty |
| `messages` | Two-way internal messaging between users |
| `system_config` | Single-row system-wide timing thresholds — session start, late detection, not-checked-in cutoff, and auto clock-out (each per Morning/Afternoon session), plus cover TTL |
| `photo_access_log` | ⚠ Foundation placeholder — not active in Phase 1 |
| `student_upload_log` | History of Excel uploads including error rows |

> **Removed**: `correction_requests` (replaced by `violations.is_flagged`), `reschedule_requests` (replaced by `cover_requests`), `otp_sessions` (Telegram OTP login was built and then abandoned in favor of email/password — see §4 Authentication)

### Key Schema Rules
- `admin_audit_log` — system-level actions only (password resets, account changes, hard deletes). Never mix with `violation_audit_log`
- `violations.is_flagged` — set by Faculty to request Admin review; resolved via `flag_resolved_by` + `flag_resolved_at`
- `violations.photo_path` / `violations.photo_expires_at` — foundation columns, not used in Phase 1
- `cover_requests.expires_at` — used by cron for 48hr auto-expiry
- `violation_types.is_system` — prevents deletion of built-in types
- `student_upload_log.errors` — JSONB array of failed rows with reason
- `calendar_config.working_days` — JSONB array of working days set by Admin before opening window

---

## 6. API — 95 Endpoints Across 12 Modules

| Module | Count | Base Path |
|---|---|---|
| Authentication | 3 | `/auth` |
| Users & Accounts | 10 | `/users`, `/admin` |
| Students | 10 | `/students` |
| Duty Calendar | 8 | `/calendar` |
| Duty Slots | 6 | `/duty-slots` |
| Duty Attendance | 5 | `/attendance` |
| Violations | 10 | `/violations` |
| Violation Types | 5 | `/violation-types` |
| Need Cover | 9 | `/cover-requests` |
| Messages | 6 | `/messages` |
| Invites | 4 | `/invites` |
| Reports | 17 | `/reports` |

Full endpoint definitions in `SIMS_API_Endpoints_v2.0.md` (v2.2).

All endpoints return JSON. All errors follow the format:
```json
{ "error": true, "code": "ERROR_CODE", "message": "Human-readable message" }
```

---

## 7. Project Structure

Follow this folder structure exactly. Do not reorganise without updating this file.

```
/
├── client/                   # React frontend (Vite + Tailwind + TanStack Query)
│   ├── src/
│   │   ├── pages/            # One folder per role
│   │   ├── components/       # Shared UI components
│   │   ├── hooks/            # TanStack Query hooks
│   │   ├── utils/            # Utilities, constants
│   │   └── main.jsx
│   └── public/
│
├── server/                   # Node.js + Express backend
│   ├── routes/               # One file per module
│   ├── controllers/          # Business logic
│   ├── services/             # Reusable service functions
│   ├── middleware/           # Auth, validation (Zod), rate limit
│   ├── lib/                  # Telegram bot, cron jobs, helpers
│   └── index.js
│
├── prisma/                   # Prisma at root — CLI default, easier for migrations
│   ├── schema.prisma         # Single source of truth for DB schema
│   └── migrations/
│
├── db/                       # Seed data and setup scripts
├── specs/                    # Spec Kit — one spec per feature/week
├── CONSTITUTION.md           # This file — always read first
└── CLAUDE.md                 # Claude Code steering file
```

---

## 8. Development Phases

### Phase 1 — MVP (Weeks 1–4) ← CURRENT
Auth, user accounts, students, duty calendar, slot picking, IN/OUT attendance, core violations. Goal: system is live and usable by real faculty.

### Phase 2 — Core Complete (Weeks 5–8)
Cover requests (Need Cover broadcast), violation flags + audit trail, messaging, Super Admin panel.

### Phase 3 — Full System (Weeks 9–12)
All 16 reports, role-based dashboards, Telegram notifications, PWA polish, UAT with staff, production launch.

**Rule: Do not start Phase 2 tasks while Phase 1 has open bugs.**

---

## 9. Cron Jobs Required

These must be implemented by end of Phase 1 for the system to function correctly.

| Job | Schedule | Action |
|---|---|---|
| Auto clock-out | Every 10 minutes | For each session (Morning/Afternoon) whose Admin-configured auto clock-out time has passed, set `out_time`, `auto_out = true` for any unchecked-out faculty in that session — each session evaluated independently against its own configured time (see Duty Timing Settings, §3 Admin permissions) |
| Cover request expiry | Every hour | Set status = `expired` where `expires_at < NOW()` and status = `pending` |
| Calendar auto-close | Daily midnight | Set `is_window_open = false` on the last day of the month |

---

## 10. What Claude Code Must Never Do

- Never use localStorage or sessionStorage for auth tokens — httpOnly cookie only
- Never use sequential integer IDs — UUID only
- Never use floats for money — DECIMAL(8,2) only
- Never physically delete records unless the caller is Super Admin using the hard-delete endpoint
- Never bypass Zod validation on any API input
- Never add a new table or column to the database without checking this constitution first
- Never use `console.log` in production code — use Winston logger
- Never expose the JWT secret, Telegram bot token, or database URL in code or comments
- Never create a new role or modify role names — system has exactly 3 roles: Super Admin, Admin, Faculty
- Never change the folder structure without explicit instruction

---

## 11. Environment Variables Required

```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
NODE_ENV=development|production
PORT=3000
```

---

*Constitution version: 3.2 — Updated: July 2026*
*All decisions in this file were confirmed by the project owner across planning sessions.*
*Do not modify this file without project owner approval.*
