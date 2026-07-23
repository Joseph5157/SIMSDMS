const settingsService = require('../services/settings.service');
const { logAction } = require('../services/audit.service');

// ─── GET /violation-settings — Admin, Super Admin ────────────────────────────

async function getViolationSettings(req, res) {
  const settings = await settingsService.getSettings();
  res.json({
    repeat_violation_threshold: settings.repeat_violation_threshold,
    trend_stable_band_pct:      settings.trend_stable_band_pct,
  });
}

// ─── PATCH /violation-settings — Admin, Super Admin ──────────────────────────

async function updateViolationSettings(req, res) {
  const settings = await settingsService.updateSettings(req.body, req.user.id);

  await logAction({
    actorId:    req.user.id,
    action:     'VIOLATION_SETTINGS_UPDATE',
    targetId:   settings.id,
    targetType: 'system_config',
    metadata:   req.body,
  });

  res.json({
    repeat_violation_threshold: settings.repeat_violation_threshold,
    trend_stable_band_pct:      settings.trend_stable_band_pct,
  });
}

module.exports = { getViolationSettings, updateViolationSettings };
