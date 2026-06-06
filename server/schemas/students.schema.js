const { z } = require('zod');

const promoteSchema = z.object({
  semester_or_year: z.string().min(1).max(20),
  academic_year: z.string().regex(/^\d{4}-\d{2,4}$/, 'Format must be e.g. 2024-25').optional(),
});

module.exports = { promoteSchema };
