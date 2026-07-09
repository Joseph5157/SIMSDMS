# Handoff Report

## task_id
011-violation-module-overhaul / three sequential tickets in one session: (1) "Student Violation Recording Popup – UI/UX, Session Validation, and Confirmation Issues", (2) violations-dashboard display polish, (3) "S.No column", "Fixed Violation Count", "Replace Hide/Log With Delete", "Flagged Student Violations Review Workflow"

## status
complete

## completed

### Part A — Violation recording popup UX (commit `effd7eb`)
Investigated a 7-item UI/UX ticket via code-graph before touching anything. Of the 7 items, **4 were already implemented** (success toast, responsive mobile bottom-sheet, keyboard-aware student search, fixed header/scroll/footer) — verified by reading the actual source, not assumed. Two were real bugs, fixed:
- **`client/src/components/ui/FormModal.jsx`**: Mantine's `Modal.Root` used the library default z-index (~200), which sat above the toast layer (`zIndex: 120` in `Toast.jsx`) — so any error/success toast rendered *underneath* the popup on desktop (mobile was fine, `BottomDrawer` is `z-[110]/[111]`, already below toasts). Fixed by pinning `zIndex={115}` — below toasts, above the mobile bottom-sheet/nav. This is a shared component, so the fix applies to every modal in the app, not just this one.
- **`client/src/components/faculty/RecordViolationModal.jsx`**: added a proactive session-status banner (green "✓ Recording for Morning/Afternoon session" or amber "⚠️ ... only during an active duty session") at the top of the form, computed from data already being fetched for slot pre-fill — no new API calls. Previously the only session-status feedback was a post-submit error toast (which was invisible anyway, per the bug above).
- The 7th item — "Admin side violation recording" — was **not built**: audited against `CONSTITUTION.md` §3 and confirmed Admin's only violation permission is "reviews and resolves flagged violation records," not create. The server's `createViolation` also hard-requires `slot.faculty_id === req.user.id`. Building this would be a new permission, not a bug fix — flagged back rather than silently added.

### Part B — Violations display polish (commit `c3eadda`)
Investigated the ticket "faculty sees other faculty's violations" and **could not reproduce it in code**: `GET /violations/my` (`myViolations` in `violations.controller.js`) always scopes `where.faculty_id = req.user.id` server-side regardless of any client-supplied query param, and both faculty-facing surfaces (`ViolationRecorderPage.jsx`, `MyViolationsSummary.jsx`) call it exclusively via `useMyViolations`. Rather than "fix" a data leak that doesn't exist, implemented the actual gaps against the ticket's requested display: a standalone Course column on the faculty Student Violations table, and a count next to the most-common violation type on the dashboard summary card (`"Uniform violation - 10"` instead of just the name).

### Part C — S.No, configurable flagged count, Delete, flagged-review popup (commit `191bd66`)
Four sub-items from one ticket batch, all in the Student Violations module:

