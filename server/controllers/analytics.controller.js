const prisma = require('../lib/prisma');
const { buildWorkbook, sendWorkbook } = require('../lib/excel');
const { buildReportPdf, sendPdf } = require('../lib/pdf');
const { instantMonthRange, instantSpanRange, parseYMD } = require('../lib/reportRange');
const { nowInIST } = require('../lib/time');
const settingsService = require('../services/settings.service');
const { COURSE_LABELS } = require('../lib/academicStructure');

// Monday–Sunday range containing `now`.
function weekRange(now) {
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { gte: monday, lte: sunday };
}

// range preset (default this_month) or an explicit custom from/to pair. All
// presets resolve against IST wall-clock boundaries (created_at is a timestamptz
// instant), independent of the process TZ. (ADMIN-HIGH-003)
function resolveDateRange({ range, from_date, to_date }) {
  const ist = nowInIST();
  if (range === 'custom' && from_date && to_date) {
    return instantSpanRange(parseYMD(from_date), parseYMD(to_date));
  }
  if (range === 'this_week') return weekRange(new Date());
  if (range === 'last_month') {
    const y = ist.month === 1 ? ist.year - 1 : ist.year;
    const m = ist.month === 1 ? 12 : ist.month - 1;
    return instantMonthRange(y, m);
  }
  return instantMonthRange(ist.year, ist.month);
}

// The dynamic, non-date filters shared by every endpoint — dynamic per the P24
// spec (violation type, course, year come from real data, never hardcoded).
function extraFilters({ violation_type_id, course, year, academic_year }) {
  const where = {};
  if (violation_type_id) where.violation_type_id = violation_type_id;
  const studentFilter = {};
  if (course)        studentFilter.course        = course;
  if (year)          studentFilter.year           = year;
  if (academic_year) studentFilter.academic_year = academic_year;
  if (Object.keys(studentFilter).length) where.student = studentFilter;
  return where;
}

function analyticsWhere(query) {
  return { record_status: 'active', deleted_at: null, created_at: resolveDateRange(query), ...extraFilters(query) };
}

// 1. Dashboard Summary Cards
async function summary(req, res) {
  const where = analyticsWhere(req.query);
  const { repeat_violation_threshold: threshold } = await settingsService.getSettings();

  const [total, byStudent, byType] = await Promise.all([
    prisma.violation.count({ where }),
    prisma.violation.groupBy({ by: ['student_id'], where, _count: { id: true } }),
    prisma.violation.groupBy({ by: ['violation_type_id'], where, _count: { id: true } }),
  ]);

  let mostCommon = null;
  if (byType.length) {
    const top = byType.reduce((a, b) => (b._count.id > a._count.id ? b : a));
    const type = await prisma.violationType.findUnique({ where: { id: top.violation_type_id }, select: { name: true } });
    mostCommon = { type: type?.name ?? 'Unknown', count: top._count.id };
  }

  res.json({
    total_violations:      total,
    students_affected:     byStudent.length,
    repeat_violators_count: byStudent.filter((g) => g._count.id >= threshold).length,
    most_common:           mostCommon,
  });
}

// 2. Violation Trend — counts per month for the trailing N months (default 6),
// independent of the date-range filter (trend is inherently multi-period);
// course/year/academic_year/violation_type filters still apply.
async function trend(req, res) {
  const months = req.query.months ?? 6;
  const base   = extraFilters(req.query);
  const ist    = nowInIST();

  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    // Step back i whole months from the current IST month; UTC month overflow
    // normalises year rollover.
    const d = new Date(Date.UTC(ist.year, ist.month - 1 - i, 1));
    const year = d.getUTCFullYear(), month = d.getUTCMonth() + 1;
    const count = await prisma.violation.count({
      where: { ...base, record_status: 'active', deleted_at: null, created_at: instantMonthRange(year, month) },
    });
    data.push({ year, month, count });
  }

  res.json({ data });
}

// 3. Violation Type Analysis — bar chart data, dynamic types, respects all filters.
async function violationTypeAnalysis(req, res) {
  const where = analyticsWhere(req.query);

  const grouped = await prisma.violation.groupBy({
    by: ['violation_type_id'],
    where,
    _count: { id: true },
  });

  const types = await prisma.violationType.findMany({
    where: { id: { in: grouped.map((g) => g.violation_type_id) } },
    select: { id: true, name: true },
  });
  const tMap = new Map(types.map((t) => [t.id, t.name]));

  const data = grouped
    .map((g) => ({ violation_type_id: g.violation_type_id, name: tMap.get(g.violation_type_id) ?? 'Unknown', count: g._count.id }))
    .sort((a, b) => b.count - a.count);

  res.json({ data });
}

