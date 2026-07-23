const { z } = require('zod');

const updateViolationSettingsSchema = z.object({
  repeat_violation_threshold: z.number().int().min(1).max(50).optional(),
  trend_stable_band_pct:      z.number().int().min(1).max(100).optional(),
}).strict().refine((d) => Object.keys(d).length > 0, { message: 'At least one setting is required.' });

module.exports = { updateViolationSettingsSchema };
