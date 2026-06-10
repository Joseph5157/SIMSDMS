const { z } = require('zod');

const requestOtpSchema = z.object({
  email: z.string().email('A valid email address is required.'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.').regex(/^\d{6}$/, 'OTP must be numeric.'),
});

module.exports = { requestOtpSchema, verifyOtpSchema };
