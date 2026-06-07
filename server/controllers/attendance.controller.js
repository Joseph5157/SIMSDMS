const prisma = require('../lib/prisma');
const settingsService = require('../services/settings.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth() &&
    date.getDate()     === now.getDate()
  );
}

async function resolveInStatus(sessionType) {
  const now = new Date();
  const cfg = await settingsService.getSettings();
  const hour   = sessionType === 'morning' ? cfg.late_threshold_morning_hour   : cfg.late_threshold_afternoon_hour;
  const minute = sessionType === 'morning' ? cfg.late_threshold_morning_min    : cfg.late_threshold_afternoon_min;
  const thresholdMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime();
  return now.getTime() > thresholdMs ? 'late' : 'normal';
}

async function findSlotForFaculty(slotId, facultyId, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: slotId } });
  if (!slot) {
    res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
    return null;
  }
  if (slot.faculty_id !== facultyId) {
    res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'This is not your duty slot.' });
    return null;
  }
  return slot;
}

// ─── POST /attendance/:dutySlotId/check-in ────────────────────────────────────

async function checkIn(req, res) {
  const slot = await findSlotForFaculty(req.params.dutySlotId, req.user.id, res);
  if (!slot) return;

  if (!isToday(slot.duty_date)) {
    return res.status(409).json({
      error: true,
      code: 'WRONG_DATE',
      message: 'You can only check in on your scheduled duty date.',
    });
  }

  const existing = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });

  if (existing?.in_time) {
    return res.status(409).json({
      error: true,
      code: 'ALREADY_CHECKED_IN',
      message: 'You have already checked in for this duty slot.',
    });
  }

  const in_status = await resolveInStatus(slot.session_type);

  let attendance;
  if (existing) {
    attendance = await prisma.dutyAttendance.update({
      where: { id: existing.id },
      data: { in_time: new Date(), in_status },
    });
  } else {
    attendance = await prisma.dutyAttendance.create({
      data: {
        duty_slot_id: slot.id,
        faculty_id: req.user.id,
        in_time: new Date(),
        in_status,
      },
    });
  }

  res.status(201).json(attendance);
}

// ─── POST /attendance/:dutySlotId/check-out ───────────────────────────────────

async function checkOut(req, res) {
  const slot = await findSlotForFaculty(req.params.dutySlotId, req.user.id, res);
  if (!slot) return;

  const attendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });

  if (!attendance?.in_time) {
    return res.status(409).json({
      error: true,
      code: 'NOT_CHECKED_IN',
      message: 'You must check in before checking out.',
    });
  }

  if (attendance.out_time) {
    return res.status(409).json({
      error: true,
      code: 'ALREADY_CHECKED_OUT',
      message: 'You have already checked out for this duty slot.',
    });
  }

  const updated = await prisma.dutyAttendance.update({
    where: { id: attendance.id },
    data: { out_time: new Date(), out_status: 'normal' },
  });

  await prisma.dutySlot.update({
    where: { id: slot.id },
    data: { status: 'completed' },
  });

  res.json(updated);
}

// ─── GET /attendance/live ─────────────────────────────────────────────────────

async function getLive(req, res) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const slots = await prisma.dutySlot.findMany({
    where: { duty_date: { gte: todayStart, lte: todayEnd } },
    include: {
      faculty: { select: { id: true, name: true, email: true, department: true } },
      attendance: true,
    },
    orderBy: [{ session_type: 'asc' }, { faculty: { name: 'asc' } }],
  });

  const result = slots.map((s) => ({
    slot_id: s.id,
    faculty: s.faculty,
    duty_date: s.duty_date,
    session_type: s.session_type,
    slot_status: s.status,
    attendance_status: !s.attendance
      ? 'not_checked_in'
      : s.attendance.out_time
      ? 'checked_out'
      : 'checked_in',
    in_time:    s.attendance?.in_time  ?? null,
    out_time:   s.attendance?.out_time ?? null,
    in_status:  s.attendance?.in_status  ?? null,
    out_status: s.attendance?.out_status ?? null,
    auto_out:   s.attendance?.auto_out   ?? false,
  }));

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  res.json({
    date: dateStr,
    total: result.length,
    data: result,
  });
}

// ─── GET /attendance/:dutySlotId ──────────────────────────────────────────────

async function getAttendance(req, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: req.params.dutySlotId } });
  if (!slot) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
  }

  if (req.user.role === 'faculty' && slot.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied.' });
  }

  const attendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });
  if (!attendance) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'No attendance record for this slot yet.' });
  }

  res.json(attendance);
}

// ─── PATCH /attendance/:dutySlotId/override ───────────────────────────────────

async function overrideAttendance(req, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: req.params.dutySlotId } });
  if (!slot) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
  }

  let attendance = await prisma.dutyAttendance.findUnique({ where: { duty_slot_id: slot.id } });

  const { in_time, out_time, in_status, out_status, override_reason } = req.body;

  const data = {
    overridden_by: req.user.id,
    override_reason,
    ...(in_time    !== undefined && { in_time:    new Date(in_time) }),
    ...(out_time   !== undefined && { out_time:   new Date(out_time) }),
    ...(in_status  !== undefined && { in_status }),
    ...(out_status !== undefined && { out_status }),
  };

  if (attendance) {
    attendance = await prisma.dutyAttendance.update({ where: { id: attendance.id }, data });
  } else {
    attendance = await prisma.dutyAttendance.create({
      data: { duty_slot_id: slot.id, faculty_id: slot.faculty_id, ...data },
    });
  }

  // If out_time is being set, mark the slot as completed
  if (out_time) {
    await prisma.dutySlot.update({ where: { id: slot.id }, data: { status: 'completed' } });
  }

  res.json(attendance);
}

module.exports = { checkIn, checkOut, getLive, getAttendance, overrideAttendance };
