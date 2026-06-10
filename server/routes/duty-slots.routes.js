const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { pickSlotSchema, adminAssignSchema } = require('../schemas/duty-slots.schema');
const ctrl = require('../controllers/duty-slots.controller');

const router = Router();

router.use(authenticate);

// Specific named routes BEFORE parameterized ones to avoid false matches

// POST /duty-slots/pick — Faculty
router.post('/pick', authorize('faculty'), validate(pickSlotSchema), asyncHandler(ctrl.pickSlot));

// POST /duty-slots/admin-assign — Admin
router.post('/admin-assign', authorize('admin', 'super_admin'), validate(adminAssignSchema), asyncHandler(ctrl.adminAssign));

// GET /duty-slots/available/:year/:month — Faculty
router.get('/available/:year/:month', authorize('faculty'), asyncHandler(ctrl.getAvailableSlots));

// GET /duty-slots/:year/:month — All Auth
router.get('/:year/:month', asyncHandler(ctrl.getMonthSlots));

// DELETE /duty-slots/:id/unpick — Faculty
router.delete('/:id/unpick', authorize('faculty'), asyncHandler(ctrl.unpickSlot));

// GET /duty-slots/:id — All Auth
router.get('/:id', asyncHandler(ctrl.getSlot));

module.exports = router;
