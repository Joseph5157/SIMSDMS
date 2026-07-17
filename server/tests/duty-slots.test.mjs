import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService = _require('../services/settings.service');
const { pickSlot, getMonthSlots, reassignSlot } = _require('../controllers/duty-slots.controller');

// A safely-future duty_date so the PAST_DUTY guard never trips in reassign tests.
const FUTURE_DATE = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

const DEFAULT_CFG = {
  session_start_morning_hour: 8, session_start_morning_min: 0,
  session_start_afternoon_hour: 13, session_start_afternoon_min: 0,
  auto_checkout_morning_hour: 16, auto_checkout_morning_min: 30,
  auto_checkout_afternoon_hour: 16, auto_checkout_afternoon_min: 30,
};

function makeReq(b = {}) { return { body: b, user: { id: 'f1', role: 'faculty' }, params: {} }; }
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

const openConfig = { is_window_open: true, working_days: ['2026-06-10'], sessions_per_faculty: 3 };
const validBody  = { duty_date: '2026-06-10', session_type: 'morning' };

describe('pickSlot', () => {
  beforeEach(() => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue(openConfig);
    vi.spyOn(prisma, '$transaction');
  });
  afterEach(() => vi.restoreAllMocks());

  function tx({ count = 0, createResult = null, createError = null }) {
    prisma.$transaction.mockImplementationOnce(async (fn) => fn({
      dutySlot: {
        count:  vi.fn().mockResolvedValue(count),
        create: createError ? vi.fn().mockRejectedValue(createError) : vi.fn().mockResolvedValue(createResult),
      },
    }));
  }

  it('returns 409 WINDOW_CLOSED when no calendar config exists', async () => {
    prisma.calendarConfig.findUnique.mockResolvedValue(null);
    const res = makeRes();
    await pickSlot(makeReq(validBody), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('WINDOW_CLOSED');
  });

  it('returns 409 WINDOW_CLOSED when the window is not open', async () => {
    prisma.calendarConfig.findUnique.mockResolvedValue({ ...openConfig, is_window_open: false });
    const res = makeRes();
    await pickSlot(makeReq(validBody), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('WINDOW_CLOSED');
  });

  it('returns 409 LIMIT_REACHED when faculty already has the maximum slots', async () => {
    tx({ count: 3 });
    const res = makeRes();
    await pickSlot(makeReq(validBody), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('LIMIT_REACHED');
  });

  it('returns 409 SLOT_TAKEN when Prisma raises a P2002 unique constraint error', async () => {
    tx({ count: 0, createError: Object.assign(new Error('unique'), { code: 'P2002' }) });
    const res = makeRes();
    await pickSlot(makeReq(validBody), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('SLOT_TAKEN');
  });

  it('returns 201 with the created slot on the success path', async () => {
    const slot = { id: 's1', faculty_id: 'f1', duty_date: new Date('2026-06-10'), session_type: 'morning', status: 'scheduled' };
    tx({ count: 0, createResult: slot });
    const res = makeRes();
    await pickSlot(makeReq(validBody), res);
    expect(res._status).toBe(201);
    expect(res._body).toEqual(slot);
  });
});

describe('getMonthSlots', () => {
  afterEach(() => vi.restoreAllMocks());

  it('scopes a faculty member to the slots they currently own (faculty_id only)', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(DEFAULT_CFG);
    const ownSlot = {
      id: 's1', faculty_id: 'f1',
      duty_date: new Date('2026-06-10'), session_type: 'morning', status: 'scheduled',
    };
    const findMany = vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([ownSlot]);

    const req = { params: { year: '2026', month: '6' }, user: { id: 'f1', role: 'faculty' } };
    const res = makeRes();
    await getMonthSlots(req, res);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ faculty_id: 'f1' }),
    }));
    expect(res._body.data).toEqual([expect.objectContaining(ownSlot)]);
    expect(res._body.total).toBe(1);
  });

  it('selects attendance.in_time/out_time so the frontend can tell which slot is actively checked in', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(DEFAULT_CFG);
    const findMany = vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([]);

    const req = { params: { year: '2026', month: '6' }, user: { id: 'f1', role: 'faculty' } };
    const res = makeRes();
    await getMonthSlots(req, res);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        attendance: { select: { in_time: true, out_time: true } },
      }),
    }));
  });

  it('attaches a live-computed attendance_status to each returned slot', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(DEFAULT_CFG);
    const slot = {
      id: 's1', faculty_id: 'f1',
      duty_date: new Date('2026-06-10'), session_type: 'morning', status: 'absent',
      attendance: { in_time: '2026-06-10T04:00:00.000Z', out_time: null },
    };
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([slot]);

    const req = { params: { year: '2026', month: '6' }, user: { id: 'f1', role: 'faculty' } };
    const res = makeRes();
    await getMonthSlots(req, res);

    // A checked-in slot resolves to 'checked_in' even though the raw
    // slot_status column is still the stale 'absent' the cron job wrote
    // before this check-in happened — attendance_status is the live truth.
    expect(res._body.data[0].attendance_status).toBe('checked_in');
    expect(res._body.data[0].status).toBe('absent');
  });
});

