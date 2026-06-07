const cron = require('node-cron');
const prisma = require('./prisma');
const logger = require('./logger');
const settingsService = require('../services/settings.service');

// All schedules use IST (Asia/Kolkata). Set TZ=Asia/Kolkata in Railway env vars.

// ─── 1. Auto clock-out — daily at 4:30 PM IST ─────────────────────────────────

async function autoClockOut() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Find all duty slots today that have a check-in but no check-out
  const openAttendance = await prisma.dutyAttendance.findMany({
    where: {
      dutySlot: { duty_date: { gte: todayStart, lte: todayEnd } },
      in_time:  { not: null },
      out_time: null,
    },
    select: { id: true, duty_slot_id: true },
  });

  if (openAttendance.length === 0) return;

  const cfg = await settingsService.getSettings();
  const autoOutTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cfg.auto_checkout_hour, cfg.auto_checkout_min);

  await prisma.dutyAttendance.updateMany({
    where: { id: { in: openAttendance.map((a) => a.id) } },
    data: { out_time: autoOutTime, out_status: 'auto', auto_out: true },
  });

  await prisma.dutySlot.updateMany({
    where: { id: { in: openAttendance.map((a) => a.duty_slot_id) } },
    data: { status: 'completed' },
  });

  logger.info(`[cron] Auto clock-out: ${openAttendance.length} record(s) closed.`);
}

// ─── 2. Cover request expiry — every hour ─────────────────────────────────────

async function expireCoverRequests() {
  const result = await prisma.coverRequest.updateMany({
    where: { status: 'open', expires_at: { lt: new Date() } },
    data: { status: 'expired' },
  });

  if (result.count > 0) {
    logger.info(`[cron] Cover request expiry: ${result.count} request(s) expired.`);
  }
}

// ─── 3. Calendar auto-close — daily at midnight IST ──────────────────────────

async function autoCloseCalendar() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Last day of current month
  const lastDay = new Date(year, month, 0).getDate();

  if (now.getDate() !== lastDay) return;

  const result = await prisma.calendarConfig.updateMany({
    where: { config_month: month, config_year: year, is_window_open: true },
    data: { is_window_open: false },
  });

  if (result.count > 0) {
    logger.info(`[cron] Calendar auto-close: window closed for ${year}-${String(month).padStart(2, '0')}.`);
  }
}

// ─── Register all jobs ────────────────────────────────────────────────────────

function startCronJobs() {
  cron.schedule('30 16 * * *', autoClockOut,        { timezone: 'Asia/Kolkata' });
  cron.schedule('0  *  * * *', expireCoverRequests,  { timezone: 'Asia/Kolkata' });
  cron.schedule('0  0  * * *', autoCloseCalendar,    { timezone: 'Asia/Kolkata' });

  logger.info('[cron] All scheduled jobs registered.');
}

module.exports = { startCronJobs };
