const jwt = require('jsonwebtoken');

module.exports = function authenticate(req, res, next) {
  const token = req.cookies?.sims_token;

  if (!token) {
    return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Invalid or expired session.' });
  }
};
