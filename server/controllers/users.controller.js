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
  const { name, email, role, department, designation, phone, telegram_id } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.deleted_at) {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: 'A user with this email already exists.' });
  }

  let inviteLink = null;
  let userData = {
    name,
    email,
    role,
    department,
    designation,
    phone,
    telegram_id: telegram_id || null,
    approved_at: new Date(),
    approved_by: req.user.id,
  };

  // Path A: Telegram ID provided — account is immediately active
  if (telegram_id) {
    userData.status = 'active';
    userData.telegram_verified = true;
  } else {
    // Path B: No Telegram ID — generate invite token and set status to pending_telegram
    const token = crypto.randomBytes(32).toString('hex');
    userData.status = 'pending_telegram';
    userData.telegram_invite_token = token;
    userData.telegram_invite_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Build invite link
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    inviteLink = `https://t.me/${botUsername}?start=invite_${token}`;
  }

  const user = await prisma.user.create({ data: userData });

  await logAction({
    actorId: req.user.id,
    action: 'CREATE_USER',
    targetId: user.id,
    targetType: 'user',
    metadata: { email, role, hasInviteToken: !telegram_id },
  });

  const response = {
    user: safeUser(user),
    invite_link: inviteLink,
  };

  res.status(201).json(response);
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
// Faculty can update their own. Admin+ can update anyone.

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

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: req.body,
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

  // Clear account lock and delete all unexpired OTP sessions
  await Promise.all([
    prisma.user.update({
      where: { id: req.params.id },
      data: { otp_failed_attempts: 0 },
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
  });

  res.json({ success: true, message: 'OTP sessions cleared. User must log in again via Telegram OTP.' });
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
