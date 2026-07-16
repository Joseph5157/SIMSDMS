import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma = _require('../lib/prisma');
const telegram = _require('../lib/telegram');
const { createRequest, cancelRequest, respondToRequest } = _require('../controllers/duty-reassignment-requests.controller');

function makeReq(b = {}, userId = 'f1', params = {}) { return { body: b, user: { id: userId, role: 'faculty' }, params }; }
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const scheduledSlot = {
  id: 'slot-1',
  faculty_id: 'f1',
  duty_date: futureDate,
  session_type: 'morning',
  status: 'scheduled',
  attendance: null,
};
const validBody = { duty_slot_id: 'slot-1', to_faculty_id: 'f2', reason: 'sick' };

describe('createRequest', () => {
  beforeEach(() => {
    vi.spyOn(prisma.dutySlot, 'findUnique').mockResolvedValue(scheduledSlot);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'f2', role: 'faculty', status: 'active', deleted_at: null });
    vi.spyOn(prisma.dutySlot, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.dutyReassignmentRequest, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.dutyReassignmentRequest, 'create').mockResolvedValue({
      id: 'req-1',
      fromFaculty: { id: 'f1', name: 'A', telegram_id: null },
      toFaculty:   { id: 'f2', name: 'B', telegram_id: null },
      dutySlot:    { duty_date: futureDate, session_type: 'morning' },
    });
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  it('rejects a request targeting yourself with 422 VALIDATION_ERROR, before ever creating a request', async () => {
    const res = makeRes();
    await createRequest(makeReq({ ...validBody, to_faculty_id: 'f1' }, 'f1'), res);

    expect(res._status).toBe(422);
    expect(res._body.code).toBe('VALIDATION_ERROR');
    expect(prisma.dutyReassignmentRequest.create).not.toHaveBeenCalled();
  });

  it('creates the request on the success path when to_faculty_id differs from the requester', async () => {
    const res = makeRes();
    await createRequest(makeReq(validBody, 'f1'), res);

    expect(res._status).toBe(201);
    expect(prisma.dutyReassignmentRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ from_faculty_id: 'f1', to_faculty_id: 'f2' }),
      }),
    );
  });

  it('returns 409 REQUEST_EXISTS when a concurrent request wins the race (P2002 from the partial unique index)', async () => {
    // findFirst (the pre-check) can miss a concurrent insert that lands between
    // the check and this create — the DB's partial unique index is the real guard.
    prisma.dutyReassignmentRequest.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res = makeRes();
    await createRequest(makeReq(validBody, 'f1'), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('REQUEST_EXISTS');
  });
});

