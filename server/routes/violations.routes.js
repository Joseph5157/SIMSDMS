const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createViolationSchema,
  editViolationSchema,
  flagViolationSchema,
  resolveFlagSchema,
} = require('../schemas/violations.schema');
const ctrl = require('../controllers/violations.controller');

const router = Router();

router.use(authenticate);

// POST /violations — Faculty
router.post('/', authorize('faculty'), validate(createViolationSchema), ctrl.createViolation);

// GET /violations — Admin
router.get('/', authorize('admin', 'super_admin'), ctrl.listViolations);

// GET /violations/my — Faculty (MUST be before /:id)
router.get('/my', authorize('faculty'), ctrl.myViolations);

// GET /violations/:id — All Auth
router.get('/:id', ctrl.getViolation);

// PATCH /violations/:id — Faculty edit
router.patch('/:id', authorize('faculty'), validate(editViolationSchema), ctrl.editViolation);

// PATCH /violations/:id/hide — Admin
router.patch('/:id/hide', authorize('admin', 'super_admin'), ctrl.hideViolation);

// PATCH /violations/:id/flag — Faculty
router.patch('/:id/flag', authorize('faculty'), validate(flagViolationSchema), ctrl.flagViolation);

// PATCH /violations/:id/resolve-flag — Admin
router.patch('/:id/resolve-flag', authorize('admin', 'super_admin'), validate(resolveFlagSchema), ctrl.resolveFlag);

// GET /violations/:id/photo — Foundation placeholder
router.get('/:id/photo', authorize('admin', 'super_admin'), ctrl.getPhoto);

// GET /violations/:id/audit-log — Admin
router.get('/:id/audit-log', authorize('admin', 'super_admin'), ctrl.getAuditLog);

module.exports = router;
