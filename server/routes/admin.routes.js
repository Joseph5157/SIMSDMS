const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/users.controller');

const router = Router();

// All /admin routes require authentication + Super Admin role
router.use(authenticate, authorize('super_admin'));

// GET /admin/audit-logs
router.get('/audit-logs', ctrl.getAuditLogs);

// POST /admin/users/:id/reset-login
router.post('/users/:id/reset-login', ctrl.resetUserLogin);

// DELETE /admin/hard-delete/:resource/:id
router.delete('/hard-delete/:resource/:id', ctrl.hardDelete);

// GET /admin/settings
router.get('/settings', ctrl.getSettings);

// PATCH /admin/settings
router.patch('/settings', ctrl.updateSettings);

module.exports = router;
