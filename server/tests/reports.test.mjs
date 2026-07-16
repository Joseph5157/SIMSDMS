import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService  = _require('../services/settings.service');
const {
  monthlyAttendanceSummary, pendingFinesSummary, flaggedViolationsReport,
  monthlyDutyCoverage, unassignedFacultyReport, dutyReassignmentReport,
  studentViolationHistory,
} = _require('../controllers/reports.controller');

function makeReq(query = {}) { return { query }; }
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

const DEFAULT_CFG = {
  late_threshold_morning_hour: 8, late_threshold_morning_min: 15,
  late_threshold_afternoon_hour: 13, late_threshold_afternoon_min: 15,
};

describe('monthlyAttendanceSummary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('tallies per-faculty total/completed/absent/late/auto_out from duty slots', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(DEFAULT_CFG);
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([
      {
        faculty_id: 'f1', faculty: { id: 'f1', name: 'A' }, status: 'completed', session_type: 'morning',
        attendance: { in_time: new Date('2026-07-01T03:30:00.000Z'), auto_out: false }, // 09:00 IST — late
      },
      {
        faculty_id: 'f1', faculty: { id: 'f1', name: 'A' }, status: 'completed', session_type: 'morning',
        attendance: { in_time: new Date('2026-07-02T02:00:00.000Z'), auto_out: true }, // 07:30 IST — on time
      },
      {
        faculty_id: 'f2', faculty: { id: 'f2', name: 'B' }, status: 'absent', session_type: 'afternoon',
        attendance: null,
      },
    ]);

    const res = makeRes();
    await monthlyAttendanceSummary(makeReq({ year: 2026, month: 7 }), res);

    const byFaculty = Object.fromEntries(res._body.data.map((r) => [r.faculty.id, r]));
    expect(byFaculty.f1).toEqual(expect.objectContaining({ total: 2, completed: 2, absent: 0, late: 1, auto_out: 1 }));
    expect(byFaculty.f2).toEqual(expect.objectContaining({ total: 1, completed: 0, absent: 1, late: 0, auto_out: 0 }));
  });
});

describe('pendingFinesSummary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sums fine amounts across all matching (non-warning, positive-fine) violations', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { fine_amount: '100.50', student: {}, violationType: {} },
      { fine_amount: '49.50',  student: {}, violationType: {} },
    ]);
    const res = makeRes();
    await pendingFinesSummary(makeReq(), res);
    expect(res._body.total).toBe(2);
    expect(res._body.total_fine_amount).toBe('150.00');
  });

  it('reports zero total for no matching records', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await pendingFinesSummary(makeReq(), res);
    expect(res._body.total_fine_amount).toBe('0.00');
  });
});

describe('flaggedViolationsReport', () => {
  afterEach(() => vi.restoreAllMocks());

  it('splits currently-pending vs. previously-resolved flags correctly', async () => {
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([
      { is_flagged: true,  flag_resolved_at: null,               student: {}, faculty: {}, violationType: {}, dutySlot: null },
      { is_flagged: false, flag_resolved_at: new Date('2026-07-01'), student: {}, faculty: {}, violationType: {}, dutySlot: null },
      { is_flagged: true,  flag_resolved_at: null,               student: {}, faculty: {}, violationType: {}, dutySlot: null },
    ]);
    const res = makeRes();
    await flaggedViolationsReport(makeReq(), res);
    expect(res._body.total).toBe(3);
    expect(res._body.pending_count).toBe(2);
    expect(res._body.resolved_count).toBe(1);
  });
});

describe('monthlyDutyCoverage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('computes completion_rate as a percentage of completed slots', async () => {
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([
      { status: 'completed', session_type: 'morning' },
      { status: 'completed', session_type: 'afternoon' },
      { status: 'absent',    session_type: 'morning' },
      { status: 'scheduled', session_type: 'afternoon' },
    ]);
    const res = makeRes();
    await monthlyDutyCoverage(makeReq({ year: 2026, month: 7 }), res);
    expect(res._body.total).toBe(4);
    expect(res._body.completed).toBe(2);
    expect(res._body.absent).toBe(1);
    expect(res._body.scheduled).toBe(1);
    expect(res._body.morning).toBe(2);
    expect(res._body.afternoon).toBe(2);
    expect(res._body.completion_rate).toBe('50.0');
  });

  it('does not divide by zero when there are no slots for the month', async () => {
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await monthlyDutyCoverage(makeReq({ year: 2026, month: 7 }), res);
    expect(res._body.completion_rate).toBe('0.0');
  });
});

