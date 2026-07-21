-- Adds the admin-configurable repeat-violation counselling threshold to the
-- system_config singleton, replacing the hardcoded `> 3` default used by the
-- analytics dashboard's counselling card and summary card. Default of 4
-- preserves current production behavior at cutover: the old strictly-greater
-- rule (`> 3`, i.e. 4+ violations) becomes the new inclusive rule (`>= 4`).
-- Hand-written (no reachable dev DB in this environment to run
-- `prisma migrate dev`) — mirrors the manual-migration approach already used
-- by 20260716130000_db_optimization_safety_review.

ALTER TABLE "system_config" ADD COLUMN "repeat_violation_threshold" SMALLINT NOT NULL DEFAULT 4;
