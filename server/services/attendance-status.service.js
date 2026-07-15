// Single source of truth for deriving a duty slot's live attendance_status.
// Every read path that needs to answer "what is this faculty member's
// attendance state right now" (getLive, getMySummary, getMonthSlots) must go
// through this function instead of re-deriving it locally — a prior
// duplication had getLive() checking only "does an attendance row exist"
// instead of "is in_time set", which mislabeled cron-created no-show rows
// (in_time null, written by markNoShowAbsent) as 'checked_in'.
//
// Returns one of: 'upcoming' | 'not_checked_in' | 'checked_in' | 'checked_out' | 'absent'.
//
// 'absent' here is a live, self-healing read of "past this session's
// configured auto clock-out with no check-in" — it does not depend on the
// markNoShowAbsent cron having already run, so the UI reflects an admin's
// updated Duty Timing Settings immediately rather than waiting up to 10
// minutes (or being stuck on a stale pre-change cron result). It intentionally
// does not apply to slots from a fully-elapsed past day (dutyDateStr <
// todayStr) — those remain 'not_checked_in', matching the existing
// attendance.test.mjs contract for history views.
function resolveAttendanceStatus({ attendance, dutyDateStr, todayStr, sessionType, nowMins, cfg }) {
  if (attendance?.out_time) return 'checked_out';
  if (attendance?.in_time)  return 'checked_in';

  if (dutyDateStr > todayStr) return 'upcoming';
  if (dutyDateStr < todayStr) return 'not_checked_in';

  const startHour = sessionType === 'morning' ? cfg.session_start_morning_hour : cfg.session_start_afternoon_hour;
  const startMin  = sessionType === 'morning' ? cfg.session_start_morning_min  : cfg.session_start_afternoon_min;
  const autoHour  = sessionType === 'morning' ? cfg.auto_checkout_morning_hour : cfg.auto_checkout_afternoon_hour;
  const autoMin   = sessionType === 'morning' ? cfg.auto_checkout_morning_min  : cfg.auto_checkout_afternoon_min;

  if (nowMins < startHour * 60 + startMin) return 'upcoming';
  if (nowMins >= autoHour * 60 + autoMin)  return 'absent';
  return 'not_checked_in';
}

module.exports = { resolveAttendanceStatus };
