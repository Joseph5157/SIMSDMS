const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { authCookieOptions, csrfCookieOptions, clearAuthOptions, clearCsrfOptions } = require('../lib/cookieOptions');

// ─── POST /auth/login ─────────────────────────────────────────────────────────

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Generic response — never reveal whether user exists or has no password
    if (!user || user.deleted_at || user.status !== 'active' || !user.password_hash) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Issue JWT and CSRF tokens
    const token = jwt.sign(
      { sub: user.id, role: user.role, session_version: user.session_version },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie('sims_token', token, authCookieOptions());
    res.cookie('sims_csrf', csrfToken, csrfCookieOptions());

    // Log successful login
    const { logAction } = require('../services/audit.service');
    await logAction({
      actorId: user.id,
      action: 'PASSWORD_LOGIN',
      targetId: user.id,
      targetType: 'user',
      metadata: { email },
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
      must_change_password: user.must_change_password,
      approved_at: user.approved_at,
      created_at: user.created_at,
    });
  } catch (err) {
    logger.error(`login error: ${err.message}`);
    res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again.' });
  }
}

// ─── POST /auth/change-password ────────────────────────────────────────────────

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.sub; // From JWT middleware

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.deleted_at) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_USER',
        message: 'User not found.',
      });
    }

    // If password_hash exists, verify current password
    if (user.password_hash) {
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          error: true,
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect.',
        });
      }
    }
    // If password_hash is null (first-time set), skip current_password check

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(new_password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: newPasswordHash,
        must_change_password: false,
      },
    });

    // Log password change
    const { logAction } = require('../services/audit.service');
    await logAction({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      targetId: userId,
      targetType: 'user',
      metadata: { changed_by: 'self' },
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    logger.error(`changePassword error: ${err.message}`);
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

module.exports = { login, changePassword, logout };
