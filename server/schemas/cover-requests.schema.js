const { z } = require('zod');

const createCoverRequestSchema = z.object({
  duty_slot_id: z.string().uuid('Invalid duty slot ID.'),
  reason:       z.string().min(1).max(500).optional(),
});

const coverConfigSchema = z.object({
  year:                        z.number().int().min(2000).max(2100),
  month:                       z.number().int().min(1).max(12),
  max_cover_requests_per_slot: z.number().int().min(1).max(100),
});

module.exports = { createCoverRequestSchema, coverConfigSchema };
