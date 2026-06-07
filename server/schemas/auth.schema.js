const { z } = require('zod');

const requestOtpSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID is required.'),
});

const verifyOtpSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID is required.'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.').regex(/^\d{6}$/, 'OTP must be numeric.'),
});

module.exports = { requestOtpSchema, verifyOtpSchema };
