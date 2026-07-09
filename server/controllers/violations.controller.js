const prisma = require('../lib/prisma');
const { isSlotToday } = require('../lib/time');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Immutable audit entry for every violation change
async function auditViolation({ violationId, changedBy, changeType, oldData, newData, reason }) {
  await prisma.violationAuditLog.create({
    data: {
      violation_id: violationId,
      changed_by:   changedBy,
      change_type:  changeType,
      old_data:     oldData  ?? null,
      new_data:     newData  ?? null,
      reason:       reason   ?? null,
    },
  });
}

// Shared include for rich violation responses
const VIOLATION_INCLUDE = {
  student:       { select: { id: true, registration_number: true, student_name: true, course: true, semester_or_year: true } },
  faculty:       { select: { id: true, name: true, email: true, department: true } },
  dutySlot:      { select: { id: true, duty_date: true, session_type: true } },
  violationType: { select: { id: true, name: true, default_fine: true } },
};

function snapshotViolation(v) {
  return {
    custom_violation: v.custom_violation,
    fine_amount:      v.fine_amount?.toString(),
    is_warning_only:  v.is_warning_only,
    remarks:          v.remarks,
    record_status:    v.record_status,
    is_flagged:       v.is_flagged,
    flag_note:        v.flag_note,
  };
}

// ─── POST /violations ─────────────────────────────────────────────────────────

async function createViolation(req, res) {
  const { student_id, duty_slot_id, violation_type_id, custom_violation, fine_amount, is_warning_only, remarks } = req.body;

  // Verify the requesting faculty is the current owner of this slot (after any
  // admin reassignment, faculty_id is the new owner).
  const slot = await prisma.dutySlot.findUnique({ where: { id: duty_slot_id } });
  if (!slot || slot.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only record student violations for your own duty slots.' });
  }

  // Reject unless faculty is actively on duty: slot must be today and the faculty
  // must be checked in (in_time set) but not yet checked out (out_time null).
  if (!isSlotToday(slot.duty_date)) {
    return res.status(409).json({ error: true, code: 'NOT_ON_DUTY', message: 'Student violations can only be recorded during an active duty session.' });
  }
  const activeAttendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });
  if (!activeAttendance?.in_time || activeAttendance.out_time !== null) {
    return res.status(409).json({ error: true, code: 'NOT_ON_DUTY', message: 'Student violations can only be recorded during an active duty session.' });
  }

  // Verify student exists and is active
  const student = await prisma.student.findUnique({ where: { id: student_id } });
  if (!student || student.deleted_at || student.status !== 'active') {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student not found or inactive.' });
  }

  // Verify violation type exists and is active
  const violationType = await prisma.violationType.findUnique({ where: { id: violation_type_id } });
  if (!violationType || !violationType.is_active) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation type not found or inactive.' });
  }

  // custom_violation required when type name is 'Others' or is_system + no standard name
  if (violationType.name.toLowerCase() === 'others' && !custom_violation) {
    return res.status(422).json({ error: true, code: 'VALIDATION_ERROR', message: 'custom_violation is required for the "Others" student violation type.' });
  }

  // Determine final fine amount
  let resolvedFine;
  if (is_warning_only) {
    resolvedFine = 0;
  } else if (fine_amount !== undefined) {
    resolvedFine = fine_amount;
  } else {
    resolvedFine = Number(violationType.default_fine);
  }

  const violation = await prisma.violation.create({
    data: {
      student_id,
      faculty_id:        req.user.id,
      duty_slot_id,
      violation_type_id,
      custom_violation:  custom_violation ?? null,
      fine_amount:       resolvedFine,
      is_warning_only:   is_warning_only ?? false,
      remarks:           remarks ?? null,
    },
    include: VIOLATION_INCLUDE,
  });

  await auditViolation({
    violationId: violation.id,
    changedBy:   req.user.id,
    changeType:  'created',
    newData:     snapshotViolation(violation),
  });

  res.status(201).json(violation);
}

// ─── GET /violations — Admin & Faculty ────────────────────────────────────────
// Faculty can only see their own violations; Admin can see all or filter by faculty

async function listViolations(req, res) {
  const { student_id, faculty_id, date, violation_type_id, record_status, is_flagged, page = '1', limit = '20' } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (student_id)       where.student_id       = student_id;
  if (violation_type_id) where.violation_type_id = violation_type_id;
  if (record_status)    where.record_status     = record_status;
  if (is_flagged !== undefined) where.is_flagged = is_flagged === 'true';
  if (date) {
    const d = new Date(date);
    where.dutySlot = { duty_date: { gte: d, lte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) } };
  }

  // Authorization: Faculty can only see their own violations
  if (req.user.role === 'faculty') {
    where.faculty_id = req.user.id;
  } else if (faculty_id) {
    // Admin can filter by any faculty
    where.faculty_id = faculty_id;
  }

  const [total, violations] = await Promise.all([
    prisma.violation.count({ where }),
    prisma.violation.findMany({
      where,
      include: VIOLATION_INCLUDE,
      orderBy: { created_at: 'desc' },
      skip:  (pageNum - 1) * pageSize,
      take:  pageSize,
    }),
  ]);

  res.json({ data: violations, meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) } });
}

// ─── GET /violations/my — Faculty ─────────────────────────────────────────────

async function myViolations(req, res) {
  const { record_status, is_flagged, page = '1', limit = '20' } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { faculty_id: req.user.id };
  if (record_status)    where.record_status = record_status;
  if (is_flagged !== undefined) where.is_flagged = is_flagged === 'true';

  const [total, violations] = await Promise.all([
    prisma.violation.count({ where }),
    prisma.violation.findMany({
      where,
      include: VIOLATION_INCLUDE,
      orderBy: { created_at: 'desc' },
      skip:  (pageNum - 1) * pageSize,
      take:  pageSize,
    }),
  ]);

  res.json({ data: violations, meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) } });
}

