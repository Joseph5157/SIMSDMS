const prisma = require('../lib/prisma');
const { logAction } = require('../services/audit.service');
const settingsService = require('../services/settings.service');
const logger = require('../lib/logger');
const { generateTempPassword, hashPassword } = require('../lib/password');
const telegram = require('../lib/telegram');
const { safeUser } = require('../lib/safeUser');
const { APP_SHORT_NAME } = require('../lib/branding');
const { formatDateIST, nowInIST, istDayRangeUTC } = require('../lib/time');
const { buildWorkbook, sendWorkbook } = require('../lib/excel');
const { buildReportPdf, sendPdf } = require('../lib/pdf');

// ─── GET /users/me ─────────────────────────────────────────────────────────────

async function getMe(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  res.json(safeUser(user));
}

// ─── GET /users — Admin/Super Admin ───────────────────────────────────────────

async function listUsers(req, res) {
  const { role, status, search, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { deleted_at: null };
  if (role) where.role = role;
  if (status === 'notify_failed') {
    where.activation_notification_failed = true;
  } else if (status) {
    where.status = status;
  }

  // A super_admin login must be invisible to everyone below it — only a
  // super_admin viewer may see super_admin rows. For any other viewer we force
  // the role filter to exclude them, even if they explicitly ask for the role.
  if (req.user.role !== 'super_admin') {
    if (role === 'super_admin') {
      return res.json({ data: [], meta: { total: 0, page: pageNum, limit: pageSize, pages: 0 } });
    }
    where.role = role || { not: 'super_admin' };
  }
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

// ─── GET /users/directory — All Auth ──────────────────────────────────────────
// Minimal recipient list for messaging: active users only, self excluded, no
// contact/security fields (email, phone, telegram) exposed to non-admins.
//
// Messaging is restricted to admin↔faculty communication — faculty may not
// message other faculty. Admin/super_admin can still message everyone
// (including each other) for internal coordination.

async function listDirectory(req, res) {
  const where = {
    deleted_at: null,
    status: 'active',
    id: { not: req.user.id },
  };

  if (req.user.role === 'faculty') {
    // Faculty may message admins only — never expose the super_admin account.
    where.role = { in: ['admin'] };
  } else if (req.user.role !== 'super_admin') {
    // Admins see all active recipients except the hidden super_admin.
    where.role = { not: 'super_admin' };
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, role: true, department: true, designation: true },
    orderBy: { name: 'asc' },
  });

  res.json({ data: users });
}

// ─── GET /users/:id — Admin/Super Admin ───────────────────────────────────────

async function getUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  // The super_admin account is hidden from everyone below it — a non-super_admin
  // must not be able to fetch it by id either.
  if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }
  res.json(safeUser(user));
}

// ─── PATCH /users/:id/profile ─────────────────────────────────────────────────
// Update own profile only (safe fields), for every role — per the API spec.
// Security-sensitive fields (role, status, telegram fields, email) must use explicit endpoints.

async function updateProfile(req, res) {
  const targetId = req.params.id;
  const { id: actorId } = req.user;

  if (targetId !== actorId) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only edit your own profile.' });
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }

  // Whitelist allowed editable fields to prevent mass assignment
  const allowedFields = ['name', 'phone', 'department', 'designation', 'title', 'avatar'];
  const updateData = {};

  for (const field of allowedFields) {
    if (field in req.body) {
      updateData[field] = req.body[field];
    }
  }

  // Reject attempts to modify security-sensitive fields
  const sensitiveFields = ['role', 'status', 'telegram_id', 'telegram_verified', 'approved_at', 'deleted_at', 'email'];
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
    data: { status: 'inactive', session_version: { increment: 1 } },
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
      message: "Cannot reactivate — Telegram needs relinking. Use Reset Login to generate a relink link.",
    });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'active', session_version: { increment: 1 } },
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

  const { year, month, day } = nowInIST();
  const upcomingDuty = await prisma.dutySlot.findFirst({
    where: {
      faculty_id: user.id,
      // 'absent' too, not just 'scheduled': a today/upcoming absent slot is
      // still reassignable, so deleting its owner would orphan it exactly as a
      // scheduled one would. Force a reassign first in both cases.
      status: { in: ['scheduled', 'absent'] },
      duty_date: { gte: istDayRangeUTC(year, month, day).gte },
    },
    select: { duty_date: true, session_type: true },
    orderBy: { duty_date: 'asc' },
  });
  if (upcomingDuty) {
    return res.status(409).json({
      error: true,
      code: 'HAS_UPCOMING_DUTY',
      message: `This faculty still has a scheduled duty on ${formatDateIST(upcomingDuty.duty_date)} (${upcomingDuty.session_type}). Reassign it to another faculty member before deleting this account.`,
    });
  }

  const deleted = await prisma.user.update({
    where: { id: req.params.id },
    data: { deleted_at: new Date(), session_version: { increment: 1 } },
  });

  await logAction({
    actorId: req.user.id,
    action: 'DELETE_USER',
    targetId: user.id,
    targetType: 'user',
  });

  res.json(safeUser(deleted));
}

// ─── GET /admin/audit-logs — Super Admin ──────────────────────────────────────

// Shared by the paginated JSON view and both exports, so a filter can never
// drift between what's shown on screen and what gets downloaded.
function auditLogsWhere({ actor, action, from, to }) {
  const where = {};
  if (actor) where.actor_id = actor;
  if (action) where.action = action;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to)   where.created_at.lte = new Date(`${to}T23:59:59.999`);
  }
  return where;
}

