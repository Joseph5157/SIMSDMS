const { vi, describe, it, expect, beforeEach } = require('vitest');

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/prisma', () => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  otpSession: {
    findFirst: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../lib/telegram', () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('$2b$10$hashedotp'),
  compare: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('test-jwt-token'),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { requestOtp, verifyOtp } = require('../controllers/auth.controller');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body = {}) {
  return { body, cookies: {}, headers: {} };
}

function makeRes() {
  const res = {
    _cookies: {},
    _status: 200,
    _body: null,
  };
  res.status = (code) => { res._status = code; return res; };
  res.json   = (body) => { res._body = body; return res; };
  res.cookie = (name, val, opts) => { res._cookies[name] = val; return res; };
  res.clearCookie = (name) => { delete res._cookies[name]; return res; };
  return res;
}

// Active user fixture
const activeUser = {
  id: 'user-1',
  email: 'faculty@sims.edu',
  status: 'active',
  telegram_id: '123456789',
  telegram_verified: true,
  otp_failed_attempts: 0,
  session_version: 1,
  deleted_at: null,
  name: 'Dr. Test',
  role: 'faculty',
  department: 'Pharmacy',
  designation: 'Associate Professor',
  phone: null,
  approved_at: new Date(),
  created_at: new Date(),
};

// ─── requestOtp tests ─────────────────────────────────────────────────────────

describe('requestOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null); // default: unknown user
    prisma.otpSession.findFirst.mockResolvedValue(null);
    prisma.otpSession.updateMany.mockResolvedValue({ count: 0 });
    prisma.otpSession.create.mockResolvedValue({});
    bcrypt.hash.mockResolvedValue('$2b$10$hashedotp');
  });

  it('returns 200 generic response for an unknown email (ISSUE-09: no account enumeration)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = makeReq({ email: 'nobody@unknown.com' });
    const res = makeRes();

    await requestOtp(req, res);

    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/if an account exists/i);
  });

  it('returns 200 generic response for a deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, deleted_at: new Date() });
    const req = makeReq({ email: activeUser.email });
    const res = makeRes();

    await requestOtp(req, res);

    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/if an account exists/i);
  });

  it('returns 403 ACCOUNT_LOCKED when the user has too many failed attempts', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, otp_failed_attempts: 5 });
    const req = makeReq({ email: activeUser.email });
    const res = makeRes();

    await requestOtp(req, res);

    expect(res._status).toBe(403);
    expect(res._body.code).toBe('ACCOUNT_LOCKED');
  });

  it('expires prior unverified OTP sessions before creating a new one (ISSUE-10)', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.otpSession.findFirst.mockResolvedValue(null); // no cooldown session
    const req = makeReq({ email: activeUser.email });
    const res = makeRes();

    await requestOtp(req, res);

    expect(prisma.otpSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: activeUser.id, verified: false },
        data: expect.objectContaining({ expires_at: expect.any(Date) }),
      }),
    );
  });

  it('returns 200 generic response on success (does not reveal account existence)', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.otpSession.findFirst.mockResolvedValue(null);
    const req = makeReq({ email: activeUser.email });
    const res = makeRes();

    await requestOtp(req, res);

    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/if an account exists/i);
  });
});

// ─── verifyOtp tests ──────────────────────────────────────────────────────────

describe('verifyOtp', () => {
  const mockSession = { id: 'session-1', otp_hash: '$2b$10$hashedotp', attempt_count: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.otpSession.findFirst.mockResolvedValue(mockSession);
    prisma.otpSession.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    bcrypt.compare.mockResolvedValue(false); // default: wrong OTP
  });

  it('returns 401 ACCOUNT_LOCKED and records the failure when the 5th wrong OTP is entered', async () => {
    const userWith4Failures = { ...activeUser, otp_failed_attempts: 4 };
    prisma.user.findUnique.mockResolvedValue(userWith4Failures);
    bcrypt.compare.mockResolvedValue(false);

    const req = makeReq({ email: activeUser.email, otp: '000000' });
    const res = makeRes();

    await verifyOtp(req, res);

    // The user update should record otp_failed_attempts: 5
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: activeUser.id },
        data: { otp_failed_attempts: 5 },
      }),
    );
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('ACCOUNT_LOCKED');
  });

  it('sets sims_token and sims_csrf cookies on a successful OTP verification', async () => {
    bcrypt.compare.mockResolvedValue(true); // correct OTP

    const req = makeReq({ email: activeUser.email, otp: '123456' });
    const res = makeRes();

    await verifyOtp(req, res);

    expect(res._cookies['sims_token']).toBe('test-jwt-token');
    expect(res._cookies['sims_csrf']).toBeDefined();
    expect(typeof res._cookies['sims_csrf']).toBe('string');
    expect(res._cookies['sims_csrf'].length).toBeGreaterThan(0);
  });

  it('returns 401 INVALID_CREDENTIALS for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = makeReq({ email: 'nobody@sims.edu', otp: '123456' });
    const res = makeRes();

    await verifyOtp(req, res);

    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 OTP_EXPIRED when no active session exists', async () => {
    prisma.otpSession.findFirst.mockResolvedValue(null);
    const req = makeReq({ email: activeUser.email, otp: '123456' });
    const res = makeRes();

    await verifyOtp(req, res);

    expect(res._status).toBe(401);
    expect(res._body.code).toBe('OTP_EXPIRED');
  });
});