describe('reassignSlot', () => {
  const admin = { id: 'admin-1', role: 'admin' };
  const target = { id: 'f2', role: 'faculty', status: 'active', deleted_at: null, name: 'New Fac', telegram_id: null };

  function setup(slot) {
    vi.spyOn(prisma.dutySlot, 'findUnique').mockResolvedValue(slot);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(target);
    vi.spyOn(prisma.dutySlot, 'update').mockResolvedValue({ id: slot.id, faculty_id: 'f2' });
    vi.spyOn(prisma.dutyReassignment, 'create').mockResolvedValue({ id: 'r1' });
    vi.spyOn(prisma.dutyAttendance, 'update').mockResolvedValue({ id: 'a1', faculty_id: 'f2' });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});
    vi.spyOn(prisma, '$transaction').mockResolvedValue([{ id: slot.id, faculty_id: 'f2' }, { id: 'r1' }]);
  }
  afterEach(() => vi.restoreAllMocks());

  function reassignReq() {
    return { params: { id: 's1' }, body: { to_faculty_id: 'f2' }, user: admin };
  }

  it('reassigns an absent no-show slot — resets status to scheduled and repoints the placeholder', async () => {
    setup({
      id: 's1', faculty_id: 'f1', status: 'absent',
      duty_date: FUTURE_DATE, session_type: 'morning',
      attendance: { id: 'a1', in_time: null, out_time: null }, // cron no-show placeholder
      faculty: { id: 'f1', name: 'Old Fac', telegram_id: null },
    });
    const res = makeRes();
    await reassignSlot(reassignReq(), res);

    expect(res._status).toBe(200);
    expect(prisma.dutySlot.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ faculty_id: 'f2', status: 'scheduled' }),
    }));
    // Placeholder attendance handed to the new owner so their check-in updates it.
    expect(prisma.dutyAttendance.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a1' }, data: { faculty_id: 'f2' },
    }));
  });

  it('blocks reassignment when a real check-in exists (409 ATTENDANCE_EXISTS)', async () => {
    setup({
      id: 's1', faculty_id: 'f1', status: 'scheduled',
      duty_date: FUTURE_DATE, session_type: 'morning',
      attendance: { id: 'a1', in_time: new Date(), out_time: null }, // actually checked in
      faculty: { id: 'f1', name: 'Old Fac', telegram_id: null },
    });
    const res = makeRes();
    await reassignSlot(reassignReq(), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('ATTENDANCE_EXISTS');
    expect(prisma.dutySlot.update).not.toHaveBeenCalled();
  });

  it('blocks reassignment of a genuinely completed duty (409 SLOT_NOT_REASSIGNABLE)', async () => {
    setup({
      id: 's1', faculty_id: 'f1', status: 'completed',
      duty_date: FUTURE_DATE, session_type: 'morning',
      attendance: { id: 'a1', in_time: new Date(), out_time: new Date() },
      faculty: { id: 'f1', name: 'Old Fac', telegram_id: null },
    });
    const res = makeRes();
    await reassignSlot(reassignReq(), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('SLOT_NOT_REASSIGNABLE');
    expect(prisma.dutySlot.update).not.toHaveBeenCalled();
  });
});
