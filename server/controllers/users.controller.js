const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');

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
  if (existing) {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: 'A user with this email already exists.' });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      department,
      designation,
      phone,
      telegram_id,
      status: 'active',
      approved_at: new Date(),
      approved_by: req.user.id,
    },
  });

  await logAction({
    actorId: req.user.id,
    action: 'CREATE_USER',
    targetId: user.id,
    targetType: 'user',
    metadata: { email, role },
  });

  res.status(201).json(safeUser(user));
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

  // Delete all unexpired OTP sessions for this user so they must do a fresh OTP
  await prisma.otpSession.deleteMany({
    where: { user_id: req.params.id, verified: false },
  });

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
// Settings are stored as CalendarConfig. This returns global system metadata.
// For now, returns server info and super_admin details.

async function getSettings(req, res) {
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'super_admin', deleted_at: null },
    select: { id: true, name: true, email: true, telegram_id: true, telegram_verified: true },
  });

  res.json({
    system: {
      node_env: process.env.NODE_ENV,
      version: '1.0.0',
    },
    super_admin: superAdmin,
  });
}

// ─── PATCH /admin/settings — Super Admin ─────────────────────────────────────
// Placeholder — no global settings table yet; returns 200 for forward-compat.

async function updateSettings(req, res) {
  res.json({ success: true, message: 'No mutable global settings in this version.' });
}

module.exports = {
  getMe,
  createUser,
  listUsers,
  getUser,
  updateProfile,
  deactivateUser,
  getAuditLogs,
  resetUserLogin,
  hardDelete,
  getSettings,
  updateSettings,
};
