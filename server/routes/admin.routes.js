const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { updateSettingsSchema } = require('../schemas/settings.schema');
const ctrl = require('../controllers/users.controller');

const router = Router();

// All /admin routes require authentication + Super Admin role
router.use(authenticate, authorize('super_admin'));

// GET /admin/audit-logs
router.get('/audit-logs', asyncHandler(ctrl.getAuditLogs));

// POST /admin/users/:id/reset-login
router.post('/users/:id/reset-login', asyncHandler(ctrl.resetUserLogin));

// DELETE /admin/hard-delete/:resource/:id
router.delete('/hard-delete/:resource/:id', asyncHandler(ctrl.hardDelete));

// GET /admin/settings
router.get('/settings', asyncHandler(ctrl.getSettings));

// PATCH /admin/settings
router.patch('/settings', validate(updateSettingsSchema), asyncHandler(ctrl.updateSettings));

module.exports = router;
