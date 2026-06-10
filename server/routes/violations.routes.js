const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
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
router.post('/', authorize('faculty'), validate(createViolationSchema), asyncHandler(ctrl.createViolation));

// GET /violations — Admin
router.get('/', authorize('admin', 'super_admin'), asyncHandler(ctrl.listViolations));

// GET /violations/my — Faculty (MUST be before /:id)
router.get('/my', authorize('faculty'), asyncHandler(ctrl.myViolations));

// GET /violations/:id — All Auth
router.get('/:id', asyncHandler(ctrl.getViolation));

// PATCH /violations/:id — Faculty edit
router.patch('/:id', authorize('faculty'), validate(editViolationSchema), asyncHandler(ctrl.editViolation));

// PATCH /violations/:id/hide — Admin
router.patch('/:id/hide', authorize('admin', 'super_admin'), asyncHandler(ctrl.hideViolation));

// PATCH /violations/:id/flag — Faculty
router.patch('/:id/flag', authorize('faculty'), validate(flagViolationSchema), asyncHandler(ctrl.flagViolation));

// PATCH /violations/:id/resolve-flag — Admin
router.patch('/:id/resolve-flag', authorize('admin', 'super_admin'), validate(resolveFlagSchema), asyncHandler(ctrl.resolveFlag));

// GET /violations/:id/photo — Foundation placeholder
router.get('/:id/photo', authorize('admin', 'super_admin'), asyncHandler(ctrl.getPhoto));

// GET /violations/:id/audit-log — Admin
router.get('/:id/audit-log', authorize('admin', 'super_admin'), asyncHandler(ctrl.getAuditLog));

module.exports = router;
