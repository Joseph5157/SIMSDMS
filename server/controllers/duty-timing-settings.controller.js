const settingsService = require('../services/settings.service');
const { logAction } = require('../services/audit.service');

// Only these 16 fields are exposed here — cover_ttl_hours and any other
// system_config fields stay on the Super-Admin-only /admin/settings endpoint.
const TIMING_FIELDS = [
  'session_start_morning_hour', 'session_start_morning_min',
  'session_start_afternoon_hour', 'session_start_afternoon_min',
  'late_threshold_morning_hour', 'late_threshold_morning_min',
  'late_threshold_afternoon_hour', 'late_threshold_afternoon_min',
  'not_checked_in_morning_hour', 'not_checked_in_morning_min',
  'not_checked_in_afternoon_hour', 'not_checked_in_afternoon_min',
  'auto_checkout_morning_hour', 'auto_checkout_morning_min',
  'auto_checkout_afternoon_hour', 'auto_checkout_afternoon_min',
];

function pickTimingFields(row) {
  const out = {};
  for (const key of TIMING_FIELDS) out[key] = row[key];
  return out;
}

// Validates session_start < late_threshold <= not_checked_in <= auto_checkout,
// expressed in minutes-since-midnight, against the fully merged (existing +
// incoming) row — a partial PATCH can only be judged correctly once merged.
function findOrderingViolation(merged) {
  for (const session of ['morning', 'afternoon']) {
    const start        = merged[`session_start_${session}_hour`]    * 60 + merged[`session_start_${session}_min`];
    const lateCutoff   = merged[`late_threshold_${session}_hour`]    * 60 + merged[`late_threshold_${session}_min`];
    const notCheckedIn = merged[`not_checked_in_${session}_hour`]    * 60 + merged[`not_checked_in_${session}_min`];
    const autoCheckout = merged[`auto_checkout_${session}_hour`]     * 60 + merged[`auto_checkout_${session}_min`];

    if (!(start < lateCutoff && lateCutoff <= notCheckedIn && notCheckedIn <= autoCheckout)) {
      const label = session === 'morning' ? 'Morning' : 'Afternoon';
      return `${label} cutoffs must occur in order: session start < late cutoff ≤ not-checked-in cutoff ≤ auto clock-out.`;
    }
  }
  return null;
}

// ─── GET /duty-timing-settings — Admin, Super Admin ──────────────────────────

async function getDutyTimingSettings(req, res) {
  const settings = await settingsService.getSettings();
  res.json(pickTimingFields(settings));
}

// ─── PATCH /duty-timing-settings — Admin, Super Admin ────────────────────────

async function updateDutyTimingSettings(req, res) {
  const current = await settingsService.getSettings();
  const merged  = { ...current, ...req.body };

  const violation = findOrderingViolation(merged);
  if (violation) {
    return res.status(422).json({ error: true, code: 'VALIDATION_ERROR', message: violation });
  }

  const settings = await settingsService.updateSettings(req.body, req.user.id);

  await logAction({
    actorId:    req.user.id,
    action:     'DUTY_TIMING_SETTINGS_UPDATE',
    targetId:   settings.id,
    targetType: 'system_config',
    metadata:   req.body,
  });

  res.json(pickTimingFields(settings));
}

module.exports = { getDutyTimingSettings, updateDutyTimingSettings };
