const cron = require('node-cron');
const prisma = require('./prisma');
const logger = require('./logger');
const settingsService = require('../services/settings.service');
const { nowInIST, istDayRangeUTC, istWallToUTC } = require('./time');

// All schedules fire at IST times via { timezone: 'Asia/Kolkata' }.
// Date calculations inside each job use IST-aware helpers so they are correct
// even when the server's TZ env var is UTC (the default on Railway).

// ─── 1. Auto clock-out — daily at 4:30 PM IST ─────────────────────────────────

async function autoClockOut() {
  const ist        = nowInIST();
  const todayRange = istDayRangeUTC(ist.year, ist.month, ist.day);

  const openAttendance = await prisma.dutyAttendance.findMany({
    where: {
      dutySlot: { duty_date: todayRange },
      in_time:  { not: null },
      out_time: null,
    },
    select: { id: true, duty_slot_id: true },
  });

  if (openAttendance.length === 0) return;

  const cfg        = await settingsService.getSettings();
  // Produce a UTC timestamp that represents the configured IST clock-out time.
  const autoOutUTC = istWallToUTC(
    ist.year, ist.month, ist.day,
    cfg.auto_checkout_hour, cfg.auto_checkout_min,
  );

  await prisma.dutyAttendance.updateMany({
    where: { id: { in: openAttendance.map((a) => a.id) } },
    data:  { out_time: autoOutUTC, out_status: 'auto', auto_out: true },
  });

  await prisma.dutySlot.updateMany({
    where: { id: { in: openAttendance.map((a) => a.duty_slot_id) } },
    data:  { status: 'completed' },
  });

  logger.info(`[cron] Auto clock-out: ${openAttendance.length} record(s) closed.`);
}

// ─── 2. Cover request expiry — every hour ─────────────────────────────────────

async function expireCoverRequests() {
  const result = await prisma.coverRequest.updateMany({
    where: { status: 'open', expires_at: { lt: new Date() } },
    data:  { status: 'expired' },
  });

  if (result.count > 0) {
    logger.info(`[cron] Cover request expiry: ${result.count} request(s) expired.`);
  }
}

// ─── 3. Calendar auto-close — 23:55 IST on the last day of the month ─────────
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

async function safeExpireCoverRequests() {
  try {
    await expireCoverRequests();
  } catch (err) {
    logger.error('[cron] expireCoverRequests failed:', err.message);
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
  cron.schedule('30 16 * * *', safeAutoClockOut,        { timezone: 'Asia/Kolkata' });
  cron.schedule('0  *  * * *', safeExpireCoverRequests,  { timezone: 'Asia/Kolkata' });
  cron.schedule('55 23 * * *', safeAutoCloseCalendar,    { timezone: 'Asia/Kolkata' });

  logger.info('[cron] All scheduled jobs registered.');
}

module.exports = { startCronJobs, autoClockOut };
