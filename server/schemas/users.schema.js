const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

module.exports = { updateProfileSchema };
