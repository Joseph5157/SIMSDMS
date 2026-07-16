-- Prisma Database Optimization & Safety Review — implements the schema-level
-- recommendations: safer cascade behavior on historical/audit records, one
-- pending reassignment request per duty slot, an enum for reassignment
-- status, a true SystemConfig singleton, CHECK constraints on
-- previously-unconstrained numeric/relational fields, trigram search
-- indexes for students, and composite/partial indexes matching real query
-- filters. Hand-written (no reachable dev DB in this environment to run
-- `prisma migrate dev`) — mirrors the same manual-migration approach already
-- used by 20260707120000_remove_cover_add_duty_reassignment.
--
-- SAFETY NOTE before running against any real database: back up first. The
-- partial unique index (step 3) will fail outright if duplicate pending
-- rows already exist for the same duty_slot_id — check for that first with:
--   SELECT duty_slot_id, COUNT(*) FROM duty_reassignment_requests
--   WHERE status = 'pending' GROUP BY duty_slot_id HAVING COUNT(*) > 1;
-- The SystemConfig singleton step (step 4) aborts with an exception if more
-- than one row exists in system_config — resolve that manually first.

-- ─── 1. Safer cascade behavior on historical/audit records ─────────────────
-- Deleting a duty slot or an attendance record must never silently wipe
-- reassignment-request history or the attendance audit trail. Nothing in
-- the application currently hard-deletes either (the generic hard-delete
-- endpoint only permits 'user'/'student', both soft-deletes in practice),
-- so this has no behavioral effect today — it only guards against a future
-- code path doing so by accident.

ALTER TABLE "duty_reassignment_requests" DROP CONSTRAINT "duty_reassignment_requests_duty_slot_id_fkey";
ALTER TABLE "duty_reassignment_requests" ADD CONSTRAINT "duty_reassignment_requests_duty_slot_id_fkey"
  FOREIGN KEY ("duty_slot_id") REFERENCES "duty_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_audit_log" DROP CONSTRAINT "attendance_audit_log_duty_attendance_id_fkey";
ALTER TABLE "attendance_audit_log" ADD CONSTRAINT "attendance_audit_log_duty_attendance_id_fkey"
  FOREIGN KEY ("duty_attendance_id") REFERENCES "duty_attendance"("id") ON DELETE RESTRICT;

-- ─── 2. ReassignmentRequestStatus enum ──────────────────────────────────────
-- status was a plain TEXT column with valid values enforced only by a code
-- comment. Existing data already only ever contains pending/approved/
-- declined/cancelled (respondToRequestCore and cancelRequest are the only
-- writers), so the USING cast below is safe. Must run BEFORE the partial
-- unique index below — creating that index while status is still TEXT bakes
-- a text-typed 'pending' literal into the index predicate, and the later
-- ALTER COLUMN TYPE then fails trying to rebuild that dependent index
-- against the new enum type (confirmed by actually running this migration
-- against a throwaway local Postgres before writing it this way).

CREATE TYPE "ReassignmentRequestStatus" AS ENUM ('pending', 'approved', 'declined', 'cancelled');

ALTER TABLE "duty_reassignment_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "duty_reassignment_requests"
  ALTER COLUMN "status" TYPE "ReassignmentRequestStatus" USING ("status"::"ReassignmentRequestStatus");
ALTER TABLE "duty_reassignment_requests" ALTER COLUMN "status" SET DEFAULT 'pending';

-- ─── 3. One pending reassignment request per duty slot ─────────────────────
-- The application already check-then-creates against this rule
-- (duty-reassignment-requests.controller.js createRequest), but that's a
-- TOCTOU race under concurrent requests. A plain compound unique constraint
-- on (duty_slot_id, status) would be wrong — it would also cap approved/
-- declined/cancelled rows at one each. A partial unique index enforces the
-- rule only among pending rows.

CREATE UNIQUE INDEX "duty_reassignment_requests_one_pending_per_slot"
ON "duty_reassignment_requests" ("duty_slot_id")
WHERE "status" = 'pending';

-- ─── 4. SystemConfig true singleton ─────────────────────────────────────────
-- findFirst() + create() on cold start is a race: two concurrent first
-- requests can both see no row and both insert one. Fixing the primary key
-- to a known value ('global') and switching the service to findUnique makes
-- a second row impossible. Aborts instead of guessing if more than one row
-- already exists — that needs a manual look, not a silent pick.

DO $$
DECLARE
  row_count int;
BEGIN
  SELECT COUNT(*) INTO row_count FROM "system_config";
  IF row_count > 1 THEN
    RAISE EXCEPTION 'system_config has % rows; resolve manually before this migration (expected at most 1)', row_count;
  END IF;
