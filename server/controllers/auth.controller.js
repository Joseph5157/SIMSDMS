const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const telegram = require('../lib/telegram');
const logger = require('../lib/logger');
const { authCookieOptions, csrfCookieOptions, clearAuthOptions, clearCsrfOptions } = require('../lib/cookieOptions');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60 * 1000;

// ─── POST /auth/request-otp ───────────────────────────────────────────────────

async function requestOtp(req, res) {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // ISSUE-09: never reveal whether the account exists for unknown/inactive users
    if (!user || user.deleted_at || user.status === 'inactive') {
      return res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
    }

    if (user.status === 'pending_telegram') {
      return res.status(403).json({
        error: true,
        code: 'TELEGRAM_NOT_LINKED',
        message: 'Your account is not yet activated. Tap the invite link your admin sent you.',
      });
    }

    if (user.status !== 'active') {
      return res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
    }

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

    // ISSUE-10: expire all prior unverified sessions before creating a new one
    await prisma.otpSession.updateMany({
      where: { user_id: user.id, verified: false },
      data: { expires_at: new Date() },
    });

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

    res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
  } catch (err) {
    logger.error(`requestOtp error: ${err.message}`);
    res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' });
  }
}

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────

async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.deleted_at || user.status !== 'active') {
      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or OTP.',
      });
    }

    if (user.otp_failed_attempts >= MAX_ATTEMPTS) {
      return res.status(401).json({
        error: true,
        code: 'ACCOUNT_LOCKED',
        message: 'Account locked due to too many failed OTP attempts. Contact your administrator to unlock.',
      });
    }

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

    if (!user.telegram_verified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegram_verified: true },
      });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, session_version: user.session_version },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie('sims_token', token, authCookieOptions());
    res.cookie('sims_csrf', csrfToken, csrfCookieOptions());

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      designation: user.designation,
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

// ─── POST /auth/telegram-callback ────────────────────────────────────────────

async function telegramCallback(req, res) {
  try {
    const payload = req.body;

    // Build data-check-string: all fields except hash, sorted alphabetically, formatted as "key=value\n..."
    const fields = Object.keys(payload)
      .filter(key => key !== 'hash' && payload[key] !== null && payload[key] !== undefined)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join('\n');

    // Compute secret_key = SHA256(BOT_TOKEN)
    const secretKey = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();

    // Compute HMAC-SHA256 and compare with timing-safe comparison
    const computedHash = crypto.createHmac('sha256', secretKey).update(fields).digest('hex');
    const receivedHash = payload.hash;

    let hashValid = false;
    try {
      const a = Buffer.from(computedHash);
      const b = Buffer.from(receivedHash);
      hashValid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      hashValid = false;
    }

    if (!hashValid) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_TELEGRAM_HASH',
        message: 'Telegram login verification failed.',
      });
    }

    // Check if auth_date is not older than 86400 seconds (24 hours)
    const now = Math.floor(Date.now() / 1000);
    if (now - payload.auth_date > 86400) {
      return res.status(401).json({
        error: true,
        code: 'TELEGRAM_AUTH_EXPIRED',
        message: 'Telegram login has expired. Please try again.',
      });
    }

    // Look up user by telegram_id
    const telegramId = String(payload.id);
    const user = await prisma.user.findUnique({ where: { telegram_id: telegramId } });

    if (!user || user.deleted_at || user.status !== 'active') {
      return res.status(403).json({
        error: true,
        code: 'TELEGRAM_NOT_LINKED',
        message: 'Account not linked. Use your invite link from Telegram first.',
      });
    }

    // Issue JWT + CSRF cookies (same pattern as verifyOtp)
    const token = jwt.sign(
      { sub: user.id, role: user.role, session_version: user.session_version },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie('sims_token', token, authCookieOptions());
    res.cookie('sims_csrf', csrfToken, csrfCookieOptions());

    // Log the successful Telegram login
    const { logAction } = require('../services/audit.service');
    await logAction({
      actorId: user.id,
      action: 'TELEGRAM_LOGIN',
      targetId: user.id,
      targetType: 'user',
      metadata: { telegram_id: telegramId },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      designation: user.designation,
      telegram_verified: user.telegram_verified,
      status: user.status,
      approved_at: user.approved_at,
      created_at: user.created_at,
    });
  } catch (err) {
    logger.error(`telegramCallback error: ${err.message}`);
    res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' });
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────

async function logout(req, res) {
  // ISSUE-11: clear both cookies using the same options used to set them
  res.clearCookie('sims_token', clearAuthOptions());
  res.clearCookie('sims_csrf', clearCsrfOptions());
  res.json({ message: 'Logged out successfully.' });
}

module.exports = { requestOtp, verifyOtp, telegramCallback, logout };
