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
| Status | All three build phases functionally complete (see §8) — now in QA/UAT before production launch |

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
- Resets any user's login session or password (including locked accounts) — generates a temporary password, forces a change on next login, and notifies the user via Telegram. Self-service reset via Telegram bot (`/resetpassword`) is also available to any linked user; Super Admin reset is the only path for users without a linked Telegram.
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
- Reassigns a faculty member's duty slot to another faculty member from the Duty Slots section when the original faculty cannot attend (Admin Duty Reassignment)
- Configures Duty Timing Settings — Morning/Afternoon session start times, late-arrival cutoffs, and auto clock-out times (`/duty-timing-settings`, shared with Super Admin — the only `system_config` fields Admin can edit; other system-wide settings remain Super-Admin-only via `/admin/settings`)
- Access to all 16 reports

### Faculty
- Picks their own duty slots during the open window — the pick is final; a faculty member cannot unpick a slot themselves. Changing a picked slot's owner is only possible via Admin Duty Reassignment or Faculty-Requested Reassignment (§4)
- Checks IN and OUT for their own duty sessions
- Records student violations during their duty
- Requests a duty reassignment directly from a colleague when unable to attend a duty slot — selects an eligible faculty member, who must accept before the duty transfers (Faculty-Requested Reassignment, §4). This is a dedicated request/accept workflow, not the messaging system. Admin can still reassign any duty directly and unilaterally at any time (Admin Duty Reassignment, §4) — the two methods are independent.
- Flags their own violation records for review
- Views own duty history, violations recorded, pending requests
- Can send/receive internal messages
- Can reset own password via Telegram bot (`/resetpassword`) if Telegram is linked

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
- **Self-service password reset via Telegram**: A linked user can send `/resetpassword` to the
  Telegram bot. This generates a new temporary password, sets `must_change_password = true`,
  increments `session_version` (revoking any existing session), and sends the temporary
  password back via Telegram. Rate-limited to 1 reset per hour per user.
- **Admin-triggered password reset**: Super Admin can trigger a password reset for any user.
  This generates a new temporary password, sets `must_change_password = true`, increments
  `session_version` (revoking any existing session), and notifies the user of the temporary
  password via Telegram — no email, no SMS.
- `session_version` is incremented on self password change (`POST /auth/change-password`),
  self-service bot reset, and admin-triggered reset — the JWT cookie is reissued on self
  change so the user's current session is not invalidated.

### Duty Calendar
- Admin manually opens the scheduling window whenever ready — it does not auto-open.
- Before opening, Admin blocks holidays and sets working days for the month.
- When Admin opens the window, ALL faculty receive an instant Telegram notification.
- Faculty pick their sessions during the open window only.
- Window auto-closes on the last day of the month.
- Admin can also manually close the window early at any time.
- If faculty do not pick slots before window closes, Admin manually assigns their slots.
- Number of sessions per faculty per month is configurable by Admin (default: 3).

### Duty Attendance
- Faculty can only check IN during their assigned duty session window.
- Late IN is flagged automatically based on the Admin-configured, per-session late-arrival cutoff (`system_config` — see Duty Timing Settings, §3 Admin permissions). There is no hardcoded time; session start, late cutoff, and auto clock-out are each independently configurable for Morning and Afternoon.
- If faculty do not check OUT, the system auto-clocks them out at the configured per-session auto clock-out time via cron job — Morning and Afternoon may have different times (e.g. 12:00 PM vs 5:00 PM), evaluated independently.
- A faculty member who has not checked in is shown as "Not checked in" on the live attendance dashboard from that session's configured start time until its auto clock-out — a stageless rule with no separate not-checked-in cutoff (removed 2026-07, see version history).
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

### Duty Reassignment — Two Independent Methods (replaces Need Cover / Volunteer)
There is exactly one concept — **Reassigned Duty** — reachable by two independent
methods. Do not model "extra duty", "additional duty", "volunteer duty", or "admin
assigned duty" as separate concepts. Both methods write to the same
`duty_reassignments` history table (§5), so reports and dashboards never need to
merge two sources of truth.

Shared eligibility rule for **both** methods: only a still-`scheduled` duty slot
whose date has not passed and that has no recorded attendance can be reassigned.

