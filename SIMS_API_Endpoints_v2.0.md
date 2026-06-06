# SIMS DMS — API Endpoint Reference
**SIMS College of Pharmacy — Discipline Management System**
Version 2.0 | REST API | Node.js + Express | JWT Auth

> **Changes from v1.0:**
> - Coordinator role removed — all Coordinator access merged into Admin
> - Module 9 rewritten: Reschedule Requests → Need Cover broadcast
> - Module 10 (Correction Requests) removed — replaced by `violations.is_flagged` flag endpoints in Module 7
> - Photo endpoint kept in Module 7 as foundation for v2 — not implemented in Phase 1
> - Self-registration removed — Admin creates accounts directly (`POST /users`). `POST /users/register`, `GET /users/pending`, `PATCH /users/:id/approve` removed.
> - Actual endpoint count: **63 endpoints across 10 modules**

---

## Legend & Global Rules

- All endpoints require JWT in httpOnly cookie unless marked **Public**
- `:id` = UUID
- All responses return JSON
- All errors: `{ "error": true, "code": "ERROR_CODE", "message": "..." }`

**Roles**: Super Admin · Admin · Faculty · All Auth

---

## Module 1 — Authentication (3 endpoints)

> No JWT required. OTP sent via Telegram. Token stored in httpOnly cookie on success.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /auth/request-otp | Public | Send OTP to user's registered Telegram ID |
| POST | /auth/verify-otp | Public | Verify OTP → issue JWT cookie on success |
| POST | /auth/logout | All Auth | Clear JWT cookie and invalidate session |

---

## Module 2 — Users & Accounts (9 endpoints)

> Accounts are created by Admin only — no self-registration.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /users | Admin | Create a new user account (status = active immediately) |
| PATCH | /users/:id/deactivate | Admin | Deactivate an active user account |
| GET | /users | Admin | List all users with filters (role, status, dept) |
| GET | /users/:id | All Auth | Get a single user profile |
| PATCH | /users/:id/profile | All Auth | Update own profile (name, phone, dept) |
| GET | /admin/audit-logs | Super Admin | View all system audit logs |
| POST | /admin/users/:id/reset-login | Super Admin | Force-reset any user's login session |
| DELETE | /admin/hard-delete/:resource/:id | Super Admin | Permanently delete any record by resource type and ID |
| GET | /admin/settings | Super Admin | View system-wide configuration |
| PATCH | /admin/settings | Super Admin | Update system-wide configuration |

---

## Module 3 — Students (6 endpoints)

> Excel upload uses upsert logic — `registration_number` is the unique key. Existing records updated, new ones created, missing ones deactivated.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /students/upload | Admin | Upload student Excel file (upsert by reg. number) |
| GET | /students/upload-logs | Admin | View history of all Excel uploads including error rows |
| GET | /students | Admin | List all students with filters (course, year, status) |
| GET | /students/search | All Auth | Search students by name or reg. number (violation form autocomplete) |
| PATCH | /students/:id/promote | Admin | Promote student to next semester or year |
| PATCH | /students/:id/deactivate | Admin | Deactivate a student record |

---

## Module 4 — Duty Calendar (7 endpoints)

> Admin manually controls the scheduling window. Faculty notified via Telegram when window opens. Window auto-closes on last day of month or Admin closes early.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /calendar/:year/:month | All Auth | Get calendar config (blocked dates, window status, sessions per faculty) |
| POST | /calendar/:year/:month/open | Admin | Open the scheduling window — triggers Telegram notification to all faculty |
| POST | /calendar/:year/:month/close | Admin | Manually close the scheduling window early |
| PATCH | /calendar/:year/:month/blocked-dates | Admin | Update blocked holiday dates for the month |
| PATCH | /calendar/:year/:month/sessions-per-faculty | Admin | Set how many sessions each faculty must pick this month |
| GET | /calendar/:year/:month/unassigned-faculty | Admin | List faculty who have not picked their slots after window closes |
| POST | /calendar/:year/:month/assign/:facultyId | Admin | Admin manually assigns slots to a faculty who missed the window |

---

## Module 5 — Duty Slots (6 endpoints)

> Faculty can only pick slots while the calendar window is open. Admin can assign at any time.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /duty-slots/:year/:month | All Auth | Get all duty slots for a month (Admin sees all; Faculty sees own) |
| GET | /duty-slots/available/:year/:month | Faculty | Get available (unpicked) slots for the open window |
| POST | /duty-slots/pick | Faculty | Faculty picks a duty slot during open window |
| DELETE | /duty-slots/:id/unpick | Faculty | Faculty unpicks a slot (only while window is still open) |
| POST | /duty-slots/admin-assign | Admin | Admin assigns a specific slot to a specific faculty |
| GET | /duty-slots/:id | All Auth | Get details of a single duty slot |

