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
| Tailwind CSS | Mobile-first responsive styling |
| Workbox | PWA service worker caching |

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
| Auth | Telegram OTP → JWT stored in httpOnly cookie. No email/SMS fallback — Telegram only |
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
- Resets any user's login session (including locked accounts)
- Views all audit logs across all roles and modules
- Configures system-wide settings
- Can permanently hard-delete any record — the only role that can do this
- Has all Admin permissions

### Admin
- Approves and deactivates user accounts
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
- Login is via Telegram OTP only. No passwords, no email OTP, no SMS.
- If Telegram is unavailable, users wait — no fallback mechanism, no extra infrastructure.
- OTP expires in 5 minutes. Maximum 5 failed attempts before lockout.
- JWT stored in httpOnly cookie — never in localStorage.
- All routes except `/auth/request-otp` and `/auth/verify-otp` require a valid JWT.

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
- Late IN is flagged automatically based on the session start time.
- If faculty do not check OUT, the system auto-clocks them out at 4:30 PM via cron job.
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
- All system notifications (duty window open, cover requests, reminders) are sent via Telegram Bot only.
- No email, no SMTP, no SMS — Telegram is the sole notification channel.

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

## 5. Database — 15 Tables

All migrations must match this schema exactly. Full column definitions in `SIMS_Database_Schema_v2.1.md`.

| Table | Purpose |
|---|---|
| `users` | All system users — 3 roles: Faculty, Admin, Super Admin |
| `otp_sessions` | Telegram OTP flow — stores hash, expiry, attempt count |
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
| `system_config` | Single-row system-wide timing thresholds — late detection, auto clock-out, cover TTL |
| `photo_access_log` | ⚠ Foundation placeholder — not active in Phase 1 |
| `student_upload_log` | History of Excel uploads including error rows |

> **Removed**: `correction_requests` (replaced by `violations.is_flagged`), `reschedule_requests` (replaced by `cover_requests`)

### Key Schema Rules
- `otp_sessions.user_id` — FK to `users`. User must exist and be active before an OTP session can be created
- `admin_audit_log` — system-level actions only (session resets, account changes, hard deletes). Never mix with `violation_audit_log`
- `violations.is_flagged` — set by Faculty to request Admin review; resolved via `flag_resolved_by` + `flag_resolved_at`
- `violations.photo_path` / `violations.photo_expires_at` — foundation columns, not used in Phase 1
- `cover_requests.expires_at` — used by cron for 48hr auto-expiry
- `violation_types.is_system` — prevents deletion of built-in types
- `student_upload_log.errors` — JSONB array of failed rows with reason
- `calendar_config.working_days` — JSONB array of working days set by Admin before opening window

---

## 6. API — 63 Endpoints Across 10 Modules

| Module | Count | Base Path |
|---|---|---|
| Authentication | 3 | `/auth` |
| Users & Accounts | 9 | `/users`, `/admin` |
| Students | 6 | `/students` |
| Duty Calendar | 7 | `/calendar` |
| Duty Slots | 6 | `/duty-slots` |
| Duty Attendance | 5 | `/attendance` |
| Violations | 10 | `/violations` |
| Violation Types | 5 | `/violation-types` |
| Need Cover | 7 | `/cover-requests` |
| Messages | 5 | `/messages` |

Full endpoint definitions in `SIMS_API_Endpoints_v2.0.md`.

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
| Auto clock-out | Daily 4:30 PM | Set `out_time = 4:30 PM`, `auto_out = true` for any unchecked-out faculty |
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

*Constitution version: 2.7 — Updated: June 2026*
*All decisions in this file were confirmed by the project owner across planning sessions.*
*Do not modify this file without project owner approval.*
