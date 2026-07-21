const { z } = require('zod');

const updateViolationSettingsSchema = z.object({
  repeat_violation_threshold: z.number().int().min(1).max(50),
}).strict();

module.exports = { updateViolationSettingsSchema };
