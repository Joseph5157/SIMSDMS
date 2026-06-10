const prisma = require('../lib/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseYearMonth(req, res) {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid year.' });
    return null;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Month must be between 1 and 12.' });
    return null;
  }
  return { year, month };
}

function monthDateRange(year, month) {
  return {
    gte: new Date(year, month - 1, 1),
    lte: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

const SLOT_SELECT = {
  id: true,
  faculty_id: true,
  duty_date: true,
  session_type: true,
  status: true,
  covered_by: true,
  created_by: true,
  created_at: true,
  updated_at: true,
  faculty: { select: { id: true, name: true, email: true, department: true, designation: true } },
};

// ─── GET /duty-slots/:year/:month ─────────────────────────────────────────────

async function getMonthSlots(req, res) {
  const params = parseYearMonth(req, res);
  if (!params) return;
  const { year, month } = params;

  const where = { duty_date: monthDateRange(year, month) };

  // Faculty only sees their own slots
  if (req.user.role === 'faculty') {
    where.faculty_id = req.user.id;
  }

  const slots = await prisma.dutySlot.findMany({
    where,
    select: SLOT_SELECT,
    orderBy: [{ duty_date: 'asc' }, { session_type: 'asc' }],
  });

  res.json({ data: slots, total: slots.length });
}

// ─── GET /duty-slots/available/:year/:month ───────────────────────────────────

async function getAvailableSlots(req, res) {
  const params = parseYearMonth(req, res);
  if (!params) return;
  const { year, month } = params;

  const config = await prisma.calendarConfig.findUnique({
    where: { config_month_config_year: { config_month: month, config_year: year } },
  });

  if (!config || !config.is_window_open) {
    return res.status(409).json({
      error: true,
      code: 'WINDOW_CLOSED',
      message: 'The scheduling window is not open for this month.',
    });
  }

  const workingDays = Array.isArray(config.working_days) ? config.working_days : [];

  if (workingDays.length === 0) {
    return res.json({ data: [], total: 0 });
  }

  // All slots already assigned for these working days
  const takenSlots = await prisma.dutySlot.findMany({
    where: {
      duty_date: { in: workingDays.map((d) => new Date(d)) },
    },
    select: { duty_date: true, session_type: true },
  });

  const takenSet = new Set(
    takenSlots.map((s) => `${s.duty_date.toISOString().slice(0, 10)}|${s.session_type}`),
  );

  const available = [];
  for (const dateStr of workingDays) {
    for (const session of ['morning', 'afternoon']) {
      if (!takenSet.has(`${dateStr}|${session}`)) {
        available.push({ duty_date: dateStr, session_type: session });
      }
    }
  }

  // Tell faculty how many more slots they can still pick
  const pickedCount = await prisma.dutySlot.count({
    where: { faculty_id: req.user.id, duty_date: monthDateRange(year, month) },
  });

  res.json({
    data: available,
    total: available.length,
    sessions_per_faculty: config.sessions_per_faculty,
    slots_picked: pickedCount,
    slots_remaining: Math.max(0, config.sessions_per_faculty - pickedCount),
  });
}

// ─── POST /duty-slots/pick ────────────────────────────────────────────────────

async function pickSlot(req, res) {
  const { duty_date, session_type } = req.body;

  const date = new Date(duty_date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const config = await prisma.calendarConfig.findUnique({
    where: { config_month_config_year: { config_month: month, config_year: year } },
  });

  if (!config || !config.is_window_open) {
    return res.status(409).json({
      error: true,
      code: 'WINDOW_CLOSED',
      message: 'The scheduling window is not currently open.',
    });
  }

  // Ensure the date is in working_days
  const workingDays = Array.isArray(config.working_days) ? config.working_days : [];
  if (!workingDays.includes(duty_date)) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_DATE',
      message: 'That date is not a scheduled working day.',
    });
  }

  // CRITICAL: Use transaction to prevent race conditions on limit check + slot creation
  try {
    const slot = await prisma.$transaction(async (tx) => {
      // Check faculty hasn't reached their session limit for the month (inside transaction)
      const pickedCount = await tx.dutySlot.count({
        where: { faculty_id: req.user.id, duty_date: monthDateRange(year, month) },
      });

      if (pickedCount >= config.sessions_per_faculty) {
        throw { code: 'LIMIT_REACHED', message: `You have already picked ${config.sessions_per_faculty} slot(s) for this month.` };
      }

      // Check slot isn't already taken (inside transaction)
      const existing = await tx.dutySlot.findFirst({
        where: { duty_date: date, session_type },
      });

      if (existing) {
        throw { code: 'SLOT_TAKEN', message: 'That slot has already been picked by another faculty member.' };
      }

      // Create slot atomically
      const newSlot = await tx.dutySlot.create({
        data: {
          faculty_id: req.user.id,
          duty_date: date,
          session_type,
          created_by: req.user.id,
        },
        select: SLOT_SELECT,
      });

      return newSlot;
    });

    res.status(201).json(slot);
  } catch (err) {
    // Handle Prisma duplicate key error (P2002) - slot taken by concurrent request
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: true,
        code: 'SLOT_TAKEN',
        message: 'That slot has already been picked by another faculty member. Please refresh and try another slot.',
      });
    }

    // Handle transaction-thrown conflict errors
    if (err.code === 'LIMIT_REACHED' || err.code === 'SLOT_TAKEN') {
      return res.status(409).json({
        error: true,
        code: err.code,
        message: err.message,
      });
    }

    // Unexpected error
    throw err;
  }
}

