const { z } = require('zod');

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address.'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.').regex(/^\d{6}$/, 'OTP must be numeric.'),
});

module.exports = { requestOtpSchema, verifyOtpSchema };