**Method 1 — Admin Duty Reassignment (direct, no approval needed).**
- The Admin manually reassigns any eligible duty from the **Duty Slots** section,
  choosing another faculty member and optionally recording a reason. This is an
  admin-controlled action, not a volunteer/broadcast system — it takes effect
  immediately, with no acceptance step.
- On reassignment the slot's `faculty_id` is updated in place to the new faculty and
  one immutable row is written to `duty_reassignments` (from/to faculty, reason,
  admin as `reassigned_by`, timestamp).
- Both faculty are notified via Telegram when this happens.

**Method 2 — Faculty-Requested Reassignment (peer-to-peer, requires acceptance).**
- A faculty member who cannot attend a duty selects an eligible colleague directly
  from **My Slots** ("Request Reassignment") — never via the messaging system, which
  remains general Admin↔Faculty communication only and plays no role in this
  workflow.
- Eligible colleagues are: active faculty, excluding the requester, excluding anyone
  who already holds a duty at the same date/session.
- This creates a `pending` row in `duty_reassignment_requests`. The target faculty
  is notified via Telegram and sees the request on their dashboard with
  Accept/Reject actions. **No duty changes hands until the target faculty accepts** —
  this is the key difference from Method 1.
- On acceptance: the slot's `faculty_id` transfers (same effect as Method 1), one row
  is written to `duty_reassignments` (`reassigned_by` = the accepting faculty, since
  they are the one whose approval executed the transfer), the request row is marked
  `approved`, and any other still-pending requests for the same slot are
  auto-`declined` (the slot is spoken for). Both faculty are notified via Telegram.
- On rejection: only the request row is marked `declined` — the duty stays with the
  original faculty, who may request a different colleague or use Method 1 via the
  Admin.
- Eligibility (scheduled / not past / no attendance) is re-checked at acceptance
  time as well as at request time, since time may have passed between the two.