async function getAuditLogs(req, res) {
  const { page = '1', limit = '50' } = req.query;
  const where = auditLogsWhere(req.query);

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

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

const AUDIT_LOG_EXPORT_COLUMNS = [
  { header: 'Actor',       key: 'actor',       width: 24 },
  { header: 'Action',      key: 'action',      width: 26 },
  { header: 'Target Type', key: 'target_type', width: 16 },
  { header: 'Target ID',   key: 'target_id',   width: 26 },
  { header: 'Timestamp',   key: 'timestamp',   width: 22 },
];

function mapAuditLogRow(log) {
  return {
    actor:       log.actor?.name ?? log.actor_id ?? 'System',
    action:      log.action,
    target_type: log.target_type ?? '—',
    target_id:   log.target_id ?? '—',
    timestamp:   new Date(log.created_at).toLocaleString('en-IN'),
  };
}

// Unbounded — exports the full filtered result, not just the current page
// (same convention as every other export in the app).
async function _getAuditLogsForExport(where) {
  return prisma.adminAuditLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { actor: { select: { id: true, name: true, email: true, role: true } } },
  });
}

// ─── GET /admin/audit-logs/export — Super Admin (.xlsx) ──────────────────────

async function exportAuditLogs(req, res) {
  const logs = await _getAuditLogsForExport(auditLogsWhere(req.query));
  const buffer = await buildWorkbook('Audit Logs', AUDIT_LOG_EXPORT_COLUMNS, logs.map(mapAuditLogRow));
  sendWorkbook(res, buffer, 'audit-logs.xlsx');
}

// ─── GET /admin/audit-logs/export/pdf — Super Admin ───────────────────────────

async function exportAuditLogsPdf(req, res) {
  const logs = await _getAuditLogsForExport(auditLogsWhere(req.query));
  const buffer = await buildReportPdf({
    title: 'Audit Logs',
    subtitle: 'Immutable system-level action history',
    columns: AUDIT_LOG_EXPORT_COLUMNS,
    rows: logs.map(mapAuditLogRow),
  });
  sendPdf(res, buffer, 'audit-logs.pdf');
}

// ─── POST /admin/users/:id/reset-login — Super Admin ─────────────────────────
// Generates a new temporary password, notifies the user via Telegram if
// possible, and never blocks the reset on Telegram delivery: if delivery
// fails (or the user has no linked Telegram), the temp password is returned
// in the response so the Super Admin can relay it manually.
async function resetUserLogin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.deleted_at) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found.' });
  }

  // Guard: cannot reset super_admin
  if (user.role === 'super_admin') {
    return res.status(403).json({
      error: true,
      code: 'FORBIDDEN',
      message: 'Super Admin login cannot be reset.',
    });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      must_change_password: true,
      session_version: { increment: 1 },
      activation_notification_failed: false,
    },
  });

  // Attempt Telegram delivery. This never blocks the reset — the password is
  // already changed above regardless of the outcome here.
  let telegramDelivered = false;
  let telegramError = null;

  if (user.telegram_id) {
    try {
      const appUrl = process.env.APP_URL || 'https://sims-dms.railway.app';
      const text = `🔑 Your ${APP_SHORT_NAME} password has been reset by an Admin.\n\nLogin at: ${appUrl}/login\nEmail: ${user.email}\nTemporary password: <code>${tempPassword}</code>\n\nYou'll be asked to set a new password on first login.`;
      await telegram.sendMessage(user.telegram_id, text);
      telegramDelivered = true;
    } catch (err) {
      telegramError = err.message;
      logger.error(`[RESET_USER_LOGIN] Telegram notification failed for user ${user.id}:`, err);
    }
  } else {
    telegramError = 'NO_TELEGRAM_ID';
  }

  await logAction({
    actorId: req.user.id,
    action: 'RESET_USER_LOGIN',
    targetId: user.id,
    targetType: 'user',
    metadata: { telegram_delivered: telegramDelivered, telegram_error: telegramError },
  });

  res.json({
    success: true,
    message: telegramDelivered
      ? 'Password reset. User notified via Telegram.'
      : 'Password reset, but Telegram delivery failed. Relay the temporary password to the user manually.',
    telegram_delivered: telegramDelivered,
    // Only surface the temp password when the user didn't already receive it directly.
    ...(telegramDelivered ? {} : { temp_password: tempPassword }),
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
    await prisma.user.update({ where: { id }, data: { deleted_at: new Date(), session_version: { increment: 1 } } });
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
// Shares the same system_config timing fields as PATCH /duty-timing-settings,
// so it must enforce the same session_start < late_threshold ≤ auto_checkout
// ordering invariant — reuses settingsService.findOrderingViolation rather
// than re-implementing it, so the two endpoints can never drift apart.

async function updateSettings(req, res) {
  const current = await settingsService.getSettings();
  const merged  = { ...current, ...req.body };

  const violation = settingsService.findOrderingViolation(merged);
  if (violation) {
    return res.status(422).json({ error: true, code: 'VALIDATION_ERROR', message: violation });
  }

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

module.exports = {
  getMe,
  listUsers,
  listDirectory,
  getUser,
  updateProfile,
  deactivateUser,
  reactivateUser,
  deleteUser,
  getAuditLogs,
  exportAuditLogs,
  exportAuditLogsPdf,
  resetUserLogin,
  hardDelete,
  getSettings,
  updateSettings,
};
