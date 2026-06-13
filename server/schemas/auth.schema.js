const { z } = require('zod');

const requestOtpSchema = z.object({
  email: z.string().email('A valid email address is required.'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.').regex(/^\d{6}$/, 'OTP must be numeric.'),
});

const telegramCallbackSchema = z.object({
  id: z.number().or(z.string().transform(v => Number(v))).refine(n => Number.isInteger(n) && n > 0, 'id must be a positive integer'),
  first_name: z.string().min(1, 'first_name is required'),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number().or(z.string().transform(v => Number(v))).refine(n => Number.isInteger(n) && n > 0, 'auth_date must be a positive integer'),
  hash: z.string().min(1, 'hash is required'),
});

module.exports = { requestOtpSchema, verifyOtpSchema, telegramCallbackSchema };
