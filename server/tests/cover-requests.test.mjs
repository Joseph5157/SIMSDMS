import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma           = _require('../lib/prisma');
const settingsService  = _require('../services/settings.service');
const { nowInIST, istWallToUTC } = _require('../lib/time');
const { createCoverRequest, volunteer, getOpenRequests } = _require('../controllers/cover-requests.controller');

function makeReq({ body = {}, params = {}, user = { id: 'f1', role: 'faculty' } } = {}) {
  return { body, params, user };
}
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

const ist      = nowInIST();
const todayUTC = new Date(Date.UTC(ist.year, ist.month - 1, ist.day));

// Cutoffs derived relative to the actual current IST time (same approach as
// cron.test.mjs) so "past" / "future" deterministically fall on either side
// of now no matter when this suite runs — clamped to a single day.
const nowMins    = ist.hour * 60 + ist.minute;
const pastMins   = Math.max(0, nowMins - 60);
const futureMins = Math.min(1439, nowMins + 60);
const hm = (mins) => ({ hour: Math.floor(mins / 60), min: mins % 60 });
const cutoffPast   = hm(pastMins);
const cutoffFuture = hm(futureMins);

function makeCfg({ morning = cutoffFuture, afternoon = cutoffFuture } = {}) {
  return {
    not_checked_in_morning_hour:   morning.hour,
    not_checked_in_morning_min:    morning.min,
    not_checked_in_afternoon_hour: afternoon.hour,
    not_checked_in_afternoon_min:  afternoon.min,
  };
}

describe('createCoverRequest', () => {
  const slot = { id: 'slot-1', faculty_id: 'f1', duty_date: todayUTC, session_type: 'morning', status: 'scheduled' };

  beforeEach(() => {
    vi.spyOn(prisma.dutySlot, 'findUnique').mockResolvedValue(slot);
    vi.spyOn(prisma.coverRequest, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma, '$transaction');
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 409 TOO_LATE when the not-checked-in cutoff for the session has already passed', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(makeCfg({ morning: cutoffPast }));
    const res = makeRes();
    await createCoverRequest(makeReq({ body: { duty_slot_id: 'slot-1' } }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('TOO_LATE');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates the cover request with expires_at at end of the duty day (23:59:59.999 IST) when the cutoff has not passed', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(makeCfg({ morning: cutoffFuture }));
    const created = { id: 'cr-1', dutySlot: slot, requester: { name: 'F' } };
    let capturedData;
    prisma.$transaction.mockImplementationOnce(async (fn) => fn({
      coverRequest: { create: vi.fn((args) => { capturedData = args.data; return Promise.resolve(created); }) },
      dutySlot:     { update: vi.fn().mockResolvedValue({}) },
    }));

    const res = makeRes();
    await createCoverRequest(makeReq({ body: { duty_slot_id: 'slot-1' } }), res);

    expect(res._status).toBe(201);
    const expectedExpiry = istWallToUTC(ist.year, ist.month, ist.day, 23, 59);
    expectedExpiry.setUTCSeconds(59, 999);
    expect(capturedData.expires_at).toEqual(expectedExpiry);
  });
});

describe('volunteer', () => {
  const dutySlot = { duty_date: todayUTC, session_type: 'morning' };
  const endOfDayExpiry = (() => {
    const d = istWallToUTC(ist.year, ist.month, ist.day, 23, 59);
    d.setUTCSeconds(59, 999);
    return d;
  })();
  const baseCoverRequest = {
    id: 'cr-1',
    status: 'open',
    requested_by: 'f2',
    volunteer_id: null,
    expires_at: endOfDayExpiry,
    dutySlot,
  };

  beforeEach(() => {
    vi.spyOn(prisma.coverRequest, 'findUnique').mockResolvedValue(baseCoverRequest);
    vi.spyOn(prisma.dutySlot, 'findFirst').mockResolvedValue(null); // no double-booking conflict
    vi.spyOn(prisma.coverRequest, 'updateMany').mockResolvedValue({ count: 1 });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null); // notifyUser no-op
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 409 VOLUNTEER_WINDOW_CLOSED when the not-checked-in cutoff has passed, even though the record has not expired yet', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(makeCfg({ morning: cutoffPast }));
    const res = makeRes();
    await volunteer(makeReq({ params: { id: 'cr-1' }, user: { id: 'f3', role: 'faculty' } }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('VOLUNTEER_WINDOW_CLOSED');
    expect(prisma.coverRequest.updateMany).not.toHaveBeenCalled();
  });

  it('still allows volunteering when the cutoff has not passed', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(makeCfg({ morning: cutoffFuture }));
    prisma.coverRequest.findUnique
      .mockResolvedValueOnce(baseCoverRequest)
      .mockResolvedValueOnce({ ...baseCoverRequest, volunteer_id: 'f3' });

    const res = makeRes();
    await volunteer(makeReq({ params: { id: 'cr-1' }, user: { id: 'f3', role: 'faculty' } }), res);
    expect(res._status).toBe(200);
    expect(prisma.coverRequest.updateMany).toHaveBeenCalled();
  });

  it('still returns EXPIRED when the record-level expiry has passed, independent of the new cutoff check', async () => {
    const expired = { ...baseCoverRequest, expires_at: new Date(Date.now() - 1000) };
    prisma.coverRequest.findUnique.mockResolvedValue(expired);
    const getSettingsSpy = vi.spyOn(settingsService, 'getSettings').mockResolvedValue(makeCfg({ morning: cutoffFuture }));

    const res = makeRes();
    await volunteer(makeReq({ params: { id: 'cr-1' }, user: { id: 'f3', role: 'faculty' } }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('EXPIRED');
    expect(getSettingsSpy).not.toHaveBeenCalled();
  });
});

describe('getOpenRequests', () => {
  afterEach(() => vi.restoreAllMocks());

  it('includes the requesting user\'s own open request in the response', async () => {
    const ownRequest = { id: 'cr-own', status: 'open', requested_by: 'f1', dutySlot: { duty_date: todayUTC, session_type: 'morning' } };
    const findMany = vi.spyOn(prisma.coverRequest, 'findMany').mockResolvedValue([ownRequest]);

    const res = makeRes();
    await getOpenRequests(makeReq({ user: { id: 'f1', role: 'faculty' } }), res);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'open', expires_at: { gt: expect.any(Date) } },
    }));
    expect(res._body.data).toEqual([ownRequest]);
  });
});
