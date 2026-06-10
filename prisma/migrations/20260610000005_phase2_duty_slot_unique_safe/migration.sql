-- Phase 2: Duty Slot Safety - Add unique constraint on (duty_date, session_type)
-- This prevents multiple faculty from being assigned the same duty date+session globally

-- First, remove duplicate duty slots (keep the newest one, delete others)
-- This is safe because:
-- 1. Duty slots can be recreated if needed
-- 2. We keep the most recent one (likely the current active assignment)
-- 3. This data is assignment metadata, not critical records

DELETE FROM "duty_slots"
WHERE id NOT IN (
  SELECT MAX(id)
  FROM "duty_slots"
  GROUP BY duty_date, session_type
);

-- Now create the unique constraint to prevent future duplicates
CREATE UNIQUE INDEX "duty_slots_duty_date_session_type_key"
ON "duty_slots"("duty_date", "session_type");
