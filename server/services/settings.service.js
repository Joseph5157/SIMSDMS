const prisma = require('../lib/prisma');

// In-memory cache — refreshed on every update, populated on first read.
let _cache = null;

// Fixed primary key — system_config is a true singleton (see prisma/schema.prisma).
// findFirst()+create() previously let two concurrent cold-start requests both
// see no row and both insert one; a fixed id + upsert makes that impossible.
const CONFIG_ID = 'global';

const DEFAULTS = {
  session_start_morning_hour:    8,
  session_start_morning_min:     0,
  session_start_afternoon_hour:  13,
  session_start_afternoon_min:   0,
  late_threshold_morning_hour:   8,
  late_threshold_morning_min:    15,
  late_threshold_afternoon_hour: 13,
  late_threshold_afternoon_min:  15,
  auto_checkout_morning_hour:    16,
  auto_checkout_morning_min:     30,
  auto_checkout_afternoon_hour:  16,
  auto_checkout_afternoon_min:   30,
};

// Returns the single SystemConfig row, creating it with defaults if absent.
async function getSettings() {
  if (_cache) return _cache;

  let row = await prisma.systemConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!row) {
    // upsert, not create — a concurrent first request racing this one lands
    // on the same fixed id and resolves via ON CONFLICT rather than a second row.
    row = await prisma.systemConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...DEFAULTS },
      update: {},
    });
  }

  _cache = row;
  return row;
}

// Merges partial updates into the single row and refreshes cache.
async function updateSettings(data, actorId) {
  const row = await prisma.systemConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, ...DEFAULTS, ...data, updated_by: actorId },
    update: { ...data, updated_by: actorId },
  });

  _cache = row;
  return row;
}

// Call this after a settings update to force a cache bust on next read.
function invalidateCache() {
  _cache = null;
}

// Session-scoped ordering invariant: session_start < late_threshold ≤
// auto_checkout, evaluated in minutes-since-midnight against the fully
// merged (existing + incoming) row — a partial PATCH can only be judged
// correctly once merged. Shared by every write path onto these fields
// (PATCH /duty-timing-settings and the generic Super-Admin PATCH
// /admin/settings) so neither can write out-of-order values.
function findOrderingViolation(merged) {
  for (const session of ['morning', 'afternoon']) {
    const start        = merged[`session_start_${session}_hour`]    * 60 + merged[`session_start_${session}_min`];
    const lateCutoff   = merged[`late_threshold_${session}_hour`]    * 60 + merged[`late_threshold_${session}_min`];
    const autoCheckout = merged[`auto_checkout_${session}_hour`]     * 60 + merged[`auto_checkout_${session}_min`];

    if (!(start < lateCutoff && lateCutoff <= autoCheckout)) {
      const label = session === 'morning' ? 'Morning' : 'Afternoon';
      return `${label} cutoffs must occur in order: session start < late cutoff ≤ auto clock-out.`;
    }
  }
  return null;
}

module.exports = { getSettings, updateSettings, invalidateCache, DEFAULTS, findOrderingViolation };
