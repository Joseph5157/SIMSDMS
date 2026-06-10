const { describe, it, expect, beforeEach } = require('vitest');
const csrf = require('../middleware/csrf');

function makeRes() {
  const res = {};
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  return res;
}

describe('CSRF middleware', () => {
  let next;

  beforeEach(() => {
    next = { called: false, fn: function () { this.called = true; } };
    next.fn = next.fn.bind(next);
  });

  it('passes GET requests without any token check', () => {
    const req = { method: 'GET', cookies: {}, headers: {} };
    const res = makeRes();
    csrf(req, res, next.fn);
    expect(next.called).toBe(true);
  });

  it('passes HEAD requests without any token check', () => {
    const req = { method: 'HEAD', cookies: {}, headers: {} };
    const res = makeRes();
    csrf(req, res, next.fn);
    expect(next.called).toBe(true);
  });

  it('passes POST requests that have no sims_token (unauthenticated)', () => {
    const req = { method: 'POST', cookies: {}, headers: {} };
    const res = makeRes();
    csrf(req, res, next.fn);
    expect(next.called).toBe(true);
  });

  it('returns 403 CSRF_MISSING when sims_token present but no CSRF tokens', () => {
    const req = {
      method: 'POST',
      cookies: { sims_token: 'jwt-here' },
      headers: {},
    };
    const res = makeRes();
    csrf(req, res, next.fn);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('CSRF_MISSING');
    expect(next.called).toBe(false);
  });

  it('returns 403 CSRF_INVALID when cookie and header tokens do not match', () => {
    const req = {
      method: 'DELETE',
      cookies: { sims_token: 'jwt-here', sims_csrf: 'aaaa' },
      headers: { 'x-csrf-token': 'bbbb' },
    };
    const res = makeRes();
    csrf(req, res, next.fn);
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('CSRF_INVALID');
    expect(next.called).toBe(false);
  });

  it('calls next when cookie and header tokens match exactly', () => {
    const token = 'a1b2c3d4e5f6'.repeat(4); // 48-char hex-like string
    const req = {
      method: 'POST',
      cookies: { sims_token: 'jwt-here', sims_csrf: token },
      headers: { 'x-csrf-token': token },
    };
    const res = makeRes();
    csrf(req, res, next.fn);
    expect(next.called).toBe(true);
  });
});
