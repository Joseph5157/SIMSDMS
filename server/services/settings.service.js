const prisma = require('../lib/prisma');

// In-memory cache — refreshed on every update, populated on first read.
let _cache = null;

const DEFAULTS = {
  session_start_morning_hour:    8,
  session_start_morning_min:     0,
  session_start_afternoon_hour:  13,
  session_start_afternoon_min:   0,
  late_threshold_morning_hour:   8,
  late_threshold_morning_min:    15,
  late_threshold_afternoon_hour: 13,
  late_threshold_afternoon_min:  15,
  not_checked_in_morning_hour:   8,
  not_checked_in_morning_min:    30,
  not_checked_in_afternoon_hour: 13,
  not_checked_in_afternoon_min:  30,
  auto_checkout_morning_hour:    16,
  auto_checkout_morning_min:     30,
  auto_checkout_afternoon_hour:  16,
  auto_checkout_afternoon_min:   30,
  cover_ttl_hours:               48,
};

// Returns the single SystemConfig row, creating it with defaults if absent.
async function getSettings() {
  if (_cache) return _cache;

  let row = await prisma.systemConfig.findFirst();
  if (!row) {
    row = await prisma.systemConfig.create({ data: DEFAULTS });
  }

  _cache = row;
  return row;
}

// Merges partial updates into the single row and refreshes cache.
async function updateSettings(data, actorId) {
  let row = await prisma.systemConfig.findFirst();

  if (!row) {
    row = await prisma.systemConfig.create({ data: { ...DEFAULTS, ...data, updated_by: actorId } });
  } else {
    row = await prisma.systemConfig.update({
      where: { id: row.id },
      data:  { ...data, updated_by: actorId },
    });
  }

  _cache = row;
  return row;
}

// Call this after a settings update to force a cache bust on next read.
function invalidateCache() {
  _cache = null;
}

module.exports = { getSettings, updateSettings, invalidateCache, DEFAULTS };
