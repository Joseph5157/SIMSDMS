const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

module.exports = async function authenticate(req, res, next) {
  const token = req.cookies?.sims_token;

  if (!token) {
    return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Invalid or expired session.' });
  }

  // DB-backed session validation: verify user still exists and is active
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.deleted_at) {
      return res.status(401).json({ error: true, code: 'SESSION_REVOKED', message: 'Your session has been revoked. Please log in again.' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: true, code: 'SESSION_REVOKED', message: 'Your session has been revoked. Please log in again.' });
    }

    // Validate session version if present in JWT and DB
    // (gracefully handle older tokens that don't have session_version)
    if (payload.session_version !== undefined && payload.session_version !== user.session_version) {
      return res.status(401).json({ error: true, code: 'SESSION_REVOKED', message: 'Your session has been revoked. Please log in again.' });
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json(err);
    }
    return res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable.' });
  }
};
