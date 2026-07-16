const { nowInIST } = require('../lib/time');

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

// Derives in_status ('normal' | 'late' | 'absent' | null) from the attendance record.
// Returns 'absent' if the slot is marked absent by live logic (past cutoff, no check-in).
// Returns 'late' or 'normal' if in_time is set (compares check-in time vs late threshold).
// Returns null for upcoming/unstarted slots with no in_time yet.
function resolveInStatus({ attendance, dutyDateStr, todayStr, sessionType, nowMins, cfg }) {
  if (attendance?.in_time) {
    const thresholdHour = sessionType === 'morning'
      ? cfg.late_threshold_morning_hour
      : cfg.late_threshold_afternoon_hour;
    const thresholdMin = sessionType === 'morning'
      ? cfg.late_threshold_morning_min
      : cfg.late_threshold_afternoon_min;
    const ist = nowInIST(attendance.in_time);
    return ist.hour * 60 + ist.minute > thresholdHour * 60 + thresholdMin ? 'late' : 'normal';
  }

  const absenceStatus = resolveAttendanceStatus({ attendance, dutyDateStr, todayStr, sessionType, nowMins, cfg });
  if (absenceStatus === 'absent') return 'absent';
  return null;
}

// Derives out_status ('normal' | 'auto' | null) from the attendance record.
// Returns 'auto' if auto_out flag is true, 'normal' if out_time exists but auto_out is false,
// and null if out_time is not set yet.
function resolveOutStatus({ attendance }) {
  if (!attendance?.out_time) return null;
  return attendance.auto_out ? 'auto' : 'normal';
}

// Helper: computes whether in_time represents a late arrival for a given session.
// Used by reports that need to filter/count late arrivals without reading a non-existent column.
function isLateInTime({ in_time, sessionType, cfg }) {
  if (!in_time) return false;
  const thresholdHour = sessionType === 'morning'
    ? cfg.late_threshold_morning_hour
    : cfg.late_threshold_afternoon_hour;
  const thresholdMin = sessionType === 'morning'
    ? cfg.late_threshold_morning_min
    : cfg.late_threshold_afternoon_min;
  const ist = nowInIST(in_time);
  return ist.hour * 60 + ist.minute > thresholdHour * 60 + thresholdMin;
}

module.exports = { resolveAttendanceStatus, resolveInStatus, resolveOutStatus, isLateInTime };
