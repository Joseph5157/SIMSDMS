/**
 * Centralized cookie options helper
 * Ensures consistent cookie configuration across all endpoints
 * Respects JWT_EXPIRES_IN environment variable for maxAge
 */

function parseExpiryMs(expiresIn) {
  const match = String(expiresIn || '7d').match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  const n = parseInt(match[1], 10);
  return n * { d: 86400000, h: 3600000, m: 60000, s: 1000 }[match[2]];
}

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: parseExpiryMs(process.env.JWT_EXPIRES_IN),
  };
}

function csrfCookieOptions() {
  return {
    httpOnly: false, // CSRF token must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
}

module.exports = {
  authCookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
  parseExpiryMs,
};
