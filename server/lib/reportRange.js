// Report/analytics date-range boundaries, computed explicitly in IST and
// independent of the process TZ env var. (ADMIN-HIGH-003)
//
// Two column families need DIFFERENT boundaries and must never share one range:
//
//   • @db.Date columns (duty_slots.duty_date, duty_reassignments.duty_date) are
//     returned by Prisma as UTC-midnight Dates → filter with UTC *calendar*
//     boundaries (Date.UTC).
//   • timestamptz instants (violations.created_at, attendance timestamps, …) are
//     real moments in time → filter with IST *wall-clock* boundaries converted to
//     UTC instants.
//
// The old lib/time.monthRangeUTC conflated the two: despite its name it built
// server-LOCAL boundaries (`new Date(year, month-1, 1)`), so a violation recorded
// just after IST midnight could be misclassified, and correctness silently
// depended on TZ=Asia/Kolkata being set. These helpers remove that dependency.
//
// Upper bounds for instant ranges are "start of the next period minus 1 ms";
// Date.UTC day/month overflow (e.g. month 13, day 32) normalises rollover, so
// month-end and year-end need no special-casing.

const { istWallToUTC } = require('./time');

// ── @db.Date (calendar) boundaries — UTC midnight, matching Prisma @db.Date ──

function dateDayRange(year, month, day) {
  return {
    gte: new Date(Date.UTC(year, month - 1, day)),
    lte: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
  };
}

function dateMonthRange(year, month) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)), // day 0 of next month = last day
  };
}

function dateYearRange(year) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

// from / to are { year, month, day } (inclusive on both ends).
function dateSpanRange(from, to) {
  return {
    gte: new Date(Date.UTC(from.year, from.month - 1, from.day)),
    lte: new Date(Date.UTC(to.year, to.month - 1, to.day, 23, 59, 59, 999)),
  };
}

// ── timestamptz (instant) boundaries — IST wall clock as UTC instants ──

function instantDayRange(year, month, day) {
  return {
    gte: istWallToUTC(year, month, day, 0, 0),
    lte: new Date(istWallToUTC(year, month, day + 1, 0, 0).getTime() - 1),
  };
}

function instantMonthRange(year, month) {
  return {
    gte: istWallToUTC(year, month, 1, 0, 0),
    lte: new Date(istWallToUTC(year, month + 1, 1, 0, 0).getTime() - 1),
  };
}

function instantYearRange(year) {
  return {
    gte: istWallToUTC(year, 1, 1, 0, 0),
    lte: new Date(istWallToUTC(year + 1, 1, 1, 0, 0).getTime() - 1),
  };
}

// from / to are { year, month, day } (inclusive on both ends).
function instantSpanRange(from, to) {
  return {
    gte: istWallToUTC(from.year, from.month, from.day, 0, 0),
    lte: new Date(istWallToUTC(to.year, to.month, to.day + 1, 0, 0).getTime() - 1),
  };
}

// Parses "YYYY-MM-DD" into { year, month, day }. Assumes a validated string.
function parseYMD(s) {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
}

module.exports = {
  dateDayRange, dateMonthRange, dateYearRange, dateSpanRange,
  instantDayRange, instantMonthRange, instantYearRange, instantSpanRange,
  parseYMD,
};