// Shared computation for the repeat-violators list — used by both the JSON
// endpoint and the counselling-list Excel export so the two never drift.
async function computeRepeatViolators(query) {
  const where = analyticsWhere(query);
  const { repeat_violation_threshold: threshold } = await settingsService.getSettings();

  const grouped = await prisma.violation.groupBy({ by: ['student_id'], where, _count: { id: true } });
  const repeatIds = grouped.filter((g) => g._count.id >= threshold).map((g) => g.student_id);

  if (!repeatIds.length) return { data: [], threshold };

  const [students, violations] = await Promise.all([
    prisma.student.findMany({
      where:  { id: { in: repeatIds } },
      select: { id: true, student_name: true, registration_number: true, course: true, year: true },
    }),
    prisma.violation.findMany({
      where:  { ...where, student_id: { in: repeatIds } },
      select: { student_id: true, created_at: true, violationType: { select: { name: true } } },
    }),
  ]);

  const countMap = new Map(grouped.map((g) => [g.student_id, g._count.id]));
  const typeCountByStudent = new Map();
  const lastViolationByStudent = new Map();
  for (const v of violations) {
    if (!typeCountByStudent.has(v.student_id)) typeCountByStudent.set(v.student_id, new Map());
    const m = typeCountByStudent.get(v.student_id);
    const name = v.violationType?.name ?? 'Other';
    m.set(name, (m.get(name) ?? 0) + 1);

    const prevLast = lastViolationByStudent.get(v.student_id);
    if (!prevLast || v.created_at > prevLast) lastViolationByStudent.set(v.student_id, v.created_at);
  }

  const data = students
    .map((s) => {
      const typeCounts = typeCountByStudent.get(s.id);
      let mainIssue = null, max = 0;
      for (const [name, c] of typeCounts ?? []) if (c > max) { max = c; mainIssue = name; }
      return {
        student_id:           s.id,
        student_name:         s.student_name,
        registration_number:  s.registration_number,
        course:               s.course,
        year:                 s.year,
        violation_count:      countMap.get(s.id),
        main_issue:           mainIssue,
        _last_violation_at:   lastViolationByStudent.get(s.id),
      };
    })
    // Smart sort: total violation count descending, then most recent violation date
    // descending as a tiebreaker. No severity criterion — violation_types has no
    // severity field, out of scope for this batch.
    .sort((a, b) => b.violation_count - a.violation_count || b._last_violation_at - a._last_violation_at)
    .map(({ _last_violation_at, ...rest }) => rest);

  return { data, threshold };
}

// 4. Repeat Violators — students above the threshold, with their most frequent
// violation type ("main issue"), sorted by violation count descending, then by
// most recent violation date descending as a tiebreaker.
async function repeatViolators(req, res) {
  const { data, threshold } = await computeRepeatViolators(req.query);
  res.json({ data, total: data.length, threshold });
}

