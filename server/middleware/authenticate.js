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
  } catch {
    return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Invalid or expired session.' });
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return res.status(503).json({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable.' });
  }

  if (!user || user.deleted_at || user.status !== 'active') {
    return res.status(401).json({ error: true, code: 'SESSION_REVOKED', message: 'Your session has been revoked. Please log in again.' });
  }

  if (payload.session_version !== user.session_version) {
    return res.status(401).json({ error: true, code: 'SESSION_REVOKED', message: 'Your session has been revoked. Please log in again.' });
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
};