END $$;

UPDATE "system_config" SET "id" = 'global' WHERE "id" <> 'global';
ALTER TABLE "system_config" ALTER COLUMN "id" TYPE VARCHAR(20);
ALTER TABLE "system_config" ALTER COLUMN "id" SET DEFAULT 'global';

-- ─── 5. CHECK constraints ───────────────────────────────────────────────────
-- All four are already enforced at the Zod validation boundary for
-- interactive API calls; these are the database-level backstop for any
-- write path that doesn't go through those schemas (bulk import, a future
-- script, direct SQL).

ALTER TABLE "duty_reassignment_requests"
  ADD CONSTRAINT "reassignment_request_different_faculty" CHECK ("from_faculty_id" <> "to_faculty_id");

ALTER TABLE "students" ADD CONSTRAINT "students_year_positive" CHECK ("year" >= 1);
ALTER TABLE "students" ADD CONSTRAINT "students_semester_positive" CHECK ("semester" >= 1);

ALTER TABLE "violations"
  ADD CONSTRAINT "violations_fine_amount_nonnegative" CHECK ("fine_amount" >= 0);

-- ─── 6. Redundant index cleanup ─────────────────────────────────────────────
-- Each of these is a strict leftmost-prefix duplicate of a composite index
-- being added below (or, for duty_attendance, of the existing @unique),
-- confirmed by reading the actual query patterns before dropping — not a
-- blanket "add more indexes" pass.

DROP INDEX "duty_attendance_duty_slot_id_idx";              -- duplicate of the @unique on duty_slot_id
DROP INDEX "messages_from_user_id_idx";                      -- prefix of messages_from_user_id_created_at_idx
DROP INDEX "duty_slots_faculty_id_duty_date_idx";            -- superseded by duty_slots_faculty_id_duty_date_status_idx
DROP INDEX "duty_reassignments_from_faculty_id_idx";         -- superseded by duty_reassignments_from_faculty_id_duty_date_idx
DROP INDEX "duty_reassignments_to_faculty_id_idx";           -- superseded by duty_reassignments_to_faculty_id_duty_date_idx
DROP INDEX "duty_reassignments_duty_slot_id_idx";            -- superseded by duty_reassignments_duty_slot_id_created_at_idx
DROP INDEX "duty_reassignment_requests_from_faculty_id_idx"; -- superseded by duty_reassignment_requests_from_faculty_id_created_at_idx
DROP INDEX "duty_reassignment_requests_to_faculty_id_idx";   -- superseded by duty_reassignment_requests_to_faculty_id_status_created_at_idx
DROP INDEX "attendance_audit_log_duty_attendance_id_idx";    -- superseded by attendance_audit_log_duty_attendance_id_created_at_idx
DROP INDEX "attendance_audit_log_changed_by_idx";            -- superseded by attendance_audit_log_changed_by_created_at_idx

-- ─── 7. New composite indexes matching real filters/sort order ─────────────

CREATE INDEX "users_role_status_deleted_at_name_idx" ON "users"("role", "status", "deleted_at", "name");
CREATE INDEX "users_approved_by_idx" ON "users"("approved_by");

CREATE INDEX "pending_invites_invited_by_idx" ON "pending_invites"("invited_by");
CREATE INDEX "pending_invites_invite_expires_at_idx" ON "pending_invites"("invite_expires_at");

CREATE INDEX "telegram_relink_tokens_user_id_used_at_expires_at_idx" ON "telegram_relink_tokens"("user_id", "used_at", "expires_at");
CREATE INDEX "telegram_relink_tokens_created_by_idx" ON "telegram_relink_tokens"("created_by");

CREATE INDEX "students_deleted_at_course_year_semester_student_name_idx" ON "students"("deleted_at", "course", "year", "semester", "student_name");
CREATE INDEX "students_deleted_at_status_student_name_idx" ON "students"("deleted_at", "status", "student_name");

CREATE INDEX "student_upload_log_uploaded_at_idx" ON "student_upload_log"("uploaded_at");
CREATE INDEX "student_upload_log_uploaded_by_uploaded_at_idx" ON "student_upload_log"("uploaded_by", "uploaded_at");

CREATE INDEX "duty_slots_faculty_id_duty_date_status_idx" ON "duty_slots"("faculty_id", "duty_date", "status");
CREATE INDEX "duty_slots_duty_date_status_idx" ON "duty_slots"("duty_date", "status");
CREATE INDEX "duty_slots_created_by_idx" ON "duty_slots"("created_by");

CREATE INDEX "duty_attendance_faculty_id_created_at_idx" ON "duty_attendance"("faculty_id", "created_at");

