const prisma = require('../lib/prisma');

function monthRange(year, month) {
  return {
    gte: new Date(year, month - 1, 1),
    lte: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

// 1. Monthly Faculty Attendance Summary
async function monthlyAttendanceSummary(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);
  const range = monthRange(year, month);

  const slots = await prisma.dutySlot.findMany({
    where: { duty_date: range },
    include: {
      faculty:    { select: { id: true, name: true, department: true } },
      attendance: true,
    },
  });

  const map = new Map();
  for (const s of slots) {
    const key = s.faculty_id;
    if (!map.has(key)) map.set(key, { faculty: s.faculty, total: 0, completed: 0, absent: 0, late: 0, auto_out: 0 });
    const r = map.get(key);
    r.total++;
    if (s.status === 'absent' || s.attendance?.in_status === 'absent') r.absent++;
    else r.completed++;
    if (s.attendance?.in_status === 'late')  r.late++;
    if (s.attendance?.auto_out)              r.auto_out++;
  }

  res.json({ year, month, data: Array.from(map.values()) });
}

// 2. Late Arrival Report
async function lateArrivalReport(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const records = await prisma.dutyAttendance.findMany({
    where: { in_status: 'late', dutySlot: { duty_date: monthRange(year, month) } },
    include: {
      faculty:  { select: { id: true, name: true, department: true } },
      dutySlot: { select: { duty_date: true, session_type: true } },
    },
    orderBy: { dutySlot: { duty_date: 'asc' } },
  });

  res.json({ year, month, data: records, total: records.length });
}

// 3. Absent Faculty Report
async function absentFacultyReport(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const slots = await prisma.dutySlot.findMany({
    where: {
      duty_date: monthRange(year, month),
      OR: [{ status: 'absent' }, { attendance: { in_status: 'absent' } }],
    },
    include: { faculty: { select: { id: true, name: true, department: true } } },
    orderBy: { duty_date: 'asc' },
  });

  res.json({ year, month, data: slots, total: slots.length });
}

// 4. Auto Clock-out Report
async function autoClockOutReport(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const records = await prisma.dutyAttendance.findMany({
    where: { auto_out: true, dutySlot: { duty_date: monthRange(year, month) } },
    include: {
      faculty:  { select: { id: true, name: true } },
      dutySlot: { select: { duty_date: true, session_type: true } },
    },
    orderBy: { dutySlot: { duty_date: 'asc' } },
  });

  res.json({ year, month, data: records, total: records.length });
}

// 5. Attendance Override Log
async function attendanceOverrideLog(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const records = await prisma.dutyAttendance.findMany({
    where: { overridden_by: { not: null }, dutySlot: { duty_date: monthRange(year, month) } },
    include: {
      faculty:     { select: { id: true, name: true } },
      dutySlot:    { select: { duty_date: true, session_type: true } },
      overriddenBy: { select: { id: true, name: true } },
    },
    orderBy: { dutySlot: { duty_date: 'asc' } },
  });

  res.json({ year, month, data: records, total: records.length });
}

// 6. Student Violation History
async function studentViolationHistory(req, res) {
  const { student_id, year, month } = req.query;
  const where = { record_status: 'active' };
  if (student_id) where.student_id = student_id;
  if (year && month) where.dutySlot = { duty_date: monthRange(parseInt(year,10), parseInt(month,10)) };

  const violations = await prisma.violation.findMany({
    where,
    include: {
      student:       { select: { registration_number: true, student_name: true, course: true } },
      faculty:       { select: { name: true } },
      violationType: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 200,
  });

  res.json({ data: violations, total: violations.length });
}

// 7. Faculty Violation Activity
async function facultyViolationActivity(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const grouped = await prisma.violation.groupBy({
    by: ['faculty_id'],
    where: { created_at: monthRange(year, month), record_status: 'active' },
    _count: { id: true },
    _sum:   { fine_amount: true },
  });

  const facultyIds = grouped.map(g => g.faculty_id);
  const faculty = await prisma.user.findMany({
    where: { id: { in: facultyIds } },
    select: { id: true, name: true, department: true },
  });
  const fMap = new Map(faculty.map(f => [f.id, f]));

  const data = grouped.map(g => ({
    faculty: fMap.get(g.faculty_id),
    violation_count: g._count.id,
    total_fines: g._sum.fine_amount,
  })).sort((a, b) => b.violation_count - a.violation_count);

  res.json({ year, month, data });
}

// 8. Violation Type Breakdown
async function violationTypeBreakdown(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const grouped = await prisma.violation.groupBy({
    by: ['violation_type_id'],
    where: { created_at: monthRange(year, month), record_status: 'active' },
    _count: { id: true },
    _sum:   { fine_amount: true },
  });

  const typeIds = grouped.map(g => g.violation_type_id);
  const types = await prisma.violationType.findMany({ where: { id: { in: typeIds } }, select: { id: true, name: true } });
  const tMap = new Map(types.map(t => [t.id, t]));

  const data = grouped.map(g => ({
    type: tMap.get(g.violation_type_id),
    count: g._count.id,
    total_fines: g._sum.fine_amount,
  })).sort((a, b) => b.count - a.count);

  res.json({ year, month, data });
}

// 9. Pending Fines Summary
async function pendingFinesSummary(req, res) {
  const violations = await prisma.violation.findMany({
    where: { record_status: 'active', is_warning_only: false, fine_amount: { gt: 0 } },
    include: {
      student:       { select: { registration_number: true, student_name: true, course: true, semester_or_year: true } },
      violationType: { select: { name: true } },
    },
    orderBy: { fine_amount: 'desc' },
    take: 200,
  });

  const totalFines = violations.reduce((sum, v) => sum + Number(v.fine_amount), 0);
  res.json({ data: violations, total: violations.length, total_fine_amount: totalFines.toFixed(2) });
}

// 10. Flagged Violations Report
// Queries ALL ever-flagged violations: currently pending (is_flagged=true) AND
// previously resolved (flag_resolved_at IS NOT NULL, is_flagged=false after resolution).
// Counting only is_flagged=true would always show resolved_count=0.
async function flaggedViolationsReport(req, res) {
  const violations = await prisma.violation.findMany({
    where: {
      OR: [
        { is_flagged: true },
        { flag_resolved_at: { not: null } },
      ],
    },
    include: {
      student:       { select: { student_name: true, registration_number: true } },
      faculty:       { select: { name: true } },
      violationType: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const pending  = violations.filter((v) => v.is_flagged);
  const resolved = violations.filter((v) => v.flag_resolved_at !== null);

  res.json({ data: violations, total: violations.length, pending_count: pending.length, resolved_count: resolved.length });
}

// 11. Monthly Duty Coverage
async function monthlyDutyCoverage(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const slots = await prisma.dutySlot.findMany({
    where: { duty_date: monthRange(year, month) },
    select: { status: true, session_type: true },
  });

  const summary = { total: slots.length, completed: 0, absent: 0, cover_pending: 0, covered: 0, scheduled: 0, morning: 0, afternoon: 0 };
  for (const s of slots) {
    summary[s.status]       = (summary[s.status]       ?? 0) + 1;
    summary[s.session_type] = (summary[s.session_type] ?? 0) + 1;
  }
  summary.completion_rate = summary.total ? ((summary.completed / summary.total) * 100).toFixed(1) : '0.0';

  res.json({ year, month, ...summary });
}

// 12. Unassigned Faculty Report
async function unassignedFacultyReport(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const config = await prisma.calendarConfig.findUnique({
    where: { config_month_config_year: { config_month: month, config_year: year } },
  });
  const required = config?.sessions_per_faculty ?? 3;

  const allFaculty = await prisma.user.findMany({
    where: { role: 'faculty', status: 'active', deleted_at: null },
    select: { id: true, name: true, department: true, email: true },
  });

  const counts = await prisma.dutySlot.groupBy({
    by: ['faculty_id'],
    where: { duty_date: monthRange(year, month) },
    _count: { id: true },
  });
  const countMap = new Map(counts.map(c => [c.faculty_id, c._count.id]));

  const unassigned = allFaculty
    .filter(f => (countMap.get(f.id) ?? 0) < required)
    .map(f => ({ ...f, slots_picked: countMap.get(f.id) ?? 0, required }));

  res.json({ year, month, data: unassigned, total: unassigned.length, sessions_required: required });
}

// 13. Cover Request Summary
async function coverRequestSummary(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);

  const requests = await prisma.coverRequest.findMany({
    where: { dutySlot: { duty_date: monthRange(year, month) } },
    select: { status: true, created_at: true, confirmed_at: true },
  });

  const summary = { total: requests.length, open: 0, covered: 0, expired: 0, cancelled: 0 };
  for (const r of requests) summary[r.status] = (summary[r.status] ?? 0) + 1;
  summary.fulfillment_rate = requests.length ? ((summary.covered / requests.length) * 100).toFixed(1) : '0.0';

  res.json({ year, month, ...summary });
}

// 14. Session Completion Rate (last 6 months)
async function sessionCompletionRate(req, res) {
  const now  = new Date();
  const data = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const range = monthRange(y, m);

    const [total, completed] = await Promise.all([
      prisma.dutySlot.count({ where: { duty_date: range } }),
      prisma.dutySlot.count({ where: { duty_date: range, status: 'completed' } }),
    ]);

    data.push({ year: y, month: m, total, completed, rate: total ? ((completed / total) * 100).toFixed(1) : '0.0' });
  }

  res.json({ data });
}

// 15. Student Upload History
async function studentUploadHistory(req, res) {
  const logs = await prisma.studentUploadLog.findMany({
    orderBy: { uploaded_at: 'desc' },
    take: 50,
    include: { uploader: { select: { name: true, email: true } } },
  });

  res.json({ data: logs, total: logs.length });
}

// 16. Active Student Roster
async function activeStudentRoster(req, res) {
  const { course, semester_or_year } = req.query;
  const where = { status: 'active', deleted_at: null };
  if (course)           where.course           = course;
  if (semester_or_year) where.semester_or_year = semester_or_year;

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ course: 'asc' }, { semester_or_year: 'asc' }, { student_name: 'asc' }],
  });

  // Breakdown by course
  const breakdown = {};
  for (const s of students) {
    const key = `${s.course} · ${s.semester_or_year}`;
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  }

  res.json({ data: students, total: students.length, breakdown });
}

module.exports = {
  monthlyAttendanceSummary, lateArrivalReport, absentFacultyReport, autoClockOutReport,
  attendanceOverrideLog, studentViolationHistory, facultyViolationActivity, violationTypeBreakdown,
  pendingFinesSummary, flaggedViolationsReport, monthlyDutyCoverage, unassignedFacultyReport,
  coverRequestSummary, sessionCompletionRate, studentUploadHistory, activeStudentRoster,
};
