-- Phase 1: Auth Hardening - Add session_version for DB-backed session invalidation
-- This allows admin to instantly invalidate existing sessions by incrementing session_version
-- When a user is deactivated, deleted, or their role changes, their session_version increments
-- The auth middleware validates that JWT session_version matches current DB value

ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "idx_users_session_version" ON "users"("session_version");
