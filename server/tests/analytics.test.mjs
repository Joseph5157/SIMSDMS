import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService = _require('../services/settings.service');
const {
  summary, trend, trendBreakdown, repeatViolators, courseAnalysis, yearAnalysis, facultyAnalysis, heatmap, exportCounsellingPdf,
} = _require('../controllers/analytics.controller');

function makeReq(query = {}) { return { query }; }
function makeRes() {
  const r = { _status: 200, _body: null, _headers: {}, _sent: null };
  r.status     = (c) => { r._status = c; return r; };
  r.json       = (b) => { r._body = b; return r; };
  r.setHeader  = (k, v) => { r._headers[k] = v; return r; };
  r.send       = (b) => { r._sent = b; return r; };
  return r;
}

describe('summary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('counts students at/above the configured threshold as repeat violators and surfaces the most common type', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ repeat_violation_threshold: 3 });
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(10);
    vi.spyOn(prisma.violation, 'groupBy')
      .mockResolvedValueOnce([
        { student_id: 's1', _count: { id: 5 } }, // above threshold
        { student_id: 's2', _count: { id: 2 } }, // below threshold
      ])
      .mockResolvedValueOnce([
        { violation_type_id: 't1', _count: { id: 7 } },
        { violation_type_id: 't2', _count: { id: 3 } },
      ]);
    vi.spyOn(prisma.violationType, 'findUnique').mockResolvedValue({ name: 'Late to duty' });

    const res = makeRes();
    await summary(makeReq(), res);

    expect(res._body.total_violations).toBe(10);
    expect(res._body.students_affected).toBe(2);
    expect(res._body.repeat_violators_count).toBe(1);
    expect(res._body.most_common).toEqual({ type: 'Late to duty', count: 7 });
  });

  it('reads the threshold from settingsService, not the query string', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ repeat_violation_threshold: 5 });
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.violation, 'groupBy')
      .mockResolvedValueOnce([{ student_id: 's1', _count: { id: 5 } }])
      .mockResolvedValueOnce([]);

    const res = makeRes();
    // A query threshold, if sent, must have no effect — the setting is authoritative.
    await summary(makeReq({ threshold: '1' }), res);

    expect(res._body.repeat_violators_count).toBe(1); // 5 >= configured 5
  });

  it('is inclusive: a student with exactly the configured threshold counts as a repeat violator', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ repeat_violation_threshold: 4 });
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.violation, 'groupBy')
      .mockResolvedValueOnce([
        { student_id: 's1', _count: { id: 4 } }, // exactly at threshold
        { student_id: 's2', _count: { id: 3 } }, // one below
      ])
      .mockResolvedValueOnce([]);

    const res = makeRes();
    await summary(makeReq(), res);

    expect(res._body.repeat_violators_count).toBe(1);
  });
});

