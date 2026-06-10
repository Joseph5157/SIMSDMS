const crypto = require('crypto');
const { csrfCookieOptions } = require('../lib/cookieOptions');

/**
 * CSRF Protection Middleware
 * - Generates a CSRF token for GET requests (to be sent in subsequent mutations)
 * - Validates the X-CSRF-Token header on POST/PUT/DELETE/PATCH requests
 * Apply this middleware globally before all routes that modify data
 */

module.exports = (req, res, next) => {
  // Generate CSRF token on GET requests (safe operations)
  if (req.method === 'GET' || req.method === 'HEAD') {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('sims_csrf', token, csrfCookieOptions());
    // Optionally attach to response for client access
    res.locals.csrfToken = token;
    return next();
  }

  // Validate CSRF token on mutation requests (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const tokenFromHeader = req.get('X-CSRF-Token');
    const tokenFromCookie = req.cookies?.sims_csrf;

    if (!tokenFromHeader || !tokenFromCookie) {
      return res.status(403).json({
        error: true,
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is missing.',
      });
    }

    // Compare tokens using timing-safe comparison
    const headerBuffer = Buffer.from(tokenFromHeader);
    const cookieBuffer = Buffer.from(tokenFromCookie);

    // Ensure buffers are same length to avoid timing attacks
    if (headerBuffer.length !== cookieBuffer.length) {
      return res.status(403).json({
        error: true,
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token is invalid.',
      });
    }

    const isValid = crypto.timingSafeEqual(headerBuffer, cookieBuffer);

    if (!isValid) {
      return res.status(403).json({
        error: true,
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token is invalid.',
      });
    }
  }

  next();
};
