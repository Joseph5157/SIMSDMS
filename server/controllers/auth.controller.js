const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const telegram = require('../lib/telegram');
const logger = require('../lib/logger');

const OTP_TTL_MS = 5 * 60 * 1000;        // 5 minutes
const MAX_ATTEMPTS = 5;
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
    sameSite: 'strict',
    maxAge: parseExpiryMs(process.env.JWT_EXPIRES_IN),
  };
}

// ─── POST /auth/request-otp ───────────────────────────────────────────────────

async function requestOtp(req, res) {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way to avoid user enumeration
  if (!user || user.deleted_at || user.status !== 'active') {
    return res.status(404).json({
      error: true,
      code: 'USER_NOT_FOUND',
      message: 'No active account found for that email.',
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
}

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────

async function verifyOtp(req, res) {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deleted_at || user.status !== 'active') {
    return res.status(401).json({
      error: true,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or OTP.',
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

  if (session.attempt_count >= MAX_ATTEMPTS) {
    return res.status(401).json({
      error: true,
      code: 'OTP_LOCKED',
      message: 'Too many failed attempts. Please request a new OTP.',
    });
  }

  const isValid = await bcrypt.compare(otp, session.otp_hash);

  if (!isValid) {
    const newCount = session.attempt_count + 1;
    await prisma.otpSession.update({
      where: { id: session.id },
      data: { attempt_count: newCount },
    });

    const remaining = MAX_ATTEMPTS - newCount;
    return res.status(401).json({
      error: true,
      code: 'INVALID_OTP',
      message: remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : 'Invalid OTP. No attempts remaining. Please request a new OTP.',
    });
  }

  // Mark session as verified
  await prisma.otpSession.update({
    where: { id: session.id },
    data: { verified: true },
  });

  // Mark Telegram as verified on first successful login
  if (!user.telegram_verified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { telegram_verified: true },
    });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  res.cookie('sims_token', token, cookieOptions());

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    designation: user.designation,
  });
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