describe('repeatViolators', () => {
  beforeEach(() => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ repeat_violation_threshold: 3 });
  });
  afterEach(() => vi.restoreAllMocks());

  it('picks each repeat violator\'s most frequent violation type as "main issue"', async () => {
    vi.spyOn(prisma.violation, 'groupBy').mockResolvedValue([
      { student_id: 's1', _count: { id: 4 } },
    ]);
    vi.spyOn(prisma.student, 'findMany').mockResolvedValue([
      { id: 's1', student_name: 'Alice', registration_number: 'R1', course: 'b_pharm', year: 2 },
    ]);
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student_id: 's1', created_at: new Date('2026-07-01'), violationType: { name: 'Late' } },
      { student_id: 's1', created_at: new Date('2026-07-05'), violationType: { name: 'Late' } },
      { student_id: 's1', created_at: new Date('2026-07-10'), violationType: { name: 'Uniform' } },
    ]);

    const res = makeRes();
    await repeatViolators(makeReq(), res);

    expect(res._body.data).toHaveLength(1);
    expect(res._body.data[0]).toEqual(
      expect.objectContaining({ student_id: 's1', violation_count: 4, main_issue: 'Late' }),
    );
  });

  it('sorts by violation_count descending, then most-recent violation as tiebreaker', async () => {
    vi.spyOn(prisma.violation, 'groupBy').mockResolvedValue([
      { student_id: 's1', _count: { id: 5 } },
      { student_id: 's2', _count: { id: 5 } },
      { student_id: 's3', _count: { id: 8 } },
    ]);
    vi.spyOn(prisma.student, 'findMany').mockResolvedValue([
      { id: 's1', student_name: 'A', registration_number: 'R1', course: 'b_pharm', year: 1 },
      { id: 's2', student_name: 'B', registration_number: 'R2', course: 'b_pharm', year: 1 },
      { id: 's3', student_name: 'C', registration_number: 'R3', course: 'b_pharm', year: 1 },
    ]);
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student_id: 's1', created_at: new Date('2026-07-01'), violationType: { name: 'Late' } },
      { student_id: 's2', created_at: new Date('2026-07-15'), violationType: { name: 'Late' } }, // more recent than s1
      { student_id: 's3', created_at: new Date('2026-07-02'), violationType: { name: 'Late' } },
    ]);

    const res = makeRes();
    await repeatViolators(makeReq(), res);

    expect(res._body.data.map((d) => d.student_id)).toEqual(['s3', 's2', 's1']);
  });

  it('returns an empty list without querying students/violations when nobody is at/above threshold', async () => {
    vi.spyOn(prisma.violation, 'groupBy').mockResolvedValue([{ student_id: 's1', _count: { id: 1 } }]);
    const findMany = vi.spyOn(prisma.student, 'findMany');

    const res = makeRes();
    await repeatViolators(makeReq(), res);

    expect(res._body.data).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('courseAnalysis / yearAnalysis', () => {
  afterEach(() => vi.restoreAllMocks());

  it('aggregates violation counts by student course, sorted descending', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student: { course: 'b_pharm' } },
      { student: { course: 'b_pharm' } },
      { student: { course: 'pharm_d' } },
      { student: null }, // defensive: no student relation resolved
    ]);
    const res = makeRes();
    await courseAnalysis(makeReq(), res);
    expect(res._body.data).toEqual([
      { course: 'b_pharm', count: 2 },
      { course: 'pharm_d', count: 1 },
      { course: 'Unknown', count: 1 },
    ]);
  });

  it('aggregates violation counts by (course, year), sorted by course then year', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student: { course: 'pharm_d', year: 3 } },
      { student: { course: 'b_pharm', year: 1 } },
      { student: { course: 'b_pharm', year: 1 } },
      { student: { course: 'm_pharm', year: 2 } },
    ]);
    const res = makeRes();
    await yearAnalysis(makeReq(), res);
    expect(res._body.data).toEqual([
      { course: 'b_pharm', year: 1, count: 2 },
      { course: 'm_pharm', year: 2, count: 1 },
      { course: 'pharm_d', year: 3, count: 1 },
    ]);
  });

  it('never mixes counts across courses that happen to share a year number', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student: { course: 'b_pharm', year: 1 } },
      { student: { course: 'pharm_d', year: 1 } },
    ]);
    const res = makeRes();
    await yearAnalysis(makeReq(), res);
    expect(res._body.data).toEqual([
      { course: 'b_pharm', year: 1, count: 1 },
      { course: 'pharm_d', year: 1, count: 1 },
    ]);
  });
});

// Recorder filter — same "Admin" bucket / named-faculty logic as the All
// Records table and Reports; applies via the shared extraFilters()/
// analyticsWhere() builder, so any endpoint exercises the same code path.
describe('recorder filter (analyticsWhere)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('recorded_by=admin filters to admin/super_admin recorders', async () => {
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await courseAnalysis(makeReq({ recorded_by: 'admin' }), res);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ faculty: { role: { in: ['admin', 'super_admin'] } } }),
    }));
  });

  it('faculty_id filters to that named faculty member', async () => {
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await courseAnalysis(makeReq({ faculty_id: 'f1' }), res);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ faculty_id: 'f1' }),
    }));
  });

  it('recorded_by=admin takes precedence over a faculty_id sent alongside it', async () => {
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await courseAnalysis(makeReq({ recorded_by: 'admin', faculty_id: 'f1' }), res);

    const where = findMany.mock.calls[0][0].where;
    expect(where.faculty).toEqual({ role: { in: ['admin', 'super_admin'] } });
    expect(where.faculty_id).toBeUndefined();
  });

  it('omits the recorder clause entirely when neither is provided', async () => {
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await courseAnalysis(makeReq(), res);

    const where = findMany.mock.calls[0][0].where;
    expect(where.faculty).toBeUndefined();
    expect(where.faculty_id).toBeUndefined();
  });
});

describe('facultyAnalysis', () => {
  afterEach(() => vi.restoreAllMocks());

  it('buckets admin and super_admin recorders under a single "Admin" label', async () => {
    vi.spyOn(prisma.violation, 'groupBy').mockResolvedValue([
      { faculty_id: 'a1', _count: { id: 3 } },
      { faculty_id: 'f1', _count: { id: 5 } },
    ]);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      { id: 'a1', name: 'Admin One', department: null, role: 'admin' },
      { id: 'f1', name: 'Dr. Rao', department: 'Pharmacology', role: 'faculty' },
    ]);

    const res = makeRes();
    await facultyAnalysis(makeReq(), res);

    expect(res._body.data).toEqual([
      { faculty_id: 'f1', name: 'Dr. Rao', department: 'Pharmacology', count: 5 },
      { faculty_id: 'a1', name: 'Admin', department: null, count: 3 },
    ]);
  });
});