---

## Module 6 — Duty Attendance (5 endpoints)

> Faculty check IN and OUT via the app. System auto-clocks out at 4:30 PM. Late IN flagged automatically. Admin can override records.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /attendance/:dutySlotId/check-in | Faculty | Faculty clocks in for their duty slot |
| POST | /attendance/:dutySlotId/check-out | Faculty | Faculty clocks out of their duty slot |
| GET | /attendance/live | Admin | Real-time IN/OUT status of all faculty on duty today (polling) |
| GET | /attendance/:dutySlotId | All Auth | Get attendance record for a specific duty slot |
| PATCH | /attendance/:dutySlotId/override | Admin | Override an attendance record with reason |

---

## Module 7 — Violations (10 endpoints)

> Faculty record violations during their duty slot. Faculty can flag their own records for Admin review. Photo endpoint is a foundation placeholder — not implemented in Phase 1.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /violations | Faculty | Record a new student violation |
| GET | /violations | Admin | List all violations with filters (student, faculty, date, type, status) |
| GET | /violations/my | Faculty | Faculty views their own recorded violations |
| GET | /violations/:id | All Auth | Get a single violation record |
| PATCH | /violations/:id | Faculty | Edit own violation record (only before flag is submitted) |
| PATCH | /violations/:id/hide | Admin | Hide a violation record from standard views |
| PATCH | /violations/:id/flag | Faculty | Flag own violation record for Admin review (sets is_flagged = true) |
| PATCH | /violations/:id/resolve-flag | Admin | Resolve a flagged violation with a note (logged in audit log) |
| GET | /violations/:id/photo | Admin | ⚠ Foundation only — not implemented in Phase 1 |
| GET | /violations/:id/audit-log | Admin | View full change history for a violation |

---

## Module 8 — Violation Types (5 endpoints)

> System-locked types (e.g. 'Others') cannot be deleted — `is_system = true` protects them.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /violation-types | All Auth | List all active violation types |
| POST | /violation-types | Admin | Create a new violation type with default fine |
| PATCH | /violation-types/:id | Admin | Update a violation type name or default fine |
| PATCH | /violation-types/:id/deactivate | Admin | Deactivate a violation type (hides from selection, not deleted) |
| DELETE | /violation-types/:id | Admin | Delete a violation type (fails if is_system = true) |

---

## Module 9 — Need Cover (7 endpoints)

> Replaces Reschedule Requests. Faculty post an open broadcast — any faculty can volunteer. Admin confirms the cover assignment. Broadcasts auto-expire after 48 hours.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /cover-requests | Faculty | Post a Need Cover broadcast for a duty slot |
| GET | /cover-requests | Admin | List all cover requests with filters (status, faculty, month) |
| GET | /cover-requests/open | Faculty | View open broadcasts available to volunteer for |
| GET | /cover-requests/my | Faculty | View own posted and volunteered requests |
| POST | /cover-requests/:id/volunteer | Faculty | Volunteer to cover a broadcast slot |
| PATCH | /cover-requests/:id/confirm | Admin | Confirm a volunteer — finalises the cover assignment |
| PATCH | /cover-requests/config | Admin | Set max cover requests allowed per duty slot |

---

## Module 10 — Messages (5 endpoints)

> Two-way internal messaging between any two users. Soft delete — deleting from one side does not delete from the other.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /messages | All Auth | Send a message to another user |
| GET | /messages/inbox | All Auth | Get received messages (unread first) |
| GET | /messages/sent | All Auth | Get sent messages |
| GET | /messages/:id | All Auth | View a single message (marks as read automatically) |
| DELETE | /messages/:id | All Auth | Soft-delete a message from own view |

---

## Summary — 66 Endpoints Across 10 Modules

| # | Module | Count | Base Path |
|---|--------|-------|-----------|
| 1 | Authentication | 3 | `/auth` |
| 2 | Users & Accounts | 9 | `/users`, `/admin` |
| 3 | Students | 6 | `/students` |
| 4 | Duty Calendar | 7 | `/calendar` |
| 5 | Duty Slots | 6 | `/duty-slots` |
| 6 | Duty Attendance | 5 | `/attendance` |
| 7 | Violations | 10 | `/violations` |
| 8 | Violation Types | 5 | `/violation-types` |
| 9 | Need Cover | 7 | `/cover-requests` |
| 10 | Messages | 5 | `/messages` |
| | **TOTAL** | **63** | |

---

*API Reference version: 2.0 — Updated: June 2026*
*Supersedes SIMS_API_Endpoints_v1.0.docx*
