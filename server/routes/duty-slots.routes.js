const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { pickSlotSchema, adminAssignSchema } = require('../schemas/duty-slots.schema');
const ctrl = require('../controllers/duty-slots.controller');

const router = Router();

router.use(authenticate);

// Specific named routes BEFORE parameterized ones to avoid false matches

// POST /duty-slots/pick — Faculty
router.post('/pick', authorize('faculty'), validate(pickSlotSchema), ctrl.pickSlot);

// POST /duty-slots/admin-assign — Admin
router.post('/admin-assign', authorize('admin', 'super_admin'), validate(adminAssignSchema), ctrl.adminAssign);

// GET /duty-slots/available/:year/:month — Faculty
router.get('/available/:year/:month', authorize('faculty'), ctrl.getAvailableSlots);

// GET /duty-slots/:year/:month — All Auth
router.get('/:year/:month', ctrl.getMonthSlots);

// DELETE /duty-slots/:id/unpick — Faculty
router.delete('/:id/unpick', authorize('faculty'), ctrl.unpickSlot);

// GET /duty-slots/:id — All Auth
router.get('/:id', ctrl.getSlot);

module.exports = router;
