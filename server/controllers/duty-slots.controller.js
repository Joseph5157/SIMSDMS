const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

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
    return res.json({
      data: [],
      total: 0,
      sessions_per_faculty: config.sessions_per_faculty,
      slots_picked: 0,
      slots_remaining: config.sessions_per_faculty,
    });
  }

  const takenSlots = await prisma.dutySlot.findMany({
    where: { duty_date: { in: workingDays.map((d) => new Date(d)) } },
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
// Session limit check and slot creation run inside a single transaction so
// concurrent picks from the same faculty cannot exceed the monthly limit, and
// the DB unique constraint on (duty_date, session_type) is the final guard
// against two faculty racing for the same slot.

async function pickSlot(req, res) {
  const { duty_date, session_type } = req.body;

  const date = new Date(duty_date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Read-only checks outside the transaction
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

  const workingDays = Array.isArray(config.working_days) ? config.working_days : [];
  if (!workingDays.includes(duty_date)) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_DATE',
      message: 'That date is not a scheduled working day.',
    });
  }

  try {
    const slot = await prisma.$transaction(async (tx) => {
      // Count inside the transaction so a concurrent pick from the same account
      // cannot bypass the session limit between our check and our insert.
      const pickedCount = await tx.dutySlot.count({
        where: { faculty_id: req.user.id, duty_date: monthDateRange(year, month) },
      });

      if (pickedCount >= config.sessions_per_faculty) {
        const err = new Error('Session limit reached.');
        err.code = 'LIMIT_REACHED';
        throw err;
      }

      // The DB unique constraint on (duty_date, session_type) raises P2002 if
      // another faculty member created this slot concurrently.
      return tx.dutySlot.create({
        data: {
          faculty_id: req.user.id,
          duty_date: date,
          session_type,
          created_by: req.user.id,
        },
        select: SLOT_SELECT,
      });
    });

    return res.status(201).json(slot);
  } catch (err) {
    if (err.code === 'LIMIT_REACHED') {
      return res.status(409).json({
        error: true,
        code: 'LIMIT_REACHED',
        message: `You have already picked ${config.sessions_per_faculty} slot(s) for this month.`,
      });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: true,
        code: 'SLOT_TAKEN',
        message: 'This slot is already taken.',
      });
    }
    logger.error(`pickSlot error: ${err.message}`);
    return res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
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

  // Only scheduled slots can be unpicked — cover_pending/covered/completed/absent
  // all indicate activity that prevents removal.
  if (slot.status !== 'scheduled') {
    return res.status(409).json({
      error: true,
      code: 'SLOT_NOT_UNPICKABLE',
      message: `This slot cannot be unpicked because its status is '${slot.status}'.`,
    });
  }

  const attendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });
  if (attendance) {
    return res.status(409).json({
      error: true,
      code: 'ATTENDANCE_EXISTS',
      message: 'Attendance has already been recorded for this slot.',
    });
  }

  const violationCount = await prisma.violation.count({ where: { duty_slot_id: slot.id } });
  if (violationCount > 0) {
    return res.status(409).json({
      error: true,
      code: 'VIOLATIONS_EXIST',
      message: 'Student violations have been recorded for this slot and it cannot be removed.',
    });
  }

  await prisma.dutySlot.delete({ where: { id: slot.id } });

  res.json({ message: 'Slot unpicked successfully.' });
}

// ─── POST /duty-slots/admin-assign ───────────────────────────────────────────
// Uses the DB unique constraint on (duty_date, session_type) as the definitive
// guard and wraps the existence check + insert in a transaction.

async function adminAssign(req, res) {
  const { faculty_id, duty_date, session_type } = req.body;

  const faculty = await prisma.user.findUnique({ where: { id: faculty_id } });
  if (!faculty || faculty.deleted_at || faculty.role !== 'faculty') {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Faculty member not found.' });
  }

  const date = new Date(duty_date);

  try {
    const slot = await prisma.$transaction(async (tx) => {
      const existing = await tx.dutySlot.findUnique({
        where: { duty_date_session_type: { duty_date: date, session_type } },
      });
      if (existing) {
        const err = new Error('Slot already taken.');
        err.code = 'SLOT_TAKEN';
        throw err;
      }
      return tx.dutySlot.create({
        data: { faculty_id, duty_date: date, session_type, created_by: req.user.id },
        select: SLOT_SELECT,
      });
    });

    return res.status(201).json(slot);
  } catch (err) {
    if (err.code === 'SLOT_TAKEN' || err.code === 'P2002') {
      return res.status(409).json({
        error: true,
        code: 'SLOT_TAKEN',
        message: 'This slot is already taken.',
      });
    }
    logger.error(`adminAssign error: ${err.message}`);
    return res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
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
