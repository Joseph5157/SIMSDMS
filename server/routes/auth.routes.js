const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../middleware/asyncHandler');
const { requestOtpSchema, verifyOtpSchema } = require('../schemas/auth.schema');
const ctrl = require('../controllers/auth.controller');

const router = Router();

// Rate limit for OTP endpoints — allows for shared college Wi-Fi (50 requests per 15 minutes per IP)
// Relaxed from 5 to accommodate many faculty on same public IP. Per-user cooldown (60s) still enforced in controller.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, code: 'RATE_LIMITED', message: 'Too many OTP requests. Please try again later.' },
});

// POST /auth/request-otp — Public
router.post('/request-otp', otpLimiter, validate(requestOtpSchema), asyncHandler(ctrl.requestOtp));

// POST /auth/verify-otp — Public
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), asyncHandler(ctrl.verifyOtp));

// POST /auth/logout — All Auth
router.post('/logout', authenticate, asyncHandler(ctrl.logout));

module.exports = router;