CREATE INDEX "attendance_audit_log_duty_attendance_id_created_at_idx" ON "attendance_audit_log"("duty_attendance_id", "created_at");
CREATE INDEX "attendance_audit_log_changed_by_created_at_idx" ON "attendance_audit_log"("changed_by", "created_at");

CREATE INDEX "violation_types_is_active_name_idx" ON "violation_types"("is_active", "name");
CREATE INDEX "violation_types_created_by_idx" ON "violation_types"("created_by");

CREATE INDEX "violations_deleted_at_faculty_id_created_at_idx" ON "violations"("deleted_at", "faculty_id", "created_at");
CREATE INDEX "violations_deleted_at_student_id_created_at_idx" ON "violations"("deleted_at", "student_id", "created_at");
CREATE INDEX "violations_deleted_flagged_resolved_idx" ON "violations"("deleted_at", "is_flagged", "flag_resolved_at", "created_at");

CREATE INDEX "violation_audit_log_violation_id_created_at_idx" ON "violation_audit_log"("violation_id", "created_at");
CREATE INDEX "violation_audit_log_changed_by_created_at_idx" ON "violation_audit_log"("changed_by", "created_at");

CREATE INDEX "admin_audit_log_actor_id_created_at_idx" ON "admin_audit_log"("actor_id", "created_at");
CREATE INDEX "admin_audit_log_target_type_target_id_created_at_idx" ON "admin_audit_log"("target_type", "target_id", "created_at");
CREATE INDEX "admin_audit_log_action_created_at_idx" ON "admin_audit_log"("action", "created_at");

CREATE INDEX "duty_reassignments_from_faculty_id_duty_date_idx" ON "duty_reassignments"("from_faculty_id", "duty_date");
CREATE INDEX "duty_reassignments_to_faculty_id_duty_date_idx" ON "duty_reassignments"("to_faculty_id", "duty_date");
CREATE INDEX "duty_reassignments_duty_slot_id_created_at_idx" ON "duty_reassignments"("duty_slot_id", "created_at");

CREATE INDEX "duty_reassignment_requests_from_faculty_id_created_at_idx" ON "duty_reassignment_requests"("from_faculty_id", "created_at");
CREATE INDEX "duty_reassignment_requests_to_faculty_id_status_created_at_idx" ON "duty_reassignment_requests"("to_faculty_id", "status", "created_at");
CREATE INDEX "duty_reassignment_requests_duty_slot_id_status_idx" ON "duty_reassignment_requests"("duty_slot_id", "status");

CREATE INDEX "calendar_config_is_window_open_closes_at_idx" ON "calendar_config"("is_window_open", "closes_at");
CREATE INDEX "calendar_config_opened_by_idx" ON "calendar_config"("opened_by");

CREATE INDEX "messages_to_user_id_deleted_by_receiver_is_read_created_at_idx" ON "messages"("to_user_id", "deleted_by_receiver", "is_read", "created_at");
CREATE INDEX "messages_from_user_id_deleted_by_sender_created_at_idx" ON "messages"("from_user_id", "deleted_by_sender", "created_at");

CREATE INDEX "photo_access_log_violation_id_accessed_at_idx" ON "photo_access_log"("violation_id", "accessed_at");
CREATE INDEX "photo_access_log_accessed_by_accessed_at_idx" ON "photo_access_log"("accessed_by", "accessed_at");

-- ─── 8. High-value partial indexes ──────────────────────────────────────────
-- Smaller and more selective than the full composites above for the two
-- single busiest queries in the app: a faculty member's pending-request
-- inbox, and the Flagged Violations review page. Left out of schema.prisma
-- (Prisma's @@index can't express a WHERE clause) — managed here only.

CREATE INDEX "reassignment_requests_pending_recipient_idx"
ON "duty_reassignment_requests" ("to_faculty_id", "created_at" DESC)
WHERE "status" = 'pending';

CREATE INDEX "violations_unresolved_flags_idx"
ON "violations" ("created_at" DESC)
WHERE "deleted_at" IS NULL
  AND "is_flagged" = TRUE
  AND "flag_resolved_at" IS NULL;

-- ─── 9. Trigram search for students ─────────────────────────────────────────
-- The student search (student_name / registration_number `contains`,
-- case-insensitive) currently does a sequential scan under ILIKE '%term%' —
-- a B-tree index can't help with a leading wildcard. pg_trgm + GIN can.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "students_name_trgm_idx"
ON "students" USING GIN ("student_name" gin_trgm_ops)
WHERE "deleted_at" IS NULL;

CREATE INDEX "students_registration_trgm_idx"
ON "students" USING GIN ("registration_number" gin_trgm_ops)
WHERE "deleted_at" IS NULL;
