import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma = _require('../lib/prisma');
const {
  summary, repeatViolators, courseAnalysis, yearAnalysis, facultyAnalysis, heatmap,
} = _require('../controllers/analytics.controller');

function makeReq(query = {}) { return { query }; }
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

describe('summary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('counts students above the threshold as repeat violators and surfaces the most common type', async () => {
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(10);
    vi.spyOn(prisma.violation, 'groupBy')
      .mockResolvedValueOnce([
        { student_id: 's1', _count: { id: 5 } }, // above default threshold 3
        { student_id: 's2', _count: { id: 2 } }, // at/below threshold
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

  it('respects a custom threshold from the query', async () => {
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.violation, 'groupBy')
      .mockResolvedValueOnce([{ student_id: 's1', _count: { id: 5 } }])
      .mockResolvedValueOnce([]);

    const res = makeRes();
    await summary(makeReq({ threshold: '5' }), res);

    // 5 is not > 5, so no repeat violators at this threshold.
    expect(res._body.repeat_violators_count).toBe(0);
    expect(res._body.most_common).toBeNull();
  });
});

describe('repeatViolators', () => {
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

  it('returns an empty list without querying students/violations when nobody is above threshold', async () => {
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

  it('aggregates violation counts by student year, sorted ascending', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { student: { year: 3 } },
      { student: { year: 1 } },
      { student: { year: 1 } },
    ]);
    const res = makeRes();
    await yearAnalysis(makeReq(), res);
    expect(res._body.data).toEqual([
      { year: 1, count: 2 },
      { year: 3, count: 1 },
    ]);
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
