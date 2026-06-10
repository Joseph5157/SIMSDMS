const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');
const settingsService = require('../services/settings.service');
const logger = require('../lib/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  department: u.department,
  designation: u.designation,
  telegram_id: u.telegram_id,
  telegram_verified: u.telegram_verified,
  status: u.status,
  approved_at: u.approved_at,
  created_at: u.created_at,
});

// ─── GET /users/me ─────────────────────────────────────────────────────────────

async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  res.json(safeUser(user));
}

// ─── POST /users — Admin/Super Admin ──────────────────────────────────────────

async function createUser(req, res) {
  try {
    const { name, email, role, department, designation, phone, telegram_id } = req.body;

    logger.info(`[CREATE_USER] Starting for ${email}`);

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Name, email, and role are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deleted_at) {
      return res.status(409).json({ error: true, code: 'CONFLICT', message: 'A user with this email already exists.' });
    }

    // Always use invite-token flow for proper Telegram verification
    // Do not auto-activate based on manually-supplied telegram_id
    const token = crypto.randomBytes(32).toString('hex');
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const inviteLink = `https://t.me/${botUsername}?start=invite_${token}`;

    let userData = {
      name,
      email,
      role,
      department,
      designation,
      phone,
      telegram_id: telegram_id ? String(telegram_id) : null,
      approved_at: new Date(),
      approved_by: req.user.id,
      status: 'pending_telegram',
      telegram_verified: false,
      telegram_invite_token: token,
      telegram_invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    logger.info(`[CREATE_USER] Created with status=${userData.status}, telegram_verified=${userData.telegram_verified}, invite_token generated`);

    logger.info(`[CREATE_USER] Creating user in database for ${email}`);
    const user = await prisma.user.create({ data: userData });
    logger.info(`[CREATE_USER] User created successfully: ${user.id}`);

    const response = {
      user: safeUser(user),
      invite_link: inviteLink,
    };

    res.status(201).json(response);

    // Log action after response (don't block response on logging)
    logAction({
      actorId: req.user.id,
      action: 'CREATE_USER',
      targetId: user.id,
      targetType: 'user',
      metadata: { email, role, hasInviteToken: !telegram_id },
    }).catch(err => logger.error('Failed to log CREATE_USER action', err));
  } catch (err) {
    // Handle Prisma-specific errors
    if (err.code === 'P2002') {
      // Unique constraint violation
      const field = err.meta?.target?.[0] ?? 'field';
      logger.warn(`[CREATE_USER] Duplicate ${field} for user creation attempt: ${email}`);
      return res.status(409).json({
        error: true,
        code: 'DUPLICATE_FIELD',
        message: `An account with this ${field} already exists.`,
      });
    }

    // All other errors — log internally, never expose Prisma internals
    logger.error('[CREATE_USER] Error:', err);
    return res.status(500).json({
      error: true,
      code: 'SERVER_ERROR',
      message: 'Something went wrong. Please try again.',
    });
  }
}

// ─── GET /users — Admin/Super Admin ───────────────────────────────────────────

async function listUsers(req, res) {
  const { role, status, search, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { deleted_at: null };
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    data: users.map(safeUser),
    meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
  });
}

// ─── GET /users/:id — Admin/Super Admin ───────────────────────────────────────

async function getUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  res.json(safeUser(user));
}

// ─── PATCH /users/:id/profile ─────────────────────────────────────────────────
// Faculty can update their own profile (safe fields only). Admin+ can update anyone's basic info.
// Security-sensitive fields (role, status, telegram fields) must use explicit endpoints.

async function updateProfile(req, res) {
  const targetId = req.params.id;
  const { role, id: actorId } = req.user;

  if (role === 'faculty' && targetId !== actorId) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only edit your own profile.' });
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }

  // Whitelist allowed editable fields to prevent mass assignment
  const allowedFields = ['name', 'phone', 'department', 'designation'];
  const updateData = {};

  for (const field of allowedFields) {
    if (field in req.body) {
      updateData[field] = req.body[field];
    }
  }

  // Admin+ can also update email (but not role/status/telegram fields)
  if (role !== 'faculty' && 'email' in req.body) {
    updateData.email = req.body.email;
  }

  // Reject attempts to modify security-sensitive fields
  const sensitiveFields = ['role', 'status', 'telegram_id', 'telegram_verified', 'approved_at', 'deleted_at'];
  const attemptedSensitiveChanges = sensitiveFields.filter(f => f in req.body);
  if (attemptedSensitiveChanges.length > 0) {
    logger.warn(`[UPDATE_PROFILE] Attempted unauthorized change of fields: ${attemptedSensitiveChanges.join(', ')} for user ${targetId}`);
    return res.status(400).json({
      error: true,
      code: 'INVALID_FIELDS',
      message: `Cannot modify ${attemptedSensitiveChanges.join(', ')} through this endpoint. Use appropriate admin endpoints for role/status changes.`,
    });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
  });

  res.json(safeUser(updated));
}

// ─── PATCH /users/:id/deactivate — Admin/Super Admin ─────────────────────────

async function deactivateUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  if (user.role === 'super_admin') {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Super Admin cannot be deactivated.' });
  }
  if (user.id === req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You cannot deactivate yourself.' });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'inactive' },
  });

  await logAction({
    actorId: req.user.id,
    action: 'DEACTIVATE_USER',
    targetId: user.id,
    targetType: 'user',
  });

  res.json(safeUser(updated));
}

// ─── PATCH /users/:id/reactivate — Admin, Super Admin ────────────────────────

