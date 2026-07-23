const prisma = require('../lib/prisma');
const { buildWorkbook, sendWorkbook } = require('../lib/excel');
const { buildReportPdf, sendPdf } = require('../lib/pdf');
const { instantMonthRange, instantSpanRange, parseYMD } = require('../lib/reportRange');
const { nowInIST } = require('../lib/time');
const settingsService = require('../services/settings.service');
const { COURSE_LABELS } = require('../lib/academicStructure');
const {
  addISTDays, mondayOfISTWeek, dayDiff, instantRangeForISTDates,
  pickGranularity, enumerateBuckets, bucketStartFor, bucketKeyFor, istDateOf,
} = require('../lib/trendBuckets');

// A violation's recorder is a faculty member on duty OR an admin who recorded
// it directly. Admin recorders surface as "Admin" per the discipline-oversight
// model. Shared by facultyAnalysis and the trend breakdown so the two
// "recorded by" groupings never drift.
function recorderName(u) {
  return u?.role === 'admin' || u?.role === 'super_admin' ? 'Admin' : u?.name ?? 'Unknown';
}

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
function extraFilters({ violation_type_id, course, year, academic_year, recorded_by, faculty_id }) {
  const where = {};
  if (violation_type_id) where.violation_type_id = violation_type_id;
  const studentFilter = {};
  if (course)        studentFilter.course        = course;
  if (year)          studentFilter.year           = year;
  if (academic_year) studentFilter.academic_year = academic_year;
  if (Object.keys(studentFilter).length) where.student = studentFilter;
  // Recorder — same "Admin" bucket / named-faculty logic as the All Records
  // table (violations.controller.js) and Reports (reports.controller.js), so
  // every analytics card/chart stays consistent with those.
  if (recorded_by === 'admin') where.faculty = { role: { in: ['admin', 'super_admin'] } };
  else if (faculty_id)         where.faculty_id = faculty_id;
  return where;
}