describe('trend', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches current + previous period in a single query — never one query per bucket', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      // Previous period (2026-06-24..30).
      { created_at: new Date('2026-06-25T10:00:00.000Z') },
      { created_at: new Date('2026-06-25T11:00:00.000Z') },
      // Current period (2026-07-01..07), day granularity.
      { created_at: new Date('2026-07-02T10:00:00.000Z') },
      { created_at: new Date('2026-07-02T11:00:00.000Z') },
      { created_at: new Date('2026-07-02T12:00:00.000Z') },
      { created_at: new Date('2026-07-05T10:00:00.000Z') },
    ]);

    const res = makeRes();
    await trend(makeReq({ range: 'custom', from_date: '2026-07-01', to_date: '2026-07-07' }), res);

    expect(findMany).toHaveBeenCalledTimes(1);

    expect(res._body.granularity).toBe('day');
    expect(res._body.data).toHaveLength(7);
    expect(res._body.data.map((d) => d.count)).toEqual([0, 3, 0, 0, 1, 0, 0]);
    expect(res._body.data[1]).toEqual(expect.objectContaining({ key: '2026-07-02', label: '2 Jul', count: 3 }));

    expect(res._body.current_total).toBe(4);
    expect(res._body.previous_total).toBe(2);
    expect(res._body.direction_pct).toBe(100); // (4-2)/2 * 100
    expect(res._body.average).toBe(1);          // 4/7 rounded to the nearest whole violation
    expect(res._body.peak).toEqual(expect.objectContaining({ key: '2026-07-02', count: 3 }));
    expect(res._body.status).toBe('worsening'); // +100% is well beyond the 10% band
    expect(res._body.stable_band_pct).toBe(10);
  });

  it('picks daily granularity for this_week and weekly for this_month, without depending on the current date', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);

    const weekRes = makeRes();
    await trend(makeReq({ range: 'this_week' }), weekRes);
    expect(weekRes._body.granularity).toBe('day');

    const monthRes = makeRes();
    await trend(makeReq({ range: 'this_month' }), monthRes);
    expect(monthRes._body.granularity).toBe('week');
  });

  it('escalates a long custom range to a coarser granularity but still issues one query', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);

    const res = makeRes();
    await trend(makeReq({ range: 'custom', from_date: '2026-01-01', to_date: '2026-06-01' }), res); // ~152 days
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(res._body.granularity).toBe('week');
  });

  it('treats a zero-to-zero change as stable with no peak and a null direction', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);

    const res = makeRes();
    await trend(makeReq({ range: 'custom', from_date: '2026-07-01', to_date: '2026-07-07' }), res);

    expect(res._body.current_total).toBe(0);
    expect(res._body.previous_total).toBe(0);
    expect(res._body.direction_pct).toBeNull();
    expect(res._body.peak).toBeNull();
    expect(res._body.status).toBe('stable');
  });

  it('treats a rise from a zero baseline as worsening rather than an infinite/undefined percentage', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { created_at: new Date('2026-07-02T10:00:00.000Z') },
    ]);

    const res = makeRes();
    await trend(makeReq({ range: 'custom', from_date: '2026-07-01', to_date: '2026-07-07' }), res);

    expect(res._body.previous_total).toBe(0);
    expect(res._body.current_total).toBe(1);
    expect(res._body.direction_pct).toBeNull();
    expect(res._body.status).toBe('worsening');
  });

  it('classifies a drop beyond the configured band as improving', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      // Previous: 10 violations.
      ...Array.from({ length: 10 }, () => ({ created_at: new Date('2026-06-25T10:00:00.000Z') })),
      // Current: 2 violations — an 80% drop, well beyond the 10% band.
      { created_at: new Date('2026-07-02T10:00:00.000Z') },
      { created_at: new Date('2026-07-02T11:00:00.000Z') },
    ]);

    const res = makeRes();
    await trend(makeReq({ range: 'custom', from_date: '2026-07-01', to_date: '2026-07-07' }), res);

    expect(res._body.direction_pct).toBe(-80);
    expect(res._body.status).toBe('improving');
  });

  it('stays within the configured band and reports stable', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      ...Array.from({ length: 10 }, () => ({ created_at: new Date('2026-06-25T10:00:00.000Z') })),
      // Current: 11 violations — +10%, exactly at the band edge, still stable (strict >).
      ...Array.from({ length: 11 }, (_, i) => ({ created_at: new Date(`2026-07-0${(i % 7) + 1}T10:00:00.000Z`) })),
    ]);

    const res = makeRes();
    await trend(makeReq({ range: 'custom', from_date: '2026-07-01', to_date: '2026-07-07' }), res);

    expect(res._body.direction_pct).toBe(10);
    expect(res._body.status).toBe('stable');
  });

  it('still applies course/violation-type filters to the underlying query', async () => {
    const findMany = vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ trend_stable_band_pct: 10 });

    await trend(makeReq({ range: 'this_month', course: 'b_pharm', violation_type_id: 't1' }), makeRes());

    const where = findMany.mock.calls[0][0].where;
    expect(where.student).toEqual({ course: 'b_pharm' });
    expect(where.violation_type_id).toBe('t1');
  });
});