### Notifications
- All system notifications (duty window open, duty reassignments, reminders, admin-triggered
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
- Every data table has `created_at`; mutable tables also have `updated_at`. Immutable audit/cross-reference tables (`admin_audit_log`, `violation_audit_log`, `messages`, `duty_reassignments`, `telegram_relink_tokens`, `student_upload_log`) omit `updated_at` by design — rows are never updated after creation.

---

## 5. Database — 17 Tables

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
| `duty_reassignments` | Reassignment history — from/to faculty, reason, `reassigned_by` (admin or accepting faculty), timestamp. Shared by both reassignment methods (§4) |
| `duty_reassignment_requests` | Faculty-Requested Reassignment (Method 2, §4) — pending/approved/declined requests between faculty; ephemeral workflow state, not history (history lives in `duty_reassignments` once approved) |
| `calendar_config` | Monthly window config — open/close state, blocked holidays, working days, sessions per faculty |
| `messages` | Two-way internal messaging between users |
| `system_config` | Single-row system-wide timing thresholds — session start, late detection, and auto clock-out (each per Morning/Afternoon session) |
| `photo_access_log` | ⚠ Foundation placeholder — not active in Phase 1 |
| `student_upload_log` | History of Excel uploads including error rows |
| `pending_invites` | Temporary invite tokens for new account activation via Telegram |
| `telegram_relink_tokens` | Temporary tokens for relinking an existing user to a new Telegram account |

> **Removed**: `correction_requests` (replaced by `violations.is_flagged`), `reschedule_requests` then `cover_requests` (the Need Cover / Volunteer workflow was built and then removed in favor of Admin Duty Reassignment — `duty_reassignments`, see §4), `otp_sessions` (Telegram OTP login was built and then abandoned in favor of email/password — see §4 Authentication)

### Key Schema Rules
- `admin_audit_log` — system-level actions only (password resets, account changes, hard deletes). Never mix with `violation_audit_log`
- `violations.is_flagged` — set by Faculty to request Admin review; resolved via `flag_resolved_by` + `flag_resolved_at`
- `violations.photo_path` / `violations.photo_expires_at` — foundation columns, not used in Phase 1
- `duty_reassignments` — append-only history; the current owner of a slot is always `duty_slots.faculty_id`, and the latest reassignment row (if any) describes who it was moved from and by whom. Written by both reassignment methods (§4) — `reassigned_by` is the admin for Method 1, the accepting faculty for Method 2
- `duty_reassignment_requests` — mutable workflow state (`pending` → `approved`/`declined`), not history. `status` is a plain string, not an enum, matching the Prisma model. Accepting one request auto-declines any other pending requests for the same `duty_slot_id`
- `violation_types.is_system` — prevents deletion of built-in types
- `student_upload_log.errors` — JSONB array of failed rows with reason
- `calendar_config.working_days` — JSONB array of working days set by Admin before opening window
- `system_config` timing fields are session-scoped by naming convention (`{concept}_{morning,afternoon}_{hour,min}`) — there is no shared/default fallback field for any timing concept. Ordering (`session_start < late_threshold ≤ auto_checkout`, per session) is enforced at the application layer (`duty-timing-settings.controller.js`), not as a DB constraint — any new code path that writes to `system_config` timing fields directly (bypassing `settingsService`) would skip this check

---

## 6. API — 109 Endpoints Across 14 Modules

Counts verified directly against `server/routes/*.routes.js`. The Need Cover module (9 endpoints under `/cover-requests`) was removed; Duty Slots grew from 6 to 8 with the admin reassignment endpoints (`POST /duty-slots/:id/reassign`, `GET /duty-slots/reassigned-away/:year/:month`), then dropped to 7 when `DELETE /duty-slots/:id/unpick` was removed (P26 — faculty can no longer unpick a picked slot; Admin Duty Reassignment or Faculty-Requested Reassignment are now the only ways to change a picked slot's owner). Two modules were added since: Analytics (P24 Student Discipline Analytics Dashboard) and Duty Reassignment Requests (P27 Faculty-Requested Reassignment, §4 Method 2).

| Module | Count | Base Path |
|---|---|---|
| Authentication | 3 | `/auth` |
| Users & Accounts | 12 | `/users`, `/admin` |
| Students | 10 | `/students` |
| Duty Calendar | 8 | `/calendar` |
| Duty Slots | 7 | `/duty-slots` |
| Duty Attendance | 5 | `/attendance` |
| Duty Timing Settings | 2 | `/duty-timing-settings` |
| Violations | 10 | `/violations` |
| Violation Types | 5 | `/violation-types` |
| Messages | 6 | `/messages` |
| Invites | 4 | `/invites` |
| Reports | 22 | `/reports` |
| Analytics | 10 | `/analytics` |
| Duty Reassignment Requests | 5 | `/duty-reassignment-requests` |

Reports is 22 endpoints (grew 17→22 with P28 Enhanced Reports System): the Student Violation Report gained a `format=pdf`-equivalent sibling route (`GET /reports/student-violations/pdf`) alongside its existing `/export` (.xlsx), and the previously JSON-only Daily and Weekly variants each gained their own `/export` (.xlsx) and `/pdf` routes (`GET /reports/student-violations/daily/:date/export`, `/daily/:date/pdf`, `/weekly/export`, `/weekly/pdf`) — fixing a bug where Daily/Weekly "Excel" downloads previously pointed at the JSON display endpoints and saved a corrupt file. All Student Violation Report exports (Excel and PDF, all five periods) exclude Fine Amount — the report is a discipline-tracking tool, not a financial one; fine amounts remain in the unrelated Pending Fines report.

Analytics (10): `GET /summary`, `/trend`, `/violation-types`, `/repeat-violators`, `/course-analysis`, `/year-analysis`, `/faculty-analysis`, `/heatmap`, `/export/counselling`, `/filter-options` — admin/super_admin only, backs the Student Discipline Analytics Dashboard (all 3 phases now built: summary/filters/repeat-violators, trend+course+year charts, faculty analysis + heatmap + Excel export; see `specs/004-student-analytics-dashboard/handoff.md`).

Duty Reassignment Requests (5): `POST /`, `GET /`, `GET /sent`, `GET /eligible-faculty/:dutySlotId`, `PATCH /:id` — faculty only. Implements Method 2 of §4 Duty Reassignment.

Not counted above: `POST /bot/webhook/:secret` (`server/routes/bot.routes.js`) — a Telegram-facing webhook receiver, not part of the client-facing API surface this table describes.

Full endpoint definitions in `SIMS_API_Endpoints_v2.0.md` (v2.2) — **this file is now stale against the counts above and should be regenerated/updated to match.**

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

### Phase 1 — MVP (Weeks 1–4) ✅ Built
Auth, user accounts, students, duty calendar, slot picking, IN/OUT attendance, core violations.

### Phase 2 — Core Complete (Weeks 5–8) ✅ Built
Cover requests (Need Cover broadcast — later removed in favor of Admin Duty Reassignment, see §4), violation flags + audit trail, messaging, Super Admin panel.

### Phase 3 — Full System (Weeks 9–12) ✅ Built ← CURRENT (QA/UAT)
All 16 reports, role-based dashboards, Telegram notifications, PWA polish. Remaining before production launch: UAT with staff, production sign-off.

All three phases are functionally implemented in code (verified 2026-07: 17 report endpoints, Super Admin panel, PWA/Workbox config, and all 3 required cron jobs are present and passing tests). "Built" here means the code exists and is tested — it does not by itself mean UAT/staff sign-off has happened. Update this line to "Launched" once production UAT is signed off.

---

## 9. Cron Jobs Required

These must be implemented by end of Phase 1 for the system to function correctly.

| Job | Schedule | Action |
|---|---|---|
| Auto clock-out | Every 10 minutes | For each session (Morning/Afternoon) whose Admin-configured auto clock-out time has passed, set `out_time`, `auto_out = true` for any unchecked-out faculty in that session — each session evaluated independently against its own configured time (see Duty Timing Settings, §3 Admin permissions) |
| Calendar auto-close | 23:55 IST daily | Set `is_window_open = false` on the last day of the month |

> The former hourly **Cover request expiry** job was removed together with the Need Cover / Volunteer workflow (see §4 Admin Duty Reassignment).

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
- Never hardcode a time-of-day threshold (session start, late cutoff, not-checked-in cutoff, auto clock-out) in application code — always read it from `system_config` via `settingsService.getSettings()`. This is exactly the anti-pattern the Duty Timing Settings feature (§3 Admin permissions, §4 Duty Attendance) was built to eliminate; reintroducing a hardcoded value in a new code path defeats it silently

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

*Constitution version: 3.9 — Updated: July 2026 (P28 Enhanced Reports System — added PDF export via `pdfkit` alongside the existing Excel export for the Student Violation Report's five period variants (daily/weekly/monthly/yearly/overall); fixed a bug where Daily/Weekly "Excel" downloads saved a corrupt JSON-as-xlsx file; added Course/Academic Year/Violation Type/Faculty filters to the Student Violation Report, applied consistently across all five periods; closed a pre-existing gap where the Daily/Weekly report routes had no Zod query validation — §6, Reports module 17→22 endpoints, total 104→109)*
*Constitution version: 3.8 — Updated: July 2026 (removed faculty slot-unpick entirely — `DELETE /duty-slots/:id/unpick` and its UI dropped; a picked slot is now final and can only change owner via Admin Duty Reassignment or Faculty-Requested Reassignment, §3, §4, §6; Duty Slots module 8→7 endpoints, total 105→104)*
*Constitution version: 3.7 — Updated: July 2026 (dropped the unused `Student.section` column entirely — Year/Semester were already independent fields everywhere in the UI; removed the not-checked-in cutoff concept from Duty Timing Settings — §3, §4, §5 — a not-yet-checked-in faculty member now always shows "Not checked in" from session start to auto clock-out, no separate time-gated stage)*
*Constitution version: 3.6 — Updated: July 2026 (§6 Analytics module grew 5→10 endpoints as P24 Phases 2–3 were built — trend/course/year charts, faculty analysis, calendar heatmap, counselling-list Excel export; total 100→105)*
*Constitution version: 3.5 — Updated: July 2026 (added Faculty-Requested Reassignment as Method 2 alongside Admin Duty Reassignment — §3, §4, §5, §6; added `duty_reassignment_requests` table; added the Analytics module to §6, previously undocumented)*
*All decisions in this file were confirmed by the project owner across planning sessions.*
*Do not modify this file without project owner approval.*
