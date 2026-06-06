const { z } = require('zod');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.');

const pickSlotSchema = z.object({
  duty_date: isoDate,
  session_type: z.enum(['morning', 'afternoon']),
});

const adminAssignSchema = z.object({
  faculty_id: z.string().uuid('Invalid faculty ID.'),
  duty_date: isoDate,
  session_type: z.enum(['morning', 'afternoon']),
});

module.exports = { pickSlotSchema, adminAssignSchema };
