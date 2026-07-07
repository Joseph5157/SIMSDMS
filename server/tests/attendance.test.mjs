import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService = _require('../services/settings.service');
const { nowInIST }     = _require('../lib/time');
const { getMySummary } = _require('../controllers/attendance.controller');

const ist = nowInIST();
const year  = ist.year;
const month = ist.month;

const todayUTC     = new Date(Date.UTC(ist.year, ist.month - 1, ist.day));
const yesterdayUTC = new Date(Date.UTC(ist.year, ist.month - 1, ist.day - 1));
const tomorrowUTC  = new Date(Date.UTC(ist.year, ist.month - 1, ist.day + 1));

// Cutoffs derived relative to the actual current IST time so "today" slots
// deterministically fall on either side of their session's not-checked-in
// cutoff no matter when this suite runs — mirrors cron.test.mjs's convention.
const nowMins    = ist.hour * 60 + ist.minute;
const pastMins   = Math.max(0, nowMins - 60);
const futureMins = Math.min(1439, nowMins + 60);

const cutoffPassedSettings = {
  not_checked_in_morning_hour:   Math.floor(pastMins / 60),
  not_checked_in_morning_min:    pastMins % 60,
  not_checked_in_afternoon_hour: Math.floor(pastMins / 60),
  not_checked_in_afternoon_min:  pastMins % 60,
};

const cutoffPendingSettings = {
  not_checked_in_morning_hour:   Math.floor(futureMins / 60),
  not_checked_in_morning_min:    futureMins % 60,
  not_checked_in_afternoon_hour: Math.floor(futureMins / 60),
  not_checked_in_afternoon_min:  futureMins % 60,
};

function makeReq(query = {}) {
  return { query, user: { id: 'f1', role: 'faculty' } };
}
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

describe('getMySummary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 for an invalid month', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(cutoffPassedSettings);
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await getMySummary(makeReq({ year, month: 13 }), res);
    expect(res._status).toBe(400);
    expect(res._body.code).toBe('BAD_REQUEST');
  });

  it('marks a past slot with no attendance as not_checked_in, unconditionally', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(cutoffPendingSettings);
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([
      { id: 's1', duty_date: yesterdayUTC, session_type: 'morning', status: 'scheduled', attendance: null },
    ]);
    const res = makeRes();
    await getMySummary(makeReq({ year, month }), res);
    expect(res._body.data[0].attendance_status).toBe('not_checked_in');
    expect(res._body.summary.not_checked_in).toBe(1);
  });

  it('marks a future slot as upcoming even if the cutoff has passed', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(cutoffPassedSettings);
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([
      { id: 's1', duty_date: tomorrowUTC, session_type: 'afternoon', status: 'scheduled', attendance: null },
    ]);
    const res = makeRes();
    await getMySummary(makeReq({ year, month }), res);
    expect(res._body.data[0].attendance_status).toBe('upcoming');
    expect(res._body.summary.not_checked_in).toBe(0);
  });

  it("gates today's no-show slot on the configured not-checked-in cutoff", async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(cutoffPendingSettings);
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([
      { id: 's1', duty_date: todayUTC, session_type: 'morning', status: 'scheduled', attendance: null },
    ]);
    const res = makeRes();
    await getMySummary(makeReq({ year, month }), res);
    expect(res._body.data[0].attendance_status).toBe('upcoming');
    expect(res._body.today.attendance_status).toBe('upcoming');
  });

  it('counts a checked-in, checked-out, late, auto-out slot correctly and per session', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(cutoffPendingSettings);
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([
      {
        id: 's1', duty_date: yesterdayUTC, session_type: 'morning', status: 'completed',
        attendance: { in_time: yesterdayUTC, out_time: yesterdayUTC, in_status: 'late', out_status: 'auto', auto_out: true },
      },
      {
        id: 's2', duty_date: yesterdayUTC, session_type: 'afternoon', status: 'completed',
        attendance: { in_time: yesterdayUTC, out_time: yesterdayUTC, in_status: 'normal', out_status: 'normal', auto_out: false },
      },
    ]);
    const res = makeRes();
    await getMySummary(makeReq({ year, month }), res);

    expect(res._body.summary.checked_in).toBe(2);
    expect(res._body.summary.checked_out).toBe(2);
    expect(res._body.summary.late).toBe(1);
    expect(res._body.summary.auto_out).toBe(1);
    expect(res._body.summary.morning).toEqual(
      expect.objectContaining({ checked_in: 1, checked_out: 1, late: 1, auto_out: 1 }),
    );
    expect(res._body.summary.afternoon).toEqual(
      expect.objectContaining({ checked_in: 1, checked_out: 1, late: 0, auto_out: 0 }),
    );
  });

  it('scopes slots to the requesting faculty as assignee or covering faculty', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(cutoffPendingSettings);
    const findMany = vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([]);
    const res = makeRes();
    await getMySummary(makeReq({ year, month }), res);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ faculty_id: 'f1' }, { covered_by: 'f1' }],
        }),
      }),
    );
  });
});
