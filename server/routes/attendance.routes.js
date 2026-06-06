const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { overrideSchema } = require('../schemas/attendance.schema');
const ctrl = require('../controllers/attendance.controller');

const router = Router();

router.use(authenticate);

// GET /attendance/live — Admin (before /:dutySlotId to avoid param conflict)
router.get('/live', authorize('admin', 'super_admin'), ctrl.getLive);

// POST /attendance/:dutySlotId/check-in — Faculty
router.post('/:dutySlotId/check-in', authorize('faculty'), ctrl.checkIn);

// POST /attendance/:dutySlotId/check-out — Faculty
router.post('/:dutySlotId/check-out', authorize('faculty'), ctrl.checkOut);

// GET /attendance/:dutySlotId — All Auth
router.get('/:dutySlotId', ctrl.getAttendance);

// PATCH /attendance/:dutySlotId/override — Admin
router.patch('/:dutySlotId/override', authorize('admin', 'super_admin'), validate(overrideSchema), ctrl.overrideAttendance);

module.exports = router;