// ─── GET /violations/:id — All Auth ───────────────────────────────────────────

async function getViolation(req, res) {
  const violation = await prisma.violation.findUnique({
    where: { id: req.params.id },
    include: VIOLATION_INCLUDE,
  });

  if (!violation) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation not found.' });
  }

  // Faculty can only view their own
  if (req.user.role === 'faculty' && violation.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied.' });
  }

  res.json(violation);
}

// ─── PATCH /violations/:id — Faculty edit ─────────────────────────────────────

async function editViolation(req, res) {
  const violation = await prisma.violation.findUnique({ where: { id: req.params.id } });

  if (!violation) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation not found.' });
  }
  if (violation.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only edit your own student violations.' });
  }
  if (violation.is_flagged) {
    return res.status(409).json({ error: true, code: 'ALREADY_FLAGGED', message: 'You cannot edit a student violation after it has been flagged for review.' });
  }

  const oldSnapshot = snapshotViolation(violation);
  const { custom_violation, fine_amount, is_warning_only, remarks } = req.body;

  const data = {};
  if (custom_violation !== undefined) data.custom_violation = custom_violation;
  if (fine_amount       !== undefined) data.fine_amount      = fine_amount;
  if (is_warning_only   !== undefined) {
    data.is_warning_only = is_warning_only;
    if (is_warning_only) data.fine_amount = 0;
  }
  if (remarks !== undefined) data.remarks = remarks;

  const updated = await prisma.violation.update({
    where: { id: req.params.id },
    data,
    include: VIOLATION_INCLUDE,
  });

  await auditViolation({
    violationId: violation.id,
    changedBy:   req.user.id,
    changeType:  'edited',
    oldData:     oldSnapshot,
    newData:     snapshotViolation(updated),
  });

  res.json(updated);
}

// ─── PATCH /violations/:id/hide — Admin ───────────────────────────────────────

async function hideViolation(req, res) {
  const violation = await prisma.violation.findUnique({ where: { id: req.params.id } });

  if (!violation) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation not found.' });
  }
  if (violation.record_status === 'hidden') {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: 'Student violation is already hidden.' });
  }

  const oldSnapshot = snapshotViolation(violation);

  const updated = await prisma.violation.update({
    where: { id: req.params.id },
    data:  { record_status: 'hidden' },
    include: VIOLATION_INCLUDE,
  });

  await auditViolation({
    violationId: violation.id,
    changedBy:   req.user.id,
    changeType:  'hidden',
    oldData:     oldSnapshot,
    newData:     snapshotViolation(updated),
  });

  res.json(updated);
}

// ─── PATCH /violations/:id/flag — Faculty ─────────────────────────────────────

async function flagViolation(req, res) {
  const violation = await prisma.violation.findUnique({ where: { id: req.params.id } });

  if (!violation) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation not found.' });
  }
  if (violation.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only flag your own student violations.' });
  }
  if (violation.is_flagged) {
    return res.status(409).json({ error: true, code: 'ALREADY_FLAGGED', message: 'This student violation is already flagged for review.' });
  }

  const updated = await prisma.violation.update({
    where: { id: req.params.id },
    data:  { is_flagged: true, flag_note: req.body.flag_note },
    include: VIOLATION_INCLUDE,
  });

  await auditViolation({
    violationId: violation.id,
    changedBy:   req.user.id,
    changeType:  'flagged',
    newData:     { flag_note: req.body.flag_note },
  });

  res.json(updated);
}

// ─── PATCH /violations/:id/resolve-flag — Admin ───────────────────────────────

async function resolveFlag(req, res) {
  const violation = await prisma.violation.findUnique({ where: { id: req.params.id } });

  if (!violation) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation not found.' });
  }
  if (!violation.is_flagged) {
    return res.status(409).json({ error: true, code: 'NOT_FLAGGED', message: 'This student violation is not flagged for review.' });
  }
  if (violation.flag_resolved_at) {
    return res.status(409).json({ error: true, code: 'ALREADY_RESOLVED', message: 'This flag has already been resolved.' });
  }

  const updated = await prisma.violation.update({
    where: { id: req.params.id },
    data: {
      is_flagged:        false,
      flag_resolved_by:  req.user.id,
      flag_resolved_at:  new Date(),
    },
    include: VIOLATION_INCLUDE,
  });

  await auditViolation({
    violationId: violation.id,
    changedBy:   req.user.id,
    changeType:  'flag_resolved',
    oldData:     { flag_note: violation.flag_note },
    newData:     { resolved_by: req.user.id },
    reason:      req.body.reason,
  });

  res.json(updated);
}

// ─── GET /violations/:id/photo — Foundation placeholder ───────────────────────

async function getPhoto(req, res) {
  res.status(501).json({ error: true, code: 'NOT_IMPLEMENTED', message: 'Photo access is not available in Phase 1.' });
}

// ─── GET /violations/:id/audit-log — Admin ────────────────────────────────────

async function getAuditLog(req, res) {
  const violation = await prisma.violation.findUnique({ where: { id: req.params.id } });
  if (!violation) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Student violation not found.' });
  }

  const logs = await prisma.violationAuditLog.findMany({
    where: { violation_id: req.params.id },
    orderBy: { created_at: 'asc' },
    include: {
      changedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  res.json({ data: logs, total: logs.length });
}

module.exports = {
  createViolation,
  listViolations,
  myViolations,
  getViolation,
  editViolation,
  hideViolation,
  flagViolation,
  resolveFlag,
  getPhoto,
  getAuditLog,
};
