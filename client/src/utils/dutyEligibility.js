// Single source of truth for "actively on duty right now" — checked in
// (`in_time` set) and not yet checked out (`out_time` still null). This is
// exactly the rule server/controllers/violations.controller.js's
// createViolation enforces for faculty (never merely a scheduled/completed
// slot existing). Shared by every UI surface that gates an action on it —
// RecordViolationModal's own submit eligibility and the faculty Dashboard's
// "Record Student Violation" quick-action visibility — so the rule can't
// drift between them into two different definitions of "on duty."
//
// Accepts anything attendance-shaped (`{ in_time, out_time }`), whether that's
// a duty slot's nested `.attendance` object or a flat per-session summary row
// — callers pass whichever shape their own data source already gives them.
export function isActivelyCheckedIn(attendance) {
  return Boolean(attendance?.in_time) && !attendance?.out_time;
}
