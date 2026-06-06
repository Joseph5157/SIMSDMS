const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createViolationTypeSchema, updateViolationTypeSchema } = require('../schemas/violation-types.schema');
const ctrl = require('../controllers/violation-types.controller');

const router = Router();

router.use(authenticate);

// GET /violation-types — All Auth
router.get('/', ctrl.listViolationTypes);

// POST /violation-types — Admin
router.post('/', authorize('admin', 'super_admin'), validate(createViolationTypeSchema), ctrl.createViolationType);

// PATCH /violation-types/:id — Admin (before /:id/deactivate to avoid conflicts)
router.patch('/:id/deactivate', authorize('admin', 'super_admin'), ctrl.deactivateViolationType);

// PATCH /violation-types/:id — Admin
router.patch('/:id', authorize('admin', 'super_admin'), validate(updateViolationTypeSchema), ctrl.updateViolationType);

// DELETE /violation-types/:id — Admin
router.delete('/:id', authorize('admin', 'super_admin'), ctrl.deleteViolationType);

module.exports = router;