// ─── DELETE /duty-slots/:id/unpick ────────────────────────────────────────────

async function unpickSlot(req, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: req.params.id } });

  if (!slot) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
  }

  if (slot.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only unpick your own slots.' });
  }

  // Phase 2: Block unpick if status is not 'scheduled'
  if (slot.status !== 'scheduled') {
    return res.status(409).json({
      error: true,
      code: 'INVALID_SLOT_STATUS',
      message: `Cannot unpick a slot with status '${slot.status}'. Only 'scheduled' slots can be unpicked.`,
    });
  }

  const year = slot.duty_date.getFullYear();
  const month = slot.duty_date.getMonth() + 1;

  const config = await prisma.calendarConfig.findUnique({
    where: { config_month_config_year: { config_month: month, config_year: year } },
  });

  if (!config || !config.is_window_open) {
    return res.status(409).json({
      error: true,
      code: 'WINDOW_CLOSED',
      message: 'The scheduling window is closed. You can no longer unpick this slot.',
    });
  }

  // Prevent unpick if attendance has already been recorded
  const attendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });
  if (attendance) {
    return res.status(409).json({
      error: true,
      code: 'ATTENDANCE_EXISTS',
      message: 'Attendance has already been recorded for this slot.',
    });
  }

  // Phase 2: Block unpick if there are violations recorded for this slot
  const violations = await prisma.violation.findFirst({
    where: { duty_slot_id: slot.id },
  });
  if (violations) {
    return res.status(409).json({
      error: true,
      code: 'VIOLATIONS_EXIST',
      message: 'Cannot unpick a slot with recorded violations.',
    });
  }

  await prisma.dutySlot.delete({ where: { id: slot.id } });

  res.json({ message: 'Slot unpicked successfully.' });
}

// ─── POST /duty-slots/admin-assign ───────────────────────────────────────────

async function adminAssign(req, res) {
  const { faculty_id, duty_date, session_type } = req.body;

  const faculty = await prisma.user.findUnique({ where: { id: faculty_id } });
  if (!faculty || faculty.deleted_at || faculty.role !== 'faculty') {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Faculty member not found.' });
  }

  const date = new Date(duty_date);

  // Phase 2: Use transaction to prevent race condition on unique constraint
  try {
    const slot = await prisma.$transaction(async (tx) => {
      // Check if slot is already assigned (inside transaction)
      const existing = await tx.dutySlot.findFirst({
        where: { duty_date: date, session_type },
      });

      if (existing) {
        throw { code: 'SLOT_TAKEN', message: 'That slot is already assigned to another faculty member.' };
      }

      // Create slot atomically
      const newSlot = await tx.dutySlot.create({
        data: {
          faculty_id,
          duty_date: date,
          session_type,
          created_by: req.user.id,
        },
        select: SLOT_SELECT,
      });

      return newSlot;
    });

    res.status(201).json(slot);
  } catch (err) {
    // Handle Prisma unique constraint error (P2002) - slot taken by concurrent request
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: true,
        code: 'SLOT_TAKEN',
        message: 'That slot is already assigned to another faculty member. Please refresh and try again.',
      });
    }

    // Handle transaction-thrown conflict errors
    if (err.code === 'SLOT_TAKEN') {
      return res.status(409).json({
        error: true,
        code: err.code,
        message: err.message,
      });
    }

    // Unexpected error
    throw err;
  }
}

// ─── GET /duty-slots/:id ──────────────────────────────────────────────────────

async function getSlot(req, res) {
  const slot = await prisma.dutySlot.findUnique({
    where: { id: req.params.id },
    select: {
      ...SLOT_SELECT,
      attendance: true,
      coverRequests: { orderBy: { created_at: 'desc' }, take: 1 },
    },
  });

  if (!slot) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
  }

  // Faculty can only view their own slot
  if (req.user.role === 'faculty' && slot.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied.' });
  }

  res.json(slot);
}

module.exports = {
  getMonthSlots,
  getAvailableSlots,
  pickSlot,
  unpickSlot,
  adminAssign,
  getSlot,
};
