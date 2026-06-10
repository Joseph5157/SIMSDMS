const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const telegram = require('../lib/telegram');
const logger = require('../lib/logger');

const OTP_TTL_MS = 5 * 60 * 1000;        // 5 minutes
const MAX_ATTEMPTS = 5;                   // Account-level lock threshold
const OTP_COOLDOWN_MS = 60 * 1000;        // 60-second cooldown between requests

// Parse JWT_EXPIRES_IN (e.g. "7d", "24h") into milliseconds for the cookie
function parseExpiryMs(expiresIn) {
  const match = String(expiresIn || '7d').match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  return n * { d: 86400000, h: 3600000, m: 60000, s: 1000 }[match[2]];
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// ─── POST /auth/request-otp ───────────────────────────────────────────────────

async function requestOtp(req, res) {
  try {
    const { telegram_id } = req.body;

    const user = await prisma.user.findUnique({ where: { telegram_id: String(telegram_id) } });

    if (!user || user.deleted_at) {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'No active account found for that Telegram ID.',
      });
    }

    if (user.status === 'pending_telegram') {
      return res.status(403).json({
        error: true,
        code: 'TELEGRAM_NOT_LINKED',
        message: 'Your account is not yet activated. Tap the invite link your admin sent you.',
      });
    }

    if (user.status !== 'active') {
      return res.status(404).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'No active account found for that Telegram ID.',
      });
    }

    // Account-level lock — too many failed OTP attempts across all sessions
    if (user.otp_failed_attempts >= MAX_ATTEMPTS) {
      return res.status(403).json({
        error: true,
        code: 'ACCOUNT_LOCKED',
        message: 'Account locked due to too many failed OTP attempts. Contact your administrator to unlock.',
      });
    }

    if (!user.telegram_id) {
      return res.status(400).json({
        error: true,
        code: 'NO_TELEGRAM_ID',
        message: 'Your account does not have a Telegram ID configured. Contact your administrator.',
      });
    }

    // Cooldown — block if an unexpired session was created in the last 60 seconds
    const recentSession = await prisma.otpSession.findFirst({
      where: {
        user_id: user.id,
        verified: false,
        expires_at: { gt: new Date() },
        created_at: { gt: new Date(Date.now() - OTP_COOLDOWN_MS) },
      },
    });

    if (recentSession) {
      const secondsLeft = Math.ceil((recentSession.created_at.getTime() + OTP_COOLDOWN_MS - Date.now()) / 1000);
      return res.status(429).json({
        error: true,
        code: 'OTP_COOLDOWN',
        message: `Please wait ${secondsLeft} second(s) before requesting another OTP.`,
      });
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const otp_hash = await bcrypt.hash(otp, 10);
    const expires_at = new Date(Date.now() + OTP_TTL_MS);

    await prisma.otpSession.create({
      data: { user_id: user.id, otp_hash, expires_at },
    });

    try {
      await telegram.sendMessage(
        user.telegram_id,
        `<b>SIMS DMS Login OTP</b>\n\nYour one-time password is:\n<code>${otp}</code>\n\nExpires in 5 minutes. Do not share this with anyone.`,
      );
    } catch (err) {
      logger.error(`Telegram OTP delivery failed for user ${user.id}: ${err.message}`);
      return res.status(503).json({
        error: true,
        code: 'TELEGRAM_UNAVAILABLE',
        message: 'Could not send OTP via Telegram. Please try again shortly.',
      });
    }

    res.json({ message: 'OTP sent to your registered Telegram account.' });
  } catch (err) {
    logger.error(`requestOtp error: ${err.message}`);
    res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' });
  }
}

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────

async function verifyOtp(req, res) {
  try {
    const { telegram_id, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { telegram_id: String(telegram_id) } });

    if (!user || user.deleted_at || user.status !== 'active') {
      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid Telegram ID or OTP.',
      });
    }

    // Account-level lock check
    if (user.otp_failed_attempts >= MAX_ATTEMPTS) {
      return res.status(401).json({
        error: true,
        code: 'ACCOUNT_LOCKED',
        message: 'Account locked due to too many failed OTP attempts. Contact your administrator to unlock.',
      });
    }

    // Find latest unexpired, unverified session
    const session = await prisma.otpSession.findFirst({
      where: {
        user_id: user.id,
        verified: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!session) {
      return res.status(401).json({
        error: true,
        code: 'OTP_EXPIRED',
        message: 'No active OTP found. Please request a new one.',
      });
    }

    const isValid = await bcrypt.compare(otp, session.otp_hash);

    if (!isValid) {
      // Increment both session-level and account-level counters atomically
      const newAccountFailures = user.otp_failed_attempts + 1;

      await Promise.all([
        prisma.otpSession.update({
          where: { id: session.id },
          data: { attempt_count: { increment: 1 } },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { otp_failed_attempts: newAccountFailures },
        }),
      ]);

      if (newAccountFailures >= MAX_ATTEMPTS) {
        return res.status(401).json({
          error: true,
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked due to too many failed OTP attempts. Contact your administrator to unlock.',
        });
      }

      const remaining = MAX_ATTEMPTS - newAccountFailures;
      return res.status(401).json({
        error: true,
        code: 'INVALID_OTP',
        message: `Invalid OTP. ${remaining} attempt(s) remaining before account lockout.`,
      });
    }

    // OTP is valid — mark session verified and reset account failure counter
    await Promise.all([
      prisma.otpSession.update({
        where: { id: session.id },
        data: { verified: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { otp_failed_attempts: 0 },
      }),
    ]);

    // Mark Telegram as verified on first successful login
    if (!user.telegram_verified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegram_verified: true },
      });
    }

    // Get current session_version for JWT (default to 0 if not set)
    const sessionVersion = user.session_version ?? 0;

    const token = jwt.sign(
      { sub: user.id, role: user.role, session_version: sessionVersion },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    res.cookie('sims_token', token, cookieOptions());

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      designation: user.designation,
      telegram_id: user.telegram_id,
      telegram_verified: user.telegram_verified,
      status: user.status,
      approved_at: user.approved_at,
      created_at: user.created_at,
    });
  } catch (err) {
    logger.error(`verifyOtp error: ${err.message}`);
    res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' });
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────

async function logout(req, res) {
  res.clearCookie('sims_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully.' });
}

module.exports = { requestOtp, verifyOtp, logout };