// 6. Course-Wise Violation Analysis — bar chart data. `course` lives on Student,
// not Violation, so this can't be a Prisma groupBy; aggregated in JS instead
// (bounded by the same date-range/filter set as every other endpoint here).
async function courseAnalysis(req, res) {
  const where = analyticsWhere(req.query);
  const violations = await prisma.violation.findMany({ where, select: { student: { select: { course: true } } } });

  const counts = new Map();
  for (const v of violations) {
    const c = v.student?.course ?? 'Unknown';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  const data = Array.from(counts, ([course, count]) => ({ course, count })).sort((a, b) => b.count - a.count);
  res.json({ data });
}

// 7. Academic Year-Wise Violation Analysis — grouped by (course, year) so the
// chart can show which programme each year belongs to (B.Pharm/Pharm.D/M.Pharm
// have different year ranges — see lib/academicStructure.js). Same
// JS-aggregation reasoning as courseAnalysis above.
async function yearAnalysis(req, res) {
  const where = analyticsWhere(req.query);
  const violations = await prisma.violation.findMany({ where, select: { student: { select: { course: true, year: true } } } });

  const counts = new Map(); // key: `${course}|${year}`
  for (const v of violations) {
    const course = v.student?.course ?? 'unknown';
    const year   = v.student?.year ?? 0;
    const key    = `${course}|${year}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const data = Array.from(counts, ([key, count]) => {
    const [course, year] = key.split('|');
    return { course, year: Number(year), count };
  }).sort((a, b) => a.course.localeCompare(b.course) || a.year - b.year);

  res.json({ data });
}

// 8. Faculty Recording Analysis — how many violations each faculty recorded.
// `faculty_id` lives on Violation directly, so a groupBy works here.
async function facultyAnalysis(req, res) {
  const where = analyticsWhere(req.query);
  const grouped = await prisma.violation.groupBy({ by: ['faculty_id'], where, _count: { id: true } });

  const faculty = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.faculty_id) } },
    select: { id: true, name: true, department: true, role: true },
  });
  const fMap = new Map(faculty.map((f) => [f.id, f]));

  // A recorder may be an admin (unrestricted recording) or a faculty member.
  // Admin recorders surface as "Admin" per the discipline-oversight model.
  const recorderName = (u) => (u?.role === 'admin' || u?.role === 'super_admin' ? 'Admin' : u?.name ?? 'Unknown');

  const data = grouped
    .map((g) => ({
      faculty_id: g.faculty_id,
      name:       recorderName(fMap.get(g.faculty_id)),
      department: fMap.get(g.faculty_id)?.department ?? null,
      count:      g._count.id,
    }))
    .sort((a, b) => b.count - a.count);

  res.json({ data });
}

// 9. Calendar Heatmap — violation counts per calendar day across the selected
// range. Prisma can't group by a date-truncated timestamp portably, so the
// created_at values are fetched and bucketed per IST day in JS.
async function heatmap(req, res) {
  const where = analyticsWhere(req.query);
  const violations = await prisma.violation.findMany({ where, select: { created_at: true } });

  const counts = new Map();
  for (const v of violations) {
    // Bucket by IST calendar day (UTC + 5:30).
    const ist = new Date(v.created_at.getTime() + 5.5 * 3600000);
    const key = ist.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const data = Array.from(counts, ([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  res.json({ data, max: data.reduce((m, d) => Math.max(m, d.count), 0) });
}

// 11. Export — Counselling list (repeat violators) as .xlsx. Deliberately omits
// fine amounts, matching the student-violation export in reports.controller.js.
async function exportCounselling(req, res) {
  const { data, threshold } = await computeRepeatViolators(req.query);

  const buffer = await buildWorkbook('Counselling List', [
    { header: 'Registration Number', key: 'reg_no',      width: 22 },
    { header: 'Student Name',         key: 'name',        width: 24 },
    { header: 'Course',               key: 'course',      width: 12 },
    { header: 'Year',                 key: 'year',        width: 8 },
    { header: 'Violation Count',      key: 'count',       width: 16 },
    { header: 'Main Issue',           key: 'main_issue',  width: 22 },
  ], data.map((s) => ({
    reg_no:     s.registration_number,
    name:       s.student_name,
    course:     COURSE_LABELS[s.course] ?? s.course,
    year:       s.year,
    count:      s.violation_count,
    main_issue: s.main_issue ?? '—',
  })));

  sendWorkbook(res, buffer, `counselling-list-threshold-${threshold}.xlsx`);
}

// 12. Export — Counselling list (repeat violators) as PDF. Same data source
// as the Excel export (computeRepeatViolators), so the two never drift.
async function exportCounsellingPdf(req, res) {
  const { data, threshold } = await computeRepeatViolators(req.query);

  const buffer = await buildReportPdf({
    title: 'Students Requiring Counselling',
    subtitle: `Threshold: ${threshold}+ violations`,
    columns: [
      { header: 'Registration Number', key: 'reg_no',     width: 110 },
      { header: 'Student Name',        key: 'name',       width: 120 },
      { header: 'Course',              key: 'course',     width: 70 },
      { header: 'Year',                key: 'year',       width: 40 },
      { header: 'Violation Count',     key: 'count',      width: 70 },
      { header: 'Main Issue',          key: 'main_issue' },
    ],
    rows: data.map((s) => ({
      reg_no:     s.registration_number,
      name:       s.student_name,
      course:     COURSE_LABELS[s.course] ?? s.course,
      year:       s.year,
      count:      s.violation_count,
      main_issue: s.main_issue ?? '—',
    })),
  });

  sendPdf(res, buffer, `counselling-list-threshold-${threshold}.pdf`);
}

// 5. Filter Options — dynamic dropdown sources (never hardcoded per the P24 spec).
async function filterOptions(req, res) {
  const [courses, years, academicYears, types] = await Promise.all([
    prisma.student.findMany({ where: { deleted_at: null }, distinct: ['course'], select: { course: true } }),
    prisma.student.findMany({ where: { deleted_at: null }, distinct: ['year'], select: { year: true }, orderBy: { year: 'asc' } }),
    prisma.student.findMany({ where: { deleted_at: null }, distinct: ['academic_year'], select: { academic_year: true } }),
    prisma.violationType.findMany({ where: { is_active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  res.json({
    courses:         courses.map((c) => c.course),
    years:           years.map((y) => y.year),
    academic_years:  academicYears.map((a) => a.academic_year),
    violation_types: types,
  });
}

module.exports = {
  summary, trend, violationTypeAnalysis, repeatViolators, filterOptions,
  courseAnalysis, yearAnalysis, facultyAnalysis, heatmap, exportCounselling,
  exportCounsellingPdf,
};
