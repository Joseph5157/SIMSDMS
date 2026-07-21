const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { updateViolationSettingsSchema } = require('../schemas/violation-settings.schema');
const ctrl = require('../controllers/violation-settings.controller');

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', asyncHandler(ctrl.getViolationSettings));
router.patch('/', validate(updateViolationSettingsSchema), asyncHandler(ctrl.updateViolationSettings));

module.exports = router;
