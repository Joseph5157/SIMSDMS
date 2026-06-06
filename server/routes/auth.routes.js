const { Router } = require('express');

const router = Router();

// POST /auth/request-otp — Public
router.post('/request-otp', (req, res) => {
  res.status(501).json({ error: true, code: 'NOT_IMPLEMENTED', message: 'Coming in Phase B' });
});

// POST /auth/verify-otp — Public
router.post('/verify-otp', (req, res) => {
  res.status(501).json({ error: true, code: 'NOT_IMPLEMENTED', message: 'Coming in Phase B' });
});

// POST /auth/logout — All Auth
router.post('/logout', (req, res) => {
  res.status(501).json({ error: true, code: 'NOT_IMPLEMENTED', message: 'Coming in Phase B' });
});

module.exports = router;
