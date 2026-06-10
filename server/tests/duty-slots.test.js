const { vi, describe, it, expect, beforeEach } = require('vitest');

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/prisma', () => ({
  calendarConfig: {
    findUnique: vi.fn(),
  },
  dutySlot: {
    count: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

const prisma = require('../lib/prisma');
const { pickSlot } = require('../controllers/duty-slots.controller');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body = {}) {
  return {
    body,
    user: { id: 'faculty-1', role: 'faculty' },
    params: {},
  };
}

function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body) => { res._body = body; return res; };
  return res;
}

const openConfig = {
  is_window_open: true,
  working_days: ['2026-06-10'],
  sessions_per_faculty: 3,
};

// Utility: makes prisma.$transaction call the async function with a mock tx
function txWith({ count = 0, createResult = null, createError = null }) {
  return prisma.$transaction.mockImplementationOnce(async (fn) => {
    const tx = {
      dutySlot: {
        count: vi.fn().mockResolvedValue(count),
        create: createError
          ? vi.fn().mockRejectedValue(createError)
          : vi.fn().mockResolvedValue(createResult),
      },
    };
    return fn(tx);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pickSlot', () => {
  const validBody = { duty_date: '2026-06-10', session_type: 'morning' };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.calendarConfig.findUnique.mockResolvedValue(openConfig);
  });

  it('returns 409 LIMIT_REACHED when faculty has already picked the maximum slots', async () => {
    txWith({ count: 3 }); // count equals sessions_per_faculty (3)

    const req = makeReq(validBody);
    const res = makeRes();

    await pickSlot(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('LIMIT_REACHED');
  });

  it('returns 409 SLOT_TAKEN when Prisma throws a P2002 unique constraint error', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    txWith({ count: 0, createError: p2002 });

    const req = makeReq(validBody);
    const res = makeRes();

    await pickSlot(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('SLOT_TAKEN');
  });

  it('returns 201 with the new slot on success', async () => {
    const newSlot = {
      id: 'slot-uuid',
      faculty_id: 'faculty-1',
      duty_date: new Date('2026-06-10'),
      session_type: 'morning',
      status: 'scheduled',
    };
    txWith({ count: 0, createResult: newSlot });

    const req = makeReq(validBody);
    const res = makeRes();

    await pickSlot(req, res);

    expect(res._status).toBe(201);
    expect(res._body).toEqual(newSlot);
  });

  it('returns 409 WINDOW_CLOSED when the scheduling window is not open', async () => {
    prisma.calendarConfig.findUnique.mockResolvedValue({ ...openConfig, is_window_open: false });

    const req = makeReq(validBody);
    const res = makeRes();

    await pickSlot(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('WINDOW_CLOSED');
  });

  it('returns 409 WINDOW_CLOSED when no calendar config exists', async () => {
    prisma.calendarConfig.findUnique.mockResolvedValue(null);

    const req = makeReq(validBody);
    const res = makeRes();

    await pickSlot(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('WINDOW_CLOSED');
  });
});
