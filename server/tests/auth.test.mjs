// Load via createRequire so test and controllers share the same Node CJS cache.
// vi.spyOn on the shared prisma object then intercepts controller calls too.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _require   = createRequire(import.meta.url);

const prisma   = _require('../lib/prisma');
const bcrypt   = _require('bcryptjs');
const jwt      = _require('jsonwebtoken');
const telegram = _require('../lib/telegram');
const { requestOtp, verifyOtp } = _require('../controllers/auth.controller');

const activeUser = {
  id: 'user-1', email: 'faculty@sims.edu', status: 'active', telegram_id: '123456789',
  telegram_verified: true, otp_failed_attempts: 0, session_version: 1, deleted_at: null,
  name: 'Dr. Test', role: 'faculty', department: 'Pharmacy', designation: 'AP',
  phone: null, approved_at: new Date(), created_at: new Date(),
};
const mockSession = { id: 'session-1', otp_hash: '$2b$10$h', attempt_count: 0 };

function makeReq(body = {}) { return { body, cookies: {}, headers: {} }; }
function makeRes() {
  const res = { _status: 200, _body: null, _cookies: {} };
  res.status = (c) => { res._status = c; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.cookie = (n, v) => { res._cookies[n] = v; return res; };
  res.clearCookie = (n) => { delete res._cookies[n]; return res; };
  return res;
}

describe('requestOtp', () => {
  beforeEach(() => {
    vi.spyOn(prisma.user,       'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.otpSession, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.otpSession, 'updateMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.otpSession, 'create').mockResolvedValue({});
    vi.spyOn(bcrypt,            'hash').mockResolvedValue('$2b$h');
    vi.spyOn(telegram,          'sendMessage').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns generic 200 for an unknown email — no account enumeration (ISSUE-09)', async () => {
    const res = makeRes();
    await requestOtp(makeReq({ email: 'nobody@unknown.com' }), res);
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/if an account exists/i);
  });

  it('returns generic 200 for a deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, deleted_at: new Date() });
    const res = makeRes();
    await requestOtp(makeReq({ email: activeUser.email }), res);
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/if an account exists/i);
  });

  it('returns 403 ACCOUNT_LOCKED when the failure limit is reached', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, otp_failed_attempts: 5 });
    const res = makeRes();
    await requestOtp(makeReq({ email: activeUser.email }), res);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('ACCOUNT_LOCKED');
  });

  it('expires prior unverified OTP sessions before creating a new one (ISSUE-10)', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const res = makeRes();
    await requestOtp(makeReq({ email: activeUser.email }), res);
    expect(prisma.otpSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: activeUser.id, verified: false }, data: expect.objectContaining({ expires_at: expect.any(Date) }) }),
    );
  });

  it('returns generic 200 on success', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const res = makeRes();
    await requestOtp(makeReq({ email: activeUser.email }), res);
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/if an account exists/i);
  });

  it('returns 403 TELEGRAM_NOT_LINKED for pending_telegram users (relink scenario)', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, status: 'pending_telegram', telegram_id: null });
    const res = makeRes();
    await requestOtp(makeReq({ email: activeUser.email }), res);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('TELEGRAM_NOT_LINKED');
  });
});

describe('verifyOtp', () => {
  beforeEach(() => {
    vi.spyOn(prisma.user,       'findUnique').mockResolvedValue(activeUser);
    vi.spyOn(prisma.user,       'update').mockResolvedValue({});
    vi.spyOn(prisma.otpSession, 'findFirst').mockResolvedValue(mockSession);
    vi.spyOn(prisma.otpSession, 'update').mockResolvedValue({});
    vi.spyOn(bcrypt,            'compare').mockResolvedValue(false);
    vi.spyOn(jwt,               'sign').mockReturnValue('test-jwt-token');
  });
  afterEach(() => vi.restoreAllMocks());

  it('records 5th failure and returns 401 ACCOUNT_LOCKED', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, otp_failed_attempts: 4 });
    bcrypt.compare.mockResolvedValue(false);
    const res = makeRes();
    await verifyOtp(makeReq({ email: activeUser.email, otp: '000000' }), res);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: activeUser.id }, data: { otp_failed_attempts: 5 } }),
    );
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('ACCOUNT_LOCKED');
  });

  it('sets sims_token and sims_csrf cookies on successful OTP verification', async () => {
    bcrypt.compare.mockResolvedValue(true);
    const res = makeRes();
    await verifyOtp(makeReq({ email: activeUser.email, otp: '123456' }), res);
    expect(res._cookies['sims_token']).toBe('test-jwt-token');
    expect(typeof res._cookies['sims_csrf']).toBe('string');
    expect(res._cookies['sims_csrf'].length).toBeGreaterThan(0);
  });

  it('returns 401 INVALID_CREDENTIALS for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = makeRes();
    await verifyOtp(makeReq({ email: 'nobody@sims.edu', otp: '123456' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 OTP_EXPIRED when there is no active session', async () => {
    prisma.otpSession.findFirst.mockResolvedValue(null);
    const res = makeRes();
    await verifyOtp(makeReq({ email: activeUser.email, otp: '123456' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('OTP_EXPIRED');
  });
});