describe('trendBreakdown', () => {
  afterEach(() => vi.restoreAllMocks());

  it('scopes to the exact bucket range sent by the client, not a resolved date-range preset', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ repeat_violation_threshold: 3 });
    const count = vi.spyOn(prisma.violation, 'count').mockResolvedValue(6);
    vi.spyOn(prisma.violation, 'groupBy')
      .mockResolvedValueOnce([{ student_id: 's1', _count: { id: 4 } }, { student_id: 's2', _count: { id: 2 } }]) // by student
      .mockResolvedValueOnce([{ violation_type_id: 't1', _count: { id: 5 } }, { violation_type_id: 't2', _count: { id: 1 } }]) // by type
      .mockResolvedValueOnce([{ faculty_id: 'a1', _count: { id: 3 } }, { faculty_id: 'f1', _count: { id: 3 } }]); // by faculty
    vi.spyOn(prisma.violationType, 'findUnique').mockResolvedValue({ name: 'Late to duty' });
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      { id: 'a1', name: 'Admin One', role: 'admin' },
      { id: 'f1', name: 'Dr. Rao', role: 'faculty' },
    ]);

    const res = makeRes();
    await trendBreakdown(makeReq({
      bucket_start: '2026-07-01T18:30:00.000Z',
      bucket_end:   '2026-07-02T18:29:59.999Z',
      course:       'b_pharm',
    }), res);

    expect(count.mock.calls[0][0].where.created_at).toEqual({
      gte: new Date('2026-07-01T18:30:00.000Z'),
      lte: new Date('2026-07-02T18:29:59.999Z'),
    });
    expect(count.mock.calls[0][0].where.student).toEqual({ course: 'b_pharm' });

    expect(res._body.total_violations).toBe(6);
    expect(res._body.students_involved).toBe(2);
    expect(res._body.most_frequent_violation).toEqual({ name: 'Late to duty', count: 5 });
    expect(res._body.repeat_violators_count).toBe(1); // only s1 (4) is >= threshold 3
    expect(res._body.recorded_by).toEqual(
      expect.arrayContaining([{ name: 'Admin', count: 3 }, { name: 'Dr. Rao', count: 3 }]),
    );
  });
});

describe('heatmap', () => {
  afterEach(() => vi.restoreAllMocks());

  it('buckets violations by IST calendar day, not UTC day', async () => {
    // 2026-07-15 22:00 UTC is 2026-07-16 03:30 IST — must bucket to the 16th.
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { created_at: new Date('2026-07-15T22:00:00.000Z') },
      { created_at: new Date('2026-07-16T01:00:00.000Z') }, // 06:30 IST same day
    ]);

    const res = makeRes();
    await heatmap(makeReq(), res);

    expect(res._body.data).toEqual([{ date: '2026-07-16', count: 2 }]);
    expect(res._body.max).toBe(2);
  });
});

describe('exportCounsellingPdf', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends a PDF attachment named after the configured threshold', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ repeat_violation_threshold: 3 });
    vi.spyOn(prisma.violation, 'groupBy').mockResolvedValue([{ student_id: 's1', _count: { id: 4 } }]);
    vi.spyOn(prisma.student, 'findMany').mockResolvedValue([
      { id: 's1', student_name: 'Alice', registration_number: 'R1', course: 'b_pharm', year: 2 },
    ]);
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student_id: 's1', created_at: new Date('2026-07-01'), violationType: { name: 'Late' } },
    ]);

    const res = makeRes();
    await exportCounsellingPdf(makeReq(), res);

    expect(res._headers['Content-Type']).toBe('application/pdf');
    expect(res._headers['Content-Disposition']).toContain('counselling-list-threshold-3.pdf');
    expect(Buffer.isBuffer(res._sent)).toBe(true);
    expect(res._sent.length).toBeGreaterThan(0);
  });
});