describe('unassignedFacultyReport', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists only faculty below the required session count, using calendar config when present', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({ sessions_per_faculty: 2 });
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      { id: 'f1', name: 'A', department: 'X', email: 'a@x.com' },
      { id: 'f2', name: 'B', department: 'X', email: 'b@x.com' },
    ]);
    vi.spyOn(prisma.dutySlot, 'groupBy').mockResolvedValue([
      { faculty_id: 'f1', _count: { id: 2 } }, // meets requirement
    ]);

    const res = makeRes();
    await unassignedFacultyReport(makeReq({ year: 2026, month: 7 }), res);

    expect(res._body.sessions_required).toBe(2);
    expect(res._body.data).toEqual([
      expect.objectContaining({ id: 'f2', slots_picked: 0, required: 2 }),
    ]);
  });

  it('falls back to a default of 3 required sessions when no calendar config exists', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'f1', name: 'A', department: 'X', email: 'a@x.com' }]);
    vi.spyOn(prisma.dutySlot, 'groupBy').mockResolvedValue([]);

    const res = makeRes();
    await unassignedFacultyReport(makeReq({ year: 2026, month: 7 }), res);
    expect(res._body.sessions_required).toBe(3);
  });
});

describe('dutyReassignmentReport', () => {
  afterEach(() => vi.restoreAllMocks());

  it('derives final_attendance from the slot\'s attendance record', async () => {
    vi.spyOn(prisma.dutyReassignment, 'findMany').mockResolvedValue([
      {
        id: 'r1', duty_date: new Date('2026-07-10'), session_type: 'morning', reason: 'sick',
        created_at: new Date('2026-07-09'),
        fromFaculty: { id: 'f1', name: 'A' }, toFaculty: { id: 'f2', name: 'B' }, reassignedBy: { id: 'a1', name: 'Admin' },
        dutySlot: { status: 'completed', attendance: { in_time: new Date(), out_time: new Date() } },
      },
      {
        id: 'r2', duty_date: new Date('2026-07-11'), session_type: 'afternoon', reason: null,
        created_at: new Date('2026-07-10'),
        fromFaculty: { id: 'f1', name: 'A' }, toFaculty: { id: 'f3', name: 'C' }, reassignedBy: { id: 'a1', name: 'Admin' },
        dutySlot: { status: 'scheduled', attendance: null },
      },
    ]);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.dutySlot, 'groupBy').mockResolvedValue([]);
    vi.spyOn(prisma.dutyReassignment, 'groupBy').mockResolvedValue([]);

    const res = makeRes();
    await dutyReassignmentReport(makeReq({ year: 2026, month: 7 }), res);

    expect(res._body.history[0].final_attendance).toBe('checked_out');
    expect(res._body.history[1].final_attendance).toBe('none');
  });

  it('reconciles per-faculty regular/received/away/final counts (final = regular + received - away)', async () => {
    vi.spyOn(prisma.dutyReassignment, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      { id: 'f1', name: 'A', department: 'X' },
    ]);
    // f1 currently holds 4 slots this month (final), received 1 from a colleague,
    // and had 2 reassigned away — so their originally-picked (regular) count is
    // 4 - 1 + 2 = 5.
    vi.spyOn(prisma.dutySlot, 'groupBy').mockResolvedValue([{ faculty_id: 'f1', _count: { id: 4 } }]);
    vi.spyOn(prisma.dutyReassignment, 'groupBy')
      .mockResolvedValueOnce([{ to_faculty_id: 'f1', _count: { id: 1 } }])
      .mockResolvedValueOnce([{ from_faculty_id: 'f1', _count: { id: 2 } }]);

    const res = makeRes();
    await dutyReassignmentReport(makeReq({ year: 2026, month: 7 }), res);

    expect(res._body.counts).toEqual([
      { faculty_id: 'f1', name: 'A', department: 'X', regular: 5, received: 1, away: 2, final: 4 },
    ]);
  });
});

describe('studentViolationHistory / studentViolationWhere', () => {
  afterEach(() => vi.restoreAllMocks());

  it('buckets recorded_by=admin into a faculty.role filter, not a faculty_id filter', async () => {
    const count = vi.spyOn(prisma.violation, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);

    const res = makeRes();
    await studentViolationHistory(makeReq({ recorded_by: 'admin', faculty_id: 'should-be-ignored' }), res);

    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        faculty: { role: { in: ['admin', 'super_admin'] } },
      }),
    });
    expect(count.mock.calls[0][0].where.faculty_id).toBeUndefined();
  });

  it('applies course/student_year as a nested student filter, and year+month as a date range', async () => {
    const count = vi.spyOn(prisma.violation, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.violation, 'findMany').mockResolvedValue([]);

    const res = makeRes();
    await studentViolationHistory(makeReq({ course: 'b_pharm', student_year: 2, year: 2026, month: 7 }), res);

    const where = count.mock.calls[0][0].where;
    expect(where.student).toEqual({ course: 'b_pharm', year: 2 });
    // Date scoping is applied via an OR (dutySlot.duty_date for slot-linked
    // violations, created_at for admin ad-hoc ones with no slot) — see
    // violationInRange — not a plain top-level created_at filter.
    expect(where.OR).toEqual([
      { dutySlot: { duty_date: expect.any(Object) } },
      { duty_slot_id: null, created_at: expect.any(Object) },
    ]);
  });
});