1. **S.No column** — added as the first column to `ViolationRecorderPage.jsx` (faculty table, numbered `(page-1)*20 + i + 1` so it's continuous across pagination but resets to 1 whenever filters reset the page) and to every Student Violation Report export (Excel + PDF, all 5 periods) by adding an `sno` column to `STUDENT_VIOLATION_EXPORT_COLUMNS`/`STUDENT_VIOLATION_PDF_COLUMNS` and an `i` param to `mapViolationExportRow`/`mapViolationPdfRow` — `Array.prototype.map` already passes the index as the 2nd callback arg, so **zero call sites needed changing**, only the two shared mapper functions.
2. **Configurable flagged-violation count** — `AdminDashboardPage.jsx`'s "Flagged student violations — needs review" card had a hardcoded `.slice(0, 5)`. Replaced with a `flaggedShowCount` state + a 3/5/10/20 `<select>`, plus "Total: N · Showing: N latest" text. The underlying report endpoint (`flaggedViolationsReport`) already returns every flagged/resolved violation with no server-side cap, so no backend change was needed for this part.
3. **Hide/Log → Delete — the one real constitution conflict this session**: the ticket asked Admin *and* Faculty to permanently delete violation records. `CONSTITUTION.md` reserves physical deletion for Super Admin only ("all deletes are soft deletes... except Super Admin hard delete") and explicitly documented Hide as the mechanism ("hidden records are not physically deleted"). **Resolution**: implemented Delete as a soft delete (`Violation.deleted_at`), excluded from *every* read path, so it's indistinguishable from a permanent delete anywhere in the app, while keeping the row and Super-Admin-only hard-delete intact. Updated `CONSTITUTION.md` (§4 Violations, §5 Key Schema Rules) to document this as the new decision rather than silently deviating.
   - New `DELETE /violations/:id`: soft-deletes, Admin can target any violation, Faculty only their own (`violation.faculty_id !== req.user.id` → 403). Logs to `admin_audit_log` via the existing `logAction()` service — **not** `violation_audit_log`, per the ticket's explicit "logs only in the dedicated Audit Logs section" requirement.
   - `deleted_at: null` added to every read path that touches the `violation` table: `listViolations`, `myViolations`, `getViolation`/`editViolation`/`flagViolation`/`resolveFlag` (treat a soft-deleted row as 404), the two shared filter builders `studentViolationWhere` (reports) and `analyticsWhere` (analytics) which cover the vast majority of report/analytics queries in one line each, plus 5 individual outlier queries that didn't go through those builders (`trend`, `facultyViolationActivity`, `violationTypeBreakdown`, `pendingFinesSummary`, `flaggedViolationsReport`), plus two delete-guard counters that aren't display counts but should still ignore soft-deleted rows (`students.controller.js`'s "cannot delete student with violations" check, `violation-types.controller.js`'s "cannot delete type in use" check).
   - Removed Hide and the per-violation "Log" button (which opened an `AuditModal` showing `violation_audit_log`) from `ViolationsPage.jsx` (admin) entirely, replaced both with a single red "Delete" button + `ConfirmDialog` (student/violation/date detail, "Delete Permanently" confirm). Added Delete (no Hide/Log existed there before) to `ViolationRecorderPage.jsx` (faculty) alongside the existing Flag action.
   - Removed the now-dead backend: `hideViolation`/`getAuditLog` controller functions, their routes (`PATCH /:id/hide`, `GET /:id/audit-log`), and the client hooks `useHideViolation`/`useViolationAuditLog` — confirmed zero remaining call sites (client-wide grep) and no test coverage before deleting. `violation_audit_log` **writes** for created/edited/flagged/flag_resolved are kept (still an immutable accountability trail per the constitution), just its UI is gone.
4. **Flagged-review popup enrichment** — `AdminDashboardPage.jsx`'s flagged-violation detail modal gained registration number, course, and duty date per card (required expanding `flaggedViolationsReport`'s Prisma `include` to select `student.course` and `dutySlot.duty_date`, which it didn't before), a "N Pending Reviews" header count, and a Delete action next to the existing "Mark as Reviewed" (renamed from "Review →"). **Deliberately skipped** the ticket's separate "View Details" button — folded all its fields directly into the card instead, since a second modal would be redundant with everything already visible; flagged this simplification rather than silently dropping the requirement.
   - **Drive-by fix**: `useFlagViolation` wasn't invalidating the `['report', 'flagged-violations']` query, so a newly flagged violation wouldn't appear on the Admin Dashboard until a manual reload — directly relevant to the ticket's "dashboard automatically reflects the new count" requirement, fixed while in the area.

## failed_or_blocked
- None — all four sub-parts of the ticket batch were implemented and deployed.

## commands_run
```
# Part A/B/C verification (repeated per commit):
cd client && npx vite build                              # clean every time
cd client && npx eslint <changed files>                   # clean, or only pre-existing errors (confirmed via git stash)
node --check <changed server files>                        # every server file touched

# Part C schema:
mkdir prisma/migrations/20260709150000_add_violation_deleted_at
npm run generate                                            # Prisma client regen (schema-only)

# Deploy verification (every commit this session):
git push origin 005-duty-reassignment
railway status --json | node -e "poll until SUCCESS matching commit hash"
railway logs --deployment                                   # confirm "Applying migration ..." -> "No pending migrations to apply"
```

## constraints_discovered
- **`npm run generate` EPERM lock** — same issue as documented in `specs/010-dashboard-greeting-titles/handoff.md`; recurred once more this session (a leftover `npm run dev` chain from an earlier browser-verification attempt). Same fix: find the full process chain via `Get-CimInstance Win32_Process` matching `CommandLine`, not just whatever's bound to the listening port.
- **`Array.prototype.map(fn)` already passes `(element, index)` to `fn`** — used this to add S.No to the report exports with zero call-site changes, just extending the two shared row-mapper function signatures. Worth remembering as a pattern for any future "add an index-derived column" ask.
- **The reported "faculty sees other faculty's violations" bug did not reproduce.** Confirms the value of reading the actual authorization code (`myViolations`'s hardcoded `where.faculty_id = req.user.id`, immune to client input) before assuming a ticket's premise is accurate — the real gap was cosmetic (missing columns), not a security hole.
- Local Postgres remained unreachable for this entire session (see spec 010's handoff for detail) — all 3 of this session's remaining migrations (`add_violation_deleted_at` plus the two from spec 010) were hand-written and verified only via production deploy logs, never run locally.

## deviations_from_constitution
- **§4 Violations, §"Data & Safety"**: the ticket asked for Admin+Faculty permanent delete, which conflicts with "all deletes are soft deletes... except Super Admin hard delete." Resolved by implementing Delete as a soft delete (`deleted_at`) that's excluded from every read path — behaviorally indistinguishable from a permanent delete to any user of the app, while keeping the constitution's hard-delete-is-Super-Admin-only rule intact. `CONSTITUTION.md` updated to v3.10 to document this as the new recorded decision, not left as an undocumented deviation.
- No other deviations.

## files_touched
**Part A:**
- `client/src/components/ui/FormModal.jsx`, `client/src/components/faculty/RecordViolationModal.jsx`

**Part B:**
- `client/src/components/faculty/MyViolationsSummary.jsx`, `client/src/pages/faculty/ViolationRecorderPage.jsx`

**Part C:**
- `prisma/schema.prisma`, `prisma/migrations/20260709150000_add_violation_deleted_at/migration.sql` (new)
- `server/controllers/violations.controller.js` (new `deleteViolation`, removed `hideViolation`/`getAuditLog`, `deleted_at` guards throughout)
- `server/routes/violations.routes.js` (new `DELETE /:id`, removed `/hide` + `/audit-log`)
- `server/schemas/violations.schema.js` (new `deleteViolationSchema`)
- `server/controllers/reports.controller.js` (S.No columns, `deleted_at` in `studentViolationWhere` + 3 outlier queries, `flaggedViolationsReport` include expanded)
- `server/controllers/analytics.controller.js` (`deleted_at` in `analyticsWhere` + `trend`)
- `server/controllers/students.controller.js`, `server/controllers/violation-types.controller.js` (`deleted_at` in delete-guard counters)
- `client/src/hooks/useViolations.js` (new `useDeleteViolation`, removed `useHideViolation`/`useViolationAuditLog`, `useFlagViolation` invalidation fix)
- `client/src/pages/admin/ViolationsPage.jsx` (Hide/Log → Delete, `AuditModal` removed)
- `client/src/pages/faculty/ViolationRecorderPage.jsx` (Delete action added; also touched in Part B)
- `client/src/pages/admin/AdminDashboardPage.jsx` (configurable flagged count, enriched review popup, Delete action)
- `CONSTITUTION.md` (v3.10 — Hide removal, Delete semantics, endpoint count 109→108)

## open_questions_for_owner
- **Admin-side violation recording** (Part A, item 7) was flagged, not built — confirm whether this should become a real feature (new permission + likely a different endpoint or an admin-acts-as-faculty flow) before anyone plans it as "already possible."
- **"View Details" button** (Part C, item 4) was deliberately not built as a separate control since its content is already inline in the popup card — say so if a dedicated details view is still wanted for some other reason (e.g. a printable/shareable single-record view).
- The two large stale reference docs (`SIMS_API_Endpoints_v2.0.md`, `SIMS_Database_Schema_v2.1.md`) are further out of date after this session (endpoint count 109→108, new `deleted_at`/`title` columns) — left un-regenerated, consistent with prior sessions' explicit choice to skip this; still pending if ever wanted.
- No in-browser visual verification this session (see spec 010's handoff for why) — build/lint/deploy-log verified only. Worth a manual click-through of the popup fixes, the Delete confirmation flow (both roles), and the flagged-review popup next time you're in the app.
