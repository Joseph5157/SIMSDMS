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
const crypto   = _require('crypto');
const telegram = _require('../lib/telegram');
const { requestOtp, verifyOtp, telegramCallback, login, changePassword } = _require('../controllers/auth.controller');
const audit    = _require('../services/audit.service');

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

describe('telegramCallback', () => {
  const testBotToken = 'test_bot_token_12345';
  const testTelegramId = '987654321';
  const telegramUser = { ...activeUser, telegram_id: testTelegramId };

  function computeValidHash(payload) {
    const fields = Object.keys(payload)
      .filter(key => key !== 'hash' && payload[key] !== null && payload[key] !== undefined)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(testBotToken).digest();
    return crypto.createHmac('sha256', secretKey).update(fields).digest('hex');
  }

  function makeValidPayload(overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const basePayload = {
      id: parseInt(testTelegramId),
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      auth_date: now,
    };
    const payload = { ...basePayload, ...overrides };
    payload.hash = computeValidHash(payload);
    return payload;
  }

  beforeEach(() => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(audit, 'logAction').mockResolvedValue(undefined);
    vi.spyOn(jwt, 'sign').mockReturnValue('test-jwt-token');
    // Mock process.env.TELEGRAM_BOT_TOKEN for the test
    process.env.TELEGRAM_BOT_TOKEN = testBotToken;
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 200 and sets cookies for a valid Telegram payload with active user', async () => {
    prisma.user.findUnique.mockResolvedValue(telegramUser);
    const payload = makeValidPayload();
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(res._status).toBe(200);
    expect(res._cookies['sims_token']).toBe('test-jwt-token');
    expect(typeof res._cookies['sims_csrf']).toBe('string');
    expect(res._cookies['sims_csrf'].length).toBeGreaterThan(0);
    expect(res._body.id).toBe(telegramUser.id);
    expect(res._body.email).toBe(telegramUser.email);
  });

  it('returns 401 INVALID_TELEGRAM_HASH for a tampered hash', async () => {
    prisma.user.findUnique.mockResolvedValue(telegramUser);
    const payload = makeValidPayload();
    payload.hash = 'tampered_hash_value';
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_TELEGRAM_HASH');
  });

  it('returns 401 TELEGRAM_AUTH_EXPIRED for an expired auth_date (>86400 seconds old)', async () => {
    prisma.user.findUnique.mockResolvedValue(telegramUser);
    const now = Math.floor(Date.now() / 1000);
    const expiredDate = now - 86401; // 1 second past the limit
    const payload = makeValidPayload({ auth_date: expiredDate });
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('TELEGRAM_AUTH_EXPIRED');
  });

  it('returns 403 TELEGRAM_NOT_LINKED for an unknown telegram_id', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const payload = makeValidPayload();
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('TELEGRAM_NOT_LINKED');
  });

  it('returns 403 TELEGRAM_NOT_LINKED for a deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...telegramUser, deleted_at: new Date() });
    const payload = makeValidPayload();
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('TELEGRAM_NOT_LINKED');
  });

  it('returns 403 TELEGRAM_NOT_LINKED for an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...telegramUser, status: 'inactive' });
    const payload = makeValidPayload();
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('TELEGRAM_NOT_LINKED');
  });

  it('calls audit.logAction with TELEGRAM_LOGIN action on success', async () => {
    prisma.user.findUnique.mockResolvedValue(telegramUser);
    const payload = makeValidPayload();
    const res = makeRes();
    await telegramCallback(makeReq(payload), res);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: telegramUser.id,
        action: 'TELEGRAM_LOGIN',
        targetId: telegramUser.id,
        targetType: 'user',
        metadata: expect.objectContaining({ telegram_id: testTelegramId }),
      }),
    );
  });
});