describe('respondToRequest', () => {
  const pendingRequest = {
    id: 'req-1',
    duty_slot_id: 'slot-1',
    from_faculty_id: 'f1',
    to_faculty_id: 'f2',
    reason: null,
    status: 'pending',
    dutySlot:    { id: 'slot-1', duty_date: futureDate, session_type: 'morning', status: 'scheduled', attendance: null },
    fromFaculty: { id: 'f1', name: 'A', telegram_id: 'chat-1' },
    toFaculty:   { id: 'f2', name: 'B', telegram_id: 'chat-2' },
  };

  beforeEach(() => {
    vi.spyOn(prisma.dutyReassignmentRequest, 'findUnique').mockResolvedValue(pendingRequest);
    vi.spyOn(prisma.dutyReassignmentRequest, 'updateMany').mockResolvedValue({ count: 1 });
    vi.spyOn(prisma, '$transaction');
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  // Mirrors the interactive-$transaction mock pattern from duty-slots.test.mjs.
  // Returns the mocked tx object so tests can assert on calls made (or not
  // made) inside the transaction.
  function tx({ claimCount = 1 } = {}) {
    const t = {
      dutyReassignmentRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
        findUnique: vi.fn().mockResolvedValue({ ...pendingRequest, status: 'approved' }),
      },
      dutySlot:         { update: vi.fn().mockResolvedValue({}) },
      dutyReassignment: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementationOnce(async (fn) => fn(t));
    return t;
  }

  it('declines a pending request and notifies the requester', async () => {
    const res = makeRes();
    await respondToRequest(makeReq({ status: 'declined' }, 'f2', { id: 'req-1' }), res);

    expect(res._status).toBe(200);
    expect(prisma.dutyReassignmentRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'req-1', status: 'pending', to_faculty_id: 'f2' }),
        data: expect.objectContaining({ status: 'declined' }),
      }),
    );
    expect(telegram.sendMessage).toHaveBeenCalledWith('chat-1', expect.stringContaining('Declined'));
  });

  it('returns 409 when declining a request a concurrent responder (e.g. Telegram) already claimed', async () => {
    prisma.dutyReassignmentRequest.updateMany.mockResolvedValue({ count: 0 });
    const res = makeRes();
    await respondToRequest(makeReq({ status: 'declined' }, 'f2', { id: 'req-1' }), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('CONFLICT');
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('approves a pending request, transfers the slot inside the transaction, and notifies both faculty', async () => {
    const t = tx({ claimCount: 1 });
    const res = makeRes();
    await respondToRequest(makeReq({ status: 'approved' }, 'f2', { id: 'req-1' }), res);

    expect(res._status).toBe(200);
    expect(t.dutySlot.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'slot-1' }, data: { faculty_id: 'f2' } }),
    );
    expect(t.dutyReassignment.create).toHaveBeenCalled();
    expect(telegram.sendMessage).toHaveBeenCalledWith('chat-1', expect.stringContaining('Accepted'));
    expect(telegram.sendMessage).toHaveBeenCalledWith('chat-2', expect.stringContaining('Transferred'));
  });

  it('aborts the whole transaction — no slot transfer, no history row — when a concurrent responder wins the approve race', async () => {
    const t = tx({ claimCount: 0 });
    const res = makeRes();
    await respondToRequest(makeReq({ status: 'approved' }, 'f2', { id: 'req-1' }), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('CONFLICT');
    expect(t.dutySlot.update).not.toHaveBeenCalled();
    expect(t.dutyReassignment.create).not.toHaveBeenCalled();
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe('cancelRequest', () => {
  const pendingRequest = {
    id: 'req-1',
    from_faculty_id: 'f1',
    to_faculty_id:   'f2',
    status: 'pending',
    dutySlot:    { duty_date: futureDate, session_type: 'morning' },
    fromFaculty: { id: 'f1', name: 'A' },
    toFaculty:   { id: 'f2', name: 'B', telegram_id: 'chat-2' },
  };

  beforeEach(() => {
    vi.spyOn(prisma.dutyReassignmentRequest, 'findUnique').mockResolvedValue(pendingRequest);
    vi.spyOn(prisma.dutyReassignmentRequest, 'updateMany').mockResolvedValue({ count: 1 });
    vi.spyOn(telegram, 'sendMessage').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 404 when the request does not exist', async () => {
    prisma.dutyReassignmentRequest.findUnique.mockResolvedValue(null);
    const res = makeRes();
    await cancelRequest(makeReq({}, 'f1', { id: 'req-1' }), res);
    expect(res._status).toBe(404);
    expect(res._body.code).toBe('NOT_FOUND');
  });

  it('returns 403 when someone other than the original requester tries to cancel', async () => {
    const res = makeRes();
    await cancelRequest(makeReq({}, 'f2', { id: 'req-1' }), res);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('FORBIDDEN');
    expect(prisma.dutyReassignmentRequest.updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when the request is no longer pending', async () => {
    prisma.dutyReassignmentRequest.findUnique.mockResolvedValue({ ...pendingRequest, status: 'approved' });
    const res = makeRes();
    await cancelRequest(makeReq({}, 'f1', { id: 'req-1' }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('CONFLICT');
    expect(prisma.dutyReassignmentRequest.updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when a concurrent responder (e.g. Telegram) claims the request first', async () => {
    prisma.dutyReassignmentRequest.updateMany.mockResolvedValue({ count: 0 });
    const res = makeRes();
    await cancelRequest(makeReq({}, 'f1', { id: 'req-1' }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('CONFLICT');
  });

  it('cancels a pending request by its original requester and notifies the target faculty', async () => {
    const res = makeRes();
    await cancelRequest(makeReq({}, 'f1', { id: 'req-1' }), res);

    expect(res._status).toBe(200);
    expect(prisma.dutyReassignmentRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'req-1', status: 'pending', from_faculty_id: 'f1' }),
        data: expect.objectContaining({ status: 'cancelled', responded_by_id: 'f1' }),
      }),
    );
    expect(telegram.sendMessage).toHaveBeenCalledWith('chat-2', expect.stringContaining('withdrew'));
  });
});
