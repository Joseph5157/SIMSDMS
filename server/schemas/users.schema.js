const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email().max(200),
  role: z.enum(['admin', 'faculty']),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  telegram_id: z.string().max(50).optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

module.exports = { createUserSchema, updateProfileSchema };