describe('login', () => {
  const userWithPassword = {
    id: 'user-1',
    email: 'faculty@sims.edu',
    password_hash: '$2b$12$somehash',
    status: 'active',
    deleted_at: null,
    session_version: 1,
    must_change_password: false,
    name: 'Dr. Test',
    role: 'faculty',
    department: 'Pharmacy',
    designation: 'AP',
    phone: null,
    telegram_verified: true,
    approved_at: new Date(),
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    vi.spyOn(jwt, 'sign').mockReturnValue('test-jwt-token');
    vi.spyOn(audit, 'logAction').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 200 and sets cookies on successful login with correct password', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithPassword);
    bcrypt.compare.mockResolvedValue(true);
    const res = makeRes();
    await login(makeReq({ email: userWithPassword.email, password: 'password123' }), res);
    expect(res._status).toBe(200);
    expect(res._cookies['sims_token']).toBe('test-jwt-token');
    expect(typeof res._cookies['sims_csrf']).toBe('string');
    expect(res._cookies['sims_csrf'].length).toBeGreaterThan(0);
    expect(res._body.id).toBe(userWithPassword.id);
    expect(res._body.email).toBe(userWithPassword.email);
    expect(res._body.must_change_password).toBe(false);
  });

  it('returns 401 INVALID_CREDENTIALS on incorrect password', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithPassword);
    bcrypt.compare.mockResolvedValue(false);
    const res = makeRes();
    await login(makeReq({ email: userWithPassword.email, password: 'wrongpassword' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 INVALID_CREDENTIALS for unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = makeRes();
    await login(makeReq({ email: 'nobody@sims.edu', password: 'password123' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 INVALID_CREDENTIALS for user with null password_hash', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...userWithPassword, password_hash: null });
    const res = makeRes();
    await login(makeReq({ email: userWithPassword.email, password: 'password123' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 INVALID_CREDENTIALS for deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...userWithPassword, deleted_at: new Date() });
    const res = makeRes();
    await login(makeReq({ email: userWithPassword.email, password: 'password123' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 INVALID_CREDENTIALS for inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...userWithPassword, status: 'inactive' });
    const res = makeRes();
    await login(makeReq({ email: userWithPassword.email, password: 'password123' }), res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CREDENTIALS');
  });

  it('calls audit.logAction with PASSWORD_LOGIN action on success', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithPassword);
    bcrypt.compare.mockResolvedValue(true);
    const res = makeRes();
    await login(makeReq({ email: userWithPassword.email, password: 'password123' }), res);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: userWithPassword.id,
        action: 'PASSWORD_LOGIN',
        targetId: userWithPassword.id,
        targetType: 'user',
        metadata: expect.objectContaining({ email: userWithPassword.email }),
      }),
    );
  });
});

describe('changePassword', () => {
  const userWithPassword = {
    id: 'user-1',
    email: 'faculty@sims.edu',
    password_hash: '$2b$12$somehash',
    status: 'active',
    deleted_at: null,
    must_change_password: true,
  };

  const userWithoutPassword = {
    id: 'user-1',
    email: 'faculty@sims.edu',
    password_hash: null,
    status: 'active',
    deleted_at: null,
    must_change_password: true,
  };

  beforeEach(() => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithPassword);
    vi.spyOn(prisma.user, 'update').mockResolvedValue({});
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$12$newhash');
    vi.spyOn(audit, 'logAction').mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('successfully changes password when password_hash exists and current_password is correct', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithPassword);
    bcrypt.compare.mockResolvedValue(true);
    const req = makeReq({ current_password: 'oldpassword', new_password: 'newpassword123' });
    req.user = { sub: userWithPassword.id };
    const res = makeRes();
    await changePassword(req, res);
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/password changed successfully/i);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userWithPassword.id },
        data: expect.objectContaining({
          password_hash: '$2b$12$newhash',
          must_change_password: false,
        }),
      }),
    );
  });

  it('successfully changes password when password_hash is null (first-time set)', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithoutPassword);
    const req = makeReq({ current_password: '', new_password: 'newpassword123' });
    req.user = { sub: userWithoutPassword.id };
    const res = makeRes();
    await changePassword(req, res);
    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/password changed successfully/i);
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userWithoutPassword.id },
        data: expect.objectContaining({
          password_hash: '$2b$12$newhash',
          must_change_password: false,
        }),
      }),
    );
  });

  it('returns 401 INVALID_CURRENT_PASSWORD when current password is incorrect', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithPassword);
    bcrypt.compare.mockResolvedValue(false);
    const req = makeReq({ current_password: 'wrongpassword', new_password: 'newpassword123' });
    req.user = { sub: userWithPassword.id };
    const res = makeRes();
    await changePassword(req, res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_CURRENT_PASSWORD');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_USER for a deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...userWithPassword, deleted_at: new Date() });
    const req = makeReq({ current_password: 'oldpassword', new_password: 'newpassword123' });
    req.user = { sub: userWithPassword.id };
    const res = makeRes();
    await changePassword(req, res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_USER');
  });

  it('returns 401 INVALID_USER when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = makeReq({ current_password: 'oldpassword', new_password: 'newpassword123' });
    req.user = { sub: 'nonexistent-user' };
    const res = makeRes();
    await changePassword(req, res);
    expect(res._status).toBe(401);
    expect(res._body.code).toBe('INVALID_USER');
  });

  it('calls audit.logAction with PASSWORD_CHANGED action on success', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithPassword);
    bcrypt.compare.mockResolvedValue(true);
    const req = makeReq({ current_password: 'oldpassword', new_password: 'newpassword123' });
    req.user = { sub: userWithPassword.id };
    const res = makeRes();
    await changePassword(req, res);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: userWithPassword.id,
        action: 'PASSWORD_CHANGED',
        targetId: userWithPassword.id,
        targetType: 'user',
        metadata: expect.objectContaining({ changed_by: 'self' }),
      }),
    );
  });
});
