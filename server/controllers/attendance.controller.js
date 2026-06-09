const prisma = require('../lib/prisma');
const settingsService = require('../services/settings.service');
const { nowInIST, istDayRangeUTC, isSlotToday, istWallToUTC } = require('../lib/time');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Calculates in_status ('normal' or 'late') against the configured IST threshold.
async function resolveInStatus(sessionType) {
  const cfg = await settingsService.getSettings();
  const thresholdHour   = sessionType === 'morning'
    ? cfg.late_threshold_morning_hour
    : cfg.late_threshold_afternoon_hour;
  const thresholdMinute = sessionType === 'morning'
    ? cfg.late_threshold_morning_min
    : cfg.late_threshold_afternoon_min;
  const ist        = nowInIST();
  const threshold  = istWallToUTC(ist.year, ist.month, ist.day, thresholdHour, thresholdMinute);
  return new Date() > threshold ? 'late' : 'normal';
}

// Fetches the duty slot and verifies the requesting faculty is either the
// originally assigned faculty OR the confirmed covering faculty.
async function resolveSlotForFaculty(slotId, facultyId, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: slotId } });
  if (!slot) {
    res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
    return null;
  }
  if (slot.faculty_id !== facultyId && slot.covered_by !== facultyId) {
    res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'This is not your duty slot.' });
    return null;
  }
  return slot;
}

// ─── POST /attendance/:dutySlotId/check-in ────────────────────────────────────

async function checkIn(req, res) {
  const slot = await resolveSlotForFaculty(req.params.dutySlotId, req.user.id, res);
  if (!slot) return;

  if (!isSlotToday(slot.duty_date)) {
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

  // faculty_id is the actual performer (covering faculty if covered, original if not)
  let attendance;
  if (existing) {
    attendance = await prisma.dutyAttendance.update({
      where: { id: existing.id },
      data:  { in_time: new Date(), in_status },
    });
  } else {
    attendance = await prisma.dutyAttendance.create({
      data: {
        duty_slot_id: slot.id,
        faculty_id:   req.user.id,
        in_time:      new Date(),
        in_status,
      },
    });
  }

  res.status(201).json(attendance);
}

// ─── POST /attendance/:dutySlotId/check-out ───────────────────────────────────

async function checkOut(req, res) {
  const slot = await resolveSlotForFaculty(req.params.dutySlotId, req.user.id, res);
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
    data:  { out_time: new Date(), out_status: 'normal' },
  });

  await prisma.dutySlot.update({
    where: { id: slot.id },
    data:  { status: 'completed' },
  });

  res.json(updated);
}

// ─── GET /attendance/live ─────────────────────────────────────────────────────
// Live admin dashboard for the current duty day.
// Includes covering_faculty so the admin can see who is actually performing
// a covered slot, and performed_by_id which is the attendance record's faculty.

async function getLive(req, res) {
  const ist       = nowInIST();
  const todayRange = istDayRangeUTC(ist.year, ist.month, ist.day);

  const slots = await prisma.dutySlot.findMany({
    where: { duty_date: todayRange },
    include: {
      faculty:         { select: { id: true, name: true, email: true, department: true } },
      coveringFaculty: { select: { id: true, name: true, email: true, department: true } },
      attendance: true,
    },
    orderBy: [{ session_type: 'asc' }, { faculty: { name: 'asc' } }],
  });

  const result = slots.map((s) => ({
    slot_id:          s.id,
    faculty:          s.faculty,
    // Non-null only when DutySlot.covered_by is set (i.e. cover was confirmed).
    // Distinguishes original assigned faculty from the person physically on duty.
    covering_faculty: s.coveringFaculty ?? null,
    // ID of the person whose check-in was recorded (the actual duty performer).
    performed_by_id:  s.attendance?.faculty_id ?? null,
    duty_date:        s.duty_date,
    session_type:     s.session_type,
    slot_status:      s.status,
    attendance_status: !s.attendance
      ? 'not_checked_in'
      : s.attendance.out_time
      ? 'checked_out'
      : 'checked_in',
    in_time:    s.attendance?.in_time    ?? null,
    out_time:   s.attendance?.out_time   ?? null,
    in_status:  s.attendance?.in_status  ?? null,
    out_status: s.attendance?.out_status ?? null,
    auto_out:   s.attendance?.auto_out   ?? false,
  }));

  const pad = (n) => String(n).padStart(2, '0');
  res.json({
    date:  `${ist.year}-${pad(ist.month)}-${pad(ist.day)}`,
    total: result.length,
    data:  result,
  });
}

// ─── GET /attendance/:dutySlotId ──────────────────────────────────────────────

async function getAttendance(req, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: req.params.dutySlotId } });
  if (!slot) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
  }

  // Faculty can view attendance for slots they are assigned to or confirmed to cover.
  if (
    req.user.role === 'faculty' &&
    slot.faculty_id !== req.user.id &&
    slot.covered_by !== req.user.id
  ) {
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
    overridden_by:   req.user.id,
    override_reason,
    ...(in_time    !== undefined && { in_time:    new Date(in_time) }),
    ...(out_time   !== undefined && { out_time:   new Date(out_time) }),
    ...(in_status  !== undefined && { in_status }),
    ...(out_status !== undefined && { out_status }),
  };

  if (attendance) {
    attendance = await prisma.dutyAttendance.update({ where: { id: attendance.id }, data });
  } else {
    // When creating from scratch, use the slot's faculty_id as the record owner.
    // Covered slots retain the original faculty as the administrative record holder.
    attendance = await prisma.dutyAttendance.create({
      data: { duty_slot_id: slot.id, faculty_id: slot.faculty_id, ...data },
    });
  }

  if (out_time) {
    await prisma.dutySlot.update({ where: { id: slot.id }, data: { status: 'completed' } });
  }

  res.json(attendance);
}

module.exports = { checkIn, checkOut, getLive, getAttendance, overrideAttendance };
