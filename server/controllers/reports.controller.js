const prisma = require('../lib/prisma');
const { buildWorkbook, sendWorkbook } = require('../lib/excel');

function monthRange(year, month) {
  return {
    gte: new Date(year, month - 1, 1),
    lte: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function yearRange(year) {
  return {
    gte: new Date(year, 0, 1),
    lte: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

// Shared filter builder for the student violation report + its export —
// year+month = one month, year alone = whole year, neither = all-time.
function studentViolationWhere({ student_id, year, month }) {
  const where = { record_status: 'active' };
  if (student_id) where.student_id = student_id;
  if (year && month) where.dutySlot = { duty_date: monthRange(parseInt(year, 10), parseInt(month, 10)) };
  else if (year)     where.dutySlot = { duty_date: yearRange(parseInt(year, 10)) };
  return where;
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

// Filename date suffix shared by every report export — monthly / yearly / all-time.
function dateSuffix({ year, month }) {
  return year && month ? `${year}-${String(month).padStart(2, '0')}` : year ? String(year) : 'all-time';
}

async function _getStudentViolations(where, { take } = {}) {
  return prisma.violation.findMany({
    where,
    include: {
      student:       { select: { registration_number: true, student_name: true, course: true } },
      faculty:       { select: { name: true } },
      violationType: { select: { name: true } },
      dutySlot:      { select: { duty_date: true } },
    },
    orderBy: { created_at: 'desc' },
    ...(take && { take }),
  });
}

// 6. Student Violation History
async function studentViolationHistory(req, res) {
  const where = studentViolationWhere(req.query);

  const [total, violations] = await Promise.all([
    prisma.violation.count({ where }),
    _getStudentViolations(where, { take: 200 }),
  ]);

  res.json({ data: violations, total, shown: violations.length });
}

// 6b. Student Violation History — Export (.xlsx, all matching rows, no cap, NO fine amounts)
async function studentViolationHistoryExport(req, res) {
  const where = studentViolationWhere(req.query);
  const violations = await _getStudentViolations(where);

  const buffer = await buildWorkbook('Student Violations', [
    { header: 'Registration Number',    key: 'reg_no',      width: 22 },
    { header: 'Student Name',           key: 'name',        width: 24 },
    { header: 'Course',                 key: 'course',      width: 12 },
    { header: 'Student Violation Type', key: 'type',        width: 22 },
    { header: 'Status',                 key: 'status',      width: 14 },
    { header: 'Faculty',                key: 'faculty',     width: 22 },
    { header: 'Duty Date',              key: 'duty_date',   width: 14 },
    { header: 'Recorded At',            key: 'created_at',  width: 18 },
  ], violations.map((v) => ({
    reg_no:     v.student?.registration_number,
    name:       v.student?.student_name,
    course:     v.student?.course,
    type:       v.violationType?.name,
    status:     v.is_warning_only ? 'Warning only' : 'Recorded',
    faculty:    v.faculty?.name,
    duty_date:  v.dutySlot?.duty_date ? new Date(v.dutySlot.duty_date).toLocaleDateString('en-IN') : '',
    created_at: new Date(v.created_at).toLocaleString('en-IN'),
  })));

  sendWorkbook(res, buffer, `student-violations-${dateSuffix(req.query)}.xlsx`);
}

// 6c. Daily Violation Report
async function dailyViolationReport(req, res) {
  const { date } = req.params; // YYYY-MM-DD format
  const d = new Date(`${date}T00:00:00Z`);
  const range = {
    gte: d,
    lte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
  };

  const violations = await _getStudentViolations({
    ...studentViolationWhere({}),
    dutySlot: { duty_date: range },
  });

  res.json({ date, data: violations, total: violations.length });
}

// 6d. Weekly Violation Report
async function weeklyViolationReport(req, res) {
  const { from_date, to_date } = req.query; // YYYY-MM-DD format
  const fromDate = new Date(`${from_date}T00:00:00Z`);
  const toDate = new Date(`${to_date}T23:59:59Z`);

  const range = { gte: fromDate, lte: toDate };

  const violations = await _getStudentViolations({
    ...studentViolationWhere({}),
    dutySlot: { duty_date: range },
  });

  res.json({ from_date, to_date, data: violations, total: violations.length });
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

  const summary = { total: slots.length, completed: 0, absent: 0, scheduled: 0, morning: 0, afternoon: 0 };
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

// 13. Duty Reassignment Report — history + per-faculty duty counts.
async function dutyReassignmentReport(req, res) {
  const year  = parseInt(req.query.year  ?? new Date().getFullYear(),  10);
  const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10);
  const range = monthRange(year, month);

  const reassignments = await prisma.dutyReassignment.findMany({
    where: { duty_date: range },
    orderBy: [{ duty_date: 'asc' }, { created_at: 'asc' }],
    select: {
      id: true,
      duty_date: true,
      session_type: true,
      reason: true,
      created_at: true,
      fromFaculty:  { select: { id: true, name: true } },
      toFaculty:    { select: { id: true, name: true } },
      reassignedBy: { select: { id: true, name: true } },
      dutySlot: {
        select: {
          status: true,
          attendance: { select: { in_time: true, out_time: true } },
        },
      },
    },
  });

  const history = reassignments.map((r) => ({
    id:            r.id,
    duty_date:     r.duty_date,
    session_type:  r.session_type,
    from_faculty:  r.fromFaculty,
    to_faculty:    r.toFaculty,
    reason:        r.reason,
    reassigned_by: r.reassignedBy,
    reassigned_at: r.created_at,
    final_status:  r.dutySlot.status,
    final_attendance: r.dutySlot.attendance
      ? (r.dutySlot.attendance.out_time ? 'checked_out' : r.dutySlot.attendance.in_time ? 'checked_in' : 'recorded')
      : 'none',
  }));

  // Per-faculty duty counts. Final = duties the faculty currently holds this
  // month; Received/Away = reassignments to/from them; Regular back-derives the
  // duties they originally held (Final = Regular + Received − Away).
  const faculty = await prisma.user.findMany({
    where:   { role: 'faculty', status: 'active', deleted_at: null },
    select:  { id: true, name: true, department: true },
    orderBy: { name: 'asc' },
  });

  const [finalCounts, receivedCounts, awayCounts] = await Promise.all([
    prisma.dutySlot.groupBy({ by: ['faculty_id'],      where: { duty_date: range }, _count: { id: true } }),
    prisma.dutyReassignment.groupBy({ by: ['to_faculty_id'],   where: { duty_date: range }, _count: { id: true } }),
    prisma.dutyReassignment.groupBy({ by: ['from_faculty_id'], where: { duty_date: range }, _count: { id: true } }),
  ]);
  const finalMap    = new Map(finalCounts.map(c => [c.faculty_id, c._count.id]));
  const receivedMap = new Map(receivedCounts.map(c => [c.to_faculty_id, c._count.id]));
  const awayMap     = new Map(awayCounts.map(c => [c.from_faculty_id, c._count.id]));

  const counts = faculty.map((f) => {
    const finalDuties = finalMap.get(f.id) ?? 0;
    const received    = receivedMap.get(f.id) ?? 0;
    const away        = awayMap.get(f.id) ?? 0;
    return {
      faculty_id: f.id,
      name:       f.name,
      department: f.department,
      regular:    finalDuties - received + away,
      received,
      away,
      final:      finalDuties,
    };
  });

  res.json({ year, month, history, total: history.length, counts });
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
  attendanceOverrideLog, studentViolationHistory, studentViolationHistoryExport, dailyViolationReport, weeklyViolationReport, facultyViolationActivity, violationTypeBreakdown,
  pendingFinesSummary, flaggedViolationsReport, monthlyDutyCoverage, unassignedFacultyReport,
  dutyReassignmentReport, sessionCompletionRate, studentUploadHistory, activeStudentRoster,
};
