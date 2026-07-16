-- Drop the in_status and out_status columns from duty_attendance.
-- Status values are now computed on-the-fly from in_time, out_time, and auto_out:
-- - in_status ('normal', 'late', 'absent') derived from in_time vs late-threshold config
-- - out_status ('normal', 'auto') derived from auto_out flag
--
-- Also drop the associated Prisma enums and create a new AttendanceAuditLog table
-- to properly track who changed what and when (replaces the generic AdminAuditLog
-- metadata blob approach for attendance overrides).

-- Drop the columns
ALTER TABLE "duty_attendance" DROP COLUMN IF EXISTS "in_status";
ALTER TABLE "duty_attendance" DROP COLUMN IF EXISTS "out_status";
ALTER TABLE "duty_attendance" DROP COLUMN IF EXISTS "override_reason";
ALTER TABLE "duty_attendance" DROP COLUMN IF EXISTS "overridden_by";

-- Drop the enums
DROP TYPE IF EXISTS "AttendanceInStatus";
DROP TYPE IF EXISTS "AttendanceOutStatus";

-- Create the new attendance audit log table
CREATE TABLE IF NOT EXISTS "attendance_audit_log" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "duty_attendance_id" TEXT NOT NULL,
  "changed_by" TEXT NOT NULL,
  "override_reason" TEXT,
  "in_time_before" TIMESTAMP(3),
  "in_time_after" TIMESTAMP(3),
  "out_time_before" TIMESTAMP(3),
  "out_time_after" TIMESTAMP(3),
  "auto_out_before" BOOLEAN,
  "auto_out_after" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_audit_log_duty_attendance_id_fkey" FOREIGN KEY ("duty_attendance_id") REFERENCES "duty_attendance" ("id") ON DELETE CASCADE,
  CONSTRAINT "attendance_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT
);

-- Create indexes for query efficiency
CREATE INDEX IF NOT EXISTS "attendance_audit_log_duty_attendance_id_idx" ON "attendance_audit_log" ("duty_attendance_id");
CREATE INDEX IF NOT EXISTS "attendance_audit_log_changed_by_idx" ON "attendance_audit_log" ("changed_by");
