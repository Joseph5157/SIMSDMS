const { z } = require('zod');

const hour   = z.number().int().min(0).max(23);
const minute = z.number().int().min(0).max(59);

const updateSettingsSchema = z.object({
  late_threshold_morning_hour:   hour.optional(),
  late_threshold_morning_min:    minute.optional(),
  late_threshold_afternoon_hour: hour.optional(),
  late_threshold_afternoon_min:  minute.optional(),
  auto_checkout_hour:            hour.optional(),
  auto_checkout_min:             minute.optional(),
  cover_ttl_hours:               z.number().int().min(1).max(168).optional(), // 1h – 7 days
  session_start_morning_hour:    hour.optional(),
  session_start_morning_min:     minute.optional(),
  session_start_afternoon_hour:  hour.optional(),
  session_start_afternoon_min:   minute.optional(),
}).strict();

module.exports = { updateSettingsSchema };
