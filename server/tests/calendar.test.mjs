import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma   = _require('../lib/prisma');
const telegram = _require('../lib/telegram');
const {
  getConfig, openWindow, closeWindow, updateBlockedDates, assignSlots,
} = _require('../controllers/calendar.controller');

function makeReq({ params = {}, body = {}, user = { id: 'admin-1', role: 'admin' } } = {}) {
  return { params, body, user };
}
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

describe('parseParams (via getConfig)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects an invalid year', async () => {
    const res = makeRes();
    await getConfig(makeReq({ params: { year: '1999', month: '6' } }), res);
    expect(res._status).toBe(400);
  });

  it('rejects a month outside 1-12', async () => {
    const res = makeRes();
    await getConfig(makeReq({ params: { year: '2026', month: '13' } }), res);
    expect(res._status).toBe(400);
  });
});

describe('openWindow', () => {
  afterEach(() => vi.restoreAllMocks());

  // notifyAllFaculty is fire-and-forget (openWindow does not await it) —
  // returning an empty faculty list keeps it a no-op so it can't leave a
  // dangling timer/mock call after the test finishes.
  function mockNoFacultyToNotify() {
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue({});
  }

  it('returns 409 when the window is already open for that month', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({ id: 'c1', is_window_open: true });
    mockNoFacultyToNotify();
    const res = makeRes();
    await openWindow(makeReq({ params: { year: '2026', month: '7' } }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('WINDOW_ALREADY_OPEN');
  });

  it('opens the window, deriving working_days as every day minus blocked holidays', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({
      id: 'c1', is_window_open: false, blocked_dates: ['2026-07-04'],
    });
    const update = vi.spyOn(prisma.calendarConfig, 'update').mockImplementation(async ({ data }) => ({ id: 'c1', ...data }));
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});
    mockNoFacultyToNotify();

    const res = makeRes();
    // July 2026 has 31 days; one is blocked.
    await openWindow(makeReq({ params: { year: '2026', month: '7' } }), res);

    expect(res._status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ is_window_open: true }),
      }),
    );
    const workingDays = update.mock.calls[0][0].data.working_days;
    expect(workingDays).toHaveLength(30);
    expect(workingDays).not.toContain('2026-07-04');
  });

  it('creates a fresh CalendarConfig row when none exists yet for the month', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.calendarConfig, 'create').mockResolvedValue({ id: 'new-c1', is_window_open: false, blocked_dates: [] });
    vi.spyOn(prisma.calendarConfig, 'update').mockImplementation(async ({ data }) => ({ id: 'new-c1', ...data }));
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});
    mockNoFacultyToNotify();

    const res = makeRes();
    await openWindow(makeReq({ params: { year: '2026', month: '8' } }), res);
    expect(res._status).toBe(200);
  });
});

describe('closeWindow', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 404 when no config exists for the month', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue(null);
    const res = makeRes();
    await closeWindow(makeReq({ params: { year: '2026', month: '7' } }), res);
    expect(res._status).toBe(404);
  });

  it('returns 409 when the window is not currently open', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({ id: 'c1', is_window_open: false });
    const res = makeRes();
    await closeWindow(makeReq({ params: { year: '2026', month: '7' } }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('WINDOW_NOT_OPEN');
  });

  it('closes an open window', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({ id: 'c1', is_window_open: true });
    vi.spyOn(prisma.calendarConfig, 'update').mockResolvedValue({ id: 'c1', is_window_open: false });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});
    const res = makeRes();
    await closeWindow(makeReq({ params: { year: '2026', month: '7' } }), res);
    expect(res._status).toBe(200);
    expect(res._body.is_window_open).toBe(false);
  });
});

describe('updateBlockedDates', () => {
  afterEach(() => vi.restoreAllMocks());

  it('re-derives working_days from the new blocked-dates list', async () => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({ id: 'c1', blocked_dates: [] });
    const update = vi.spyOn(prisma.calendarConfig, 'update').mockImplementation(async ({ data }) => ({ id: 'c1', ...data }));
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});

    const res = makeRes();
    await updateBlockedDates(makeReq({
      params: { year: '2026', month: '7' },
      body: { blocked_dates: ['2026-07-04', '2026-07-15'] },
    }), res);

    expect(res._status).toBe(200);
    const workingDays = update.mock.calls[0][0].data.working_days;
    expect(workingDays).toHaveLength(29);
    expect(workingDays).not.toContain('2026-07-04');
    expect(workingDays).not.toContain('2026-07-15');
  });
});

describe('assignSlots', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 404 for a faculty id that does not exist', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const res = makeRes();
    await assignSlots(makeReq({
      params: { year: '2026', month: '7', facultyId: 'ghost' },
      body: { slots: [] },
    }), res);
    expect(res._status).toBe(404);
  });

  it('skips a duplicate slot within the same request, and one already taken by another faculty', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'f1', role: 'faculty', deleted_at: null });
    vi.spyOn(prisma.dutySlot, 'findUnique')
      .mockResolvedValueOnce(null)              // first occurrence of slot A: free
      .mockResolvedValueOnce({ id: 'taken' });  // slot B: already taken
    vi.spyOn(prisma, '$transaction').mockResolvedValue([{ id: 'new-slot' }]);
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});

    const res = makeRes();
    await assignSlots(makeReq({
      params: { year: '2026', month: '7', facultyId: 'f1' },
      body: {
        slots: [
          { duty_date: '2026-07-10', session_type: 'morning' },
          { duty_date: '2026-07-10', session_type: 'morning' }, // duplicate of the one above
          { duty_date: '2026-07-11', session_type: 'afternoon' }, // already taken
        ],
      },
    }), res);

    expect(res._status).toBe(201);
    expect(res._body.created_count).toBe(1);
    expect(res._body.skipped_count).toBe(2);
    expect(res._body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'Duplicate in request.' }),
        expect.objectContaining({ reason: 'This slot is already taken.' }),
      ]),
    );
  });

  it('returns 409 SLOT_TAKEN when a concurrent request wins the race (P2002)', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'f1', role: 'faculty', deleted_at: null });
    vi.spyOn(prisma.dutySlot, 'findUnique').mockResolvedValue(null);
    const err = Object.assign(new Error('unique constraint'), { code: 'P2002' });
    vi.spyOn(prisma, '$transaction').mockRejectedValue(err);

    const res = makeRes();
    await assignSlots(makeReq({
      params: { year: '2026', month: '7', facultyId: 'f1' },
      body: { slots: [{ duty_date: '2026-07-10', session_type: 'morning' }] },
    }), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('SLOT_TAKEN');
  });
});
