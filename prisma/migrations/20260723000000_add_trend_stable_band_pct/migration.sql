-- Adds the admin-configurable Violation Trend "stable band" percentage to the
-- system_config singleton. The Trend Analysis component (dashboard Violation
-- Trend section) classifies the current period vs. the previous equivalent
-- period as Improving/Stable/Worsening; a change within ±band% of the
-- previous total counts as Stable. Default of 10 is a reasonable starting
-- point, refinable later without a code change (mirrors
-- repeat_violation_threshold's admin-configurable pattern).
-- Hand-written (no reachable dev DB in this environment to run
-- `prisma migrate dev`) — mirrors the manual-migration approach already used
-- by 20260721000000_add_repeat_violation_threshold.

ALTER TABLE "system_config" ADD COLUMN "trend_stable_band_pct" SMALLINT NOT NULL DEFAULT 10;