async function reactivateUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  if (user.status === 'active') {
    return res.status(400).json({ error: true, code: 'ALREADY_ACTIVE', message: 'User is already active.' });
  }
  if (user.status === 'pending_telegram') {
    return res.status(400).json({
      error: true,
      code: 'TELEGRAM_NOT_LINKED',
      message: "Cannot reactivate — user's Telegram is not yet linked. Use regenerate-invite instead.",
    });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'active' },
  });

  await logAction({
    actorId: req.user.id,
    action: 'REACTIVATE_USER',
    targetId: user.id,
    targetType: 'user',
  });

  res.json(safeUser(updated));
}

// ─── DELETE /users/:id — Super Admin only ────────────────────────────────────

async function deleteUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  if (user.role === 'super_admin') {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Super Admin cannot be deleted.' });
  }
  if (user.id === req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You cannot delete yourself.' });
  }

  const deleted = await prisma.user.update({
    where: { id: req.params.id },
    data: { deleted_at: new Date() },
  });

  await logAction({
    actorId: req.user.id,
    action: 'DELETE_USER',
    targetId: user.id,
    targetType: 'user',
  });

  res.json(safeUser(deleted));
}

// ─── GET /users/pending — Admin/Super Admin ───────────────────────────────────

async function getPendingUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'pending', deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        designation: true,
        telegram_id: true,
        status: true,
        created_at: true,
      },
    });
    res.json({ data: users });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Failed to fetch pending users.' });
  }
}

// ─── GET /admin/audit-logs — Super Admin ──────────────────────────────────────

async function getAuditLogs(req, res) {
  const { actor, action, page = '1', limit = '50' } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const where = {};
  if (actor) where.actor_id = actor;
  if (action) where.action = action;

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  res.json({
    data: logs,
    meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) },
  });
}

// ─── POST /admin/users/:id/reset-login — Super Admin ─────────────────────────

async function resetUserLogin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }

  // Generate new invite token for Telegram reactivation
  const token = crypto.randomBytes(32).toString('hex');
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  // Clear account lock, reset Telegram state, and delete all unexpired OTP sessions
  await Promise.all([
    prisma.user.update({
      where: { id: req.params.id },
      data: {
        otp_failed_attempts: 0,
        telegram_id: null,
        telegram_verified: false,
        status: 'pending_telegram',
        telegram_invite_token: token,
        telegram_invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.otpSession.deleteMany({
      where: { user_id: req.params.id, verified: false },
    }),
  ]);

  await logAction({
    actorId: req.user.id,
    action: 'RESET_USER_LOGIN',
    targetId: user.id,
    targetType: 'user',
    metadata: { telegram_reset: true },
  });

  const inviteLink = `https://t.me/${botUsername}?start=invite_${token}`;
  res.json({
    success: true,
    message: 'User login reset. Telegram state cleared and new invite generated.',
    invite_link: inviteLink,
  });
}

// ─── DELETE /admin/hard-delete/:resource/:id — Super Admin ───────────────────

const ALLOWED_HARD_DELETE = ['user', 'student'];

async function hardDelete(req, res) {
  const { resource, id } = req.params;

  if (!ALLOWED_HARD_DELETE.includes(resource)) {
    return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: `Hard delete not permitted for resource: ${resource}` });
  }

  if (resource === 'user') {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
    }
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Super Admin cannot be hard deleted.' });
    }
    // Soft-delete only for users (preserves relational integrity with violations/audit logs)
    await prisma.user.update({ where: { id }, data: { deleted_at: new Date() } });
  } else if (resource === 'student') {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student not found.' });
    }
    await prisma.student.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  await logAction({
    actorId: req.user.id,
    action: 'HARD_DELETE',
    targetId: id,
    targetType: resource,
  });

  res.json({ success: true, message: `${resource} marked as deleted.` });
}

// ─── GET /admin/settings — Super Admin ───────────────────────────────────────

async function getSettings(req, res) {
  const settings = await settingsService.getSettings();
  res.json(settings);
}

// ─── PATCH /admin/settings — Super Admin ─────────────────────────────────────

async function updateSettings(req, res) {
  const settings = await settingsService.updateSettings(req.body, req.user.id);

  await logAction({
    actorId:    req.user.id,
    action:     'SETTINGS_UPDATE',
    targetId:   settings.id,
    targetType: 'system_config',
    metadata:   req.body,
  });

  res.json(settings);
}

// ─── POST /users/:id/regenerate-invite — Admin/Super Admin ──────────────────

async function regenerateInvite(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }

  if (user.status !== 'pending_telegram') {
    return res.status(400).json({
      error: true,
      code: 'ALREADY_ACTIVE',
      message: "This user's Telegram is already linked.",
    });
  }

  // Generate new token
  const token = crypto.randomBytes(32).toString('hex');
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const inviteLink = `https://t.me/${botUsername}?start=invite_${token}`;

  await prisma.user.update({
    where: { id: req.params.id },
    data: {
      telegram_invite_token: token,
      telegram_invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await logAction({
    actorId: req.user.id,
    action: 'REGENERATE_INVITE',
    targetId: user.id,
    targetType: 'user',
  });

  res.json({ invite_link: inviteLink });
}

module.exports = {
  getMe,
  createUser,
  listUsers,
  getPendingUsers,
  getUser,
  updateProfile,
  deactivateUser,
  reactivateUser,
  deleteUser,
  getAuditLogs,
  resetUserLogin,
  hardDelete,
  getSettings,
  updateSettings,
  regenerateInvite,
};
