const cron = require('node-cron');
const prisma = require('./prisma');
const logger = require('./logger');
const settingsService = require('../services/settings.service');
const { nowInIST, istDayRangeUTC, istWallToUTC } = require('./time');

// All schedules fire at IST times via { timezone: 'Asia/Kolkata' }.
// Date calculations inside each job use IST-aware helpers so they are correct
// even when the server's TZ env var is UTC (the default on Railway).

// ─── 1. Auto clock-out — every 10 minutes, per-session configured cutoff ──────
// Each session (Morning/Afternoon) has its own configurable auto-checkout
// time (e.g. Morning 12:00 PM, Afternoon 5:00 PM), so a single once-daily
// trigger can't serve both — this job ticks frequently and only clocks out
// a (date, session) group once THAT session's own cutoff has passed.

async function autoClockOut() {
  const ist = nowInIST();
  const nowMins = ist.hour * 60 + ist.minute;
  // Upper bound only — catches today AND any prior-day record that never got
  // closed (e.g. this job didn't run because the DB was down at cutoff time).
  // Without this, a single missed run leaves those records open forever,
  // since tomorrow's run only ever looks at tomorrow's date.
  const throughToday = istDayRangeUTC(ist.year, ist.month, ist.day).lte;

  const openAttendance = await prisma.dutyAttendance.findMany({
    where: {
      dutySlot: { duty_date: { lte: throughToday } },
      in_time:  { not: null },
      out_time: null,
    },
    select: { id: true, duty_slot_id: true, dutySlot: { select: { duty_date: true, session_type: true } } },
  });

  if (openAttendance.length === 0) return;

  const cfg = await settingsService.getSettings();

  // Group by (duty date, session type) so a Morning cutoff never touches an
  // Afternoon record and vice versa, and each group's attendance+slot updates
  // can be committed atomically together (a mid-run DB drop can't leave one
  // written without the other).
  const byGroup = new Map();
  for (const a of openAttendance) {
    const d = a.dutySlot.duty_date;
    const sessionType = a.dutySlot.session_type;
    const key = `${d.toISOString().slice(0, 10)}:${sessionType}`;
    if (!byGroup.has(key)) byGroup.set(key, { date: d, sessionType, attendanceIds: [], slotIds: [] });
    const group = byGroup.get(key);
    group.attendanceIds.push(a.id);
    group.slotIds.push(a.duty_slot_id);
  }

  let closedCount = 0;

  for (const { date, sessionType, attendanceIds, slotIds } of byGroup.values()) {
    const isToday = date.getUTCFullYear() === ist.year
      && date.getUTCMonth() + 1 === ist.month
      && date.getUTCDate() === ist.day;

    const cutoffHour = sessionType === 'morning' ? cfg.auto_checkout_morning_hour : cfg.auto_checkout_afternoon_hour;
    const cutoffMin  = sessionType === 'morning' ? cfg.auto_checkout_morning_min  : cfg.auto_checkout_afternoon_min;

    // A prior-day straggler's cutoff has always passed by definition; only
    // today's groups need to wait for their own session's cutoff time.
    if (isToday && nowMins < cutoffHour * 60 + cutoffMin) continue;

    const autoOutUTC = istWallToUTC(
      date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
      cutoffHour, cutoffMin,
    );

    await prisma.$transaction([
      prisma.dutyAttendance.updateMany({
        where: { id: { in: attendanceIds } },
        data:  { out_time: autoOutUTC, out_status: 'auto', auto_out: true },
      }),
      prisma.dutySlot.updateMany({
        where: { id: { in: slotIds } },
        data:  { status: 'completed' },
      }),
    ]);

    closedCount += attendanceIds.length;
  }

  if (closedCount > 0) {
    logger.info(`[cron] Auto clock-out: ${closedCount} record(s) closed.`);
  }
}

// ─── 2. Calendar auto-close — 23:55 IST on the last day of the month ─────────
// Fires at 23:55 IST so faculty have the full last day to pick slots.

async function autoCloseCalendar() {
  const ist = nowInIST();

  // Last day of the current IST month (day 0 of next month = last day of this month)
  const lastDay = new Date(Date.UTC(ist.year, ist.month, 0)).getUTCDate();

  if (ist.day !== lastDay) return;

  const result = await prisma.calendarConfig.updateMany({
    where: { config_month: ist.month, config_year: ist.year, is_window_open: true },
    data:  { is_window_open: false },
  });

  if (result.count > 0) {
    logger.info(`[cron] Calendar auto-close: window closed for ${ist.year}-${String(ist.month).padStart(2, '0')}.`);
  }
}

// ─── Wrap jobs with error handling ────────────────────────────────────────────

async function safeAutoClockOut() {
  try {
    await autoClockOut();
  } catch (err) {
    logger.error('[cron] autoClockOut failed:', err.message);
  }
}

async function safeAutoCloseCalendar() {
  try {
    await autoCloseCalendar();
  } catch (err) {
    logger.error('[cron] autoCloseCalendar failed:', err.message);
  }
}

// ─── Register all jobs ────────────────────────────────────────────────────────

function startCronJobs() {
  cron.schedule('*/10 * * * *', safeAutoClockOut,        { timezone: 'Asia/Kolkata' });
  cron.schedule('55 23 * * *',  safeAutoCloseCalendar,    { timezone: 'Asia/Kolkata' });

  logger.info('[cron] All scheduled jobs registered.');
}

module.exports = { startCronJobs, autoClockOut };