// `rangeOverride` lets the trend breakdown endpoint reuse this against an
// explicit bucket range instead of the query's own date-range preset.
function analyticsWhere(query, rangeOverride) {
  return { record_status: 'active', deleted_at: null, created_at: rangeOverride ?? resolveDateRange(query), ...extraFilters(query) };
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

// The date range immediately preceding the current one, of the same kind, for
// the trend's "vs previous equivalent period" comparison:
//   this_week  → the prior Mon–Sun
//   this_month → the prior calendar month
//   last_month → the calendar month before that
//   custom     → an equal-length window immediately before from_date
// Mirrors resolveDateRange's structure/precedence so the two never diverge.
function resolvePreviousRange({ range, from_date, to_date }, ist) {
  if (range === 'custom' && from_date && to_date) {
    const from = parseYMD(from_date), to = parseYMD(to_date);
    const spanDays = dayDiff(from, to) + 1;
    const prevTo   = addISTDays(from.year, from.month, from.day, -1);
    const prevFrom = addISTDays(prevTo.year, prevTo.month, prevTo.day, -(spanDays - 1));
    return instantRangeForISTDates(prevFrom, prevTo);
  }
  if (range === 'this_week') {
    const monday     = mondayOfISTWeek(ist.year, ist.month, ist.day);
    const prevMonday = addISTDays(monday.year, monday.month, monday.day, -7);
    const prevSunday = addISTDays(prevMonday.year, prevMonday.month, prevMonday.day, 6);
    return instantRangeForISTDates(prevMonday, prevSunday);
  }
  if (range === 'last_month') {
    // Two months back from the current IST month.
    const y = ist.month <= 2 ? ist.year - 1 : ist.year;
    const m = ist.month <= 2 ? ist.month + 10 : ist.month - 2;
    return instantMonthRange(y, m);
  }
  // this_month / default
  const y = ist.month === 1 ? ist.year - 1 : ist.year;
  const m = ist.month === 1 ? 12 : ist.month - 1;
  return instantMonthRange(y, m);
}

// Bucket granularity for the selected range — fixed for the two preset
// windows, span-dependent (and self-capping in bucket count) for custom.
function resolveGranularity(query, currentRange) {
  if (query.range === 'this_week') return 'day';
  if (query.range === 'custom') {
    const spanDays = Math.round((currentRange.lte - currentRange.gte) / 86_400_000) + 1;
    return pickGranularity(spanDays);
  }
  return 'week'; // this_month / last_month / default
}

// 2. Violation Trend — synchronized with every dashboard filter, including the
// Time Period preset (previously hardcoded to a trailing 6 months regardless
// of the filter). Bucket granularity adapts to the selected span; current and
// previous-equivalent-period totals come from a single findMany covering both
// (no per-bucket queries), matching the fetch-and-bucket pattern already used
// by heatmap() below.
async function trend(req, res) {
  const base          = extraFilters(req.query);
  const ist           = nowInIST();
  const currentRange  = resolveDateRange(req.query);
  const previousRange = resolvePreviousRange(req.query, ist);
  const granularity   = resolveGranularity(req.query, currentRange);

  // previousRange immediately precedes currentRange (no gap, no overlap by
  // construction), so one query spanning both is equivalent to two.
  const violations = await prisma.violation.findMany({
    where: {
      ...base, record_status: 'active', deleted_at: null,
      created_at: { gte: previousRange.gte, lte: currentRange.lte },
    },
    select: { created_at: true },
  });

  const buckets    = enumerateBuckets(currentRange, granularity);
  const countByKey = new Map(buckets.map((b) => [b.key, 0]));
  let previousTotal = 0;

  for (const v of violations) {
    if (v.created_at >= previousRange.gte && v.created_at <= previousRange.lte) {
      previousTotal++;
      continue;
    }
    const key = bucketKeyFor(bucketStartFor(istDateOf(v.created_at), granularity), granularity);
    if (countByKey.has(key)) countByKey.set(key, countByKey.get(key) + 1);
  }

  const data = buckets.map((b) => ({
    key: b.key, label: b.label, bucket_start: b.bucket_start, bucket_end: b.bucket_end,
    count: countByKey.get(b.key) ?? 0,
  }));

  const currentTotal = data.reduce((sum, d) => sum + d.count, 0);
  const average = data.length ? currentTotal / data.length : 0;
  const peak = data.reduce((best, d) => (!best || d.count > best.count ? d : best), null);

  // % change vs previous period — undefined (not "infinite") when the
  // previous period had zero violations; status still resolves via the
  // absolute current/previous comparison below.
  const directionPct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  const { trend_stable_band_pct: band } = await settingsService.getSettings();
  let status;
  if (currentTotal === 0 && previousTotal === 0)      status = 'stable';
  else if (previousTotal === 0)                       status = 'worsening'; // currentTotal > 0 here
  else if (directionPct > band)                       status = 'worsening';
  else if (directionPct < -band)                      status = 'improving';
  else                                                 status = 'stable';

  res.json({
    granularity,
    data,
    current_total:    currentTotal,
    previous_total:   previousTotal,
    direction_pct:    directionPct === null ? null : Math.round(directionPct * 10) / 10,
    peak:             peak && peak.count > 0 ? peak : null,
    average:          Math.round(average),
    status,
    stable_band_pct:  band,
  });
}

// 2b. Trend breakdown — the detail shown when an admin clicks a point on the
// Violation Trend chart, scoped to that single bucket's (already-clipped)
// date range. Reuses the same where-clause builder, repeat-violation
// threshold, and recorder-naming convention as the rest of this file instead
// of recomputing them.
async function trendBreakdown(req, res) {
  const { bucket_start, bucket_end } = req.query;
  const range = { gte: new Date(bucket_start), lte: new Date(bucket_end) };
  const where = analyticsWhere(req.query, range);

  const { repeat_violation_threshold: threshold } = await settingsService.getSettings();

  const [total, byStudent, byType, byFaculty] = await Promise.all([
    prisma.violation.count({ where }),
    prisma.violation.groupBy({ by: ['student_id'], where, _count: { id: true } }),
    prisma.violation.groupBy({ by: ['violation_type_id'], where, _count: { id: true } }),
    prisma.violation.groupBy({ by: ['faculty_id'], where, _count: { id: true } }),
  ]);

  let mostFrequentViolation = null;
  if (byType.length) {
    const top = byType.reduce((a, b) => (b._count.id > a._count.id ? b : a));
    const type = await prisma.violationType.findUnique({ where: { id: top.violation_type_id }, select: { name: true } });
    mostFrequentViolation = { name: type?.name ?? 'Unknown', count: top._count.id };
  }

  const faculty = await prisma.user.findMany({
    where: { id: { in: byFaculty.map((g) => g.faculty_id) } },
    select: { id: true, name: true, role: true },
  });
  const fMap = new Map(faculty.map((f) => [f.id, f]));
  const recordedByCounts = new Map();
  for (const g of byFaculty) {
    const name = recorderName(fMap.get(g.faculty_id));
    recordedByCounts.set(name, (recordedByCounts.get(name) ?? 0) + g._count.id);
  }

  res.json({
    bucket_start,
    bucket_end,
    total_violations:        total,
    students_involved:       byStudent.length,
    most_frequent_violation: mostFrequentViolation,
    repeat_violators_count:  byStudent.filter((g) => g._count.id >= threshold).length,
    recorded_by:             Array.from(recordedByCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  });
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
  summary, trend, trendBreakdown, violationTypeAnalysis, repeatViolators, filterOptions,
  courseAnalysis, yearAnalysis, facultyAnalysis, heatmap, exportCounselling,
  exportCounsellingPdf,
};
