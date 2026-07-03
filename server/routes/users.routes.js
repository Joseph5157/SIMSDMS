const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { updateProfileSchema } = require('../schemas/users.schema');
const ctrl = require('../controllers/users.controller');

const router = Router();

// All /users routes require authentication
router.use(authenticate);

// GET /users/me — All authenticated roles
router.get('/me', asyncHandler(ctrl.getMe));

// GET /users — Admin, Super Admin
router.get('/', authorize('admin', 'super_admin'), asyncHandler(ctrl.listUsers));

// GET /users/:id — All authenticated
router.get('/:id', asyncHandler(ctrl.getUser));

// PATCH /users/:id/profile — All authenticated (faculty: own only; admin+ can patch anyone)
router.patch('/:id/profile', validate(updateProfileSchema), asyncHandler(ctrl.updateProfile));

// PATCH /users/:id/deactivate — Admin, Super Admin
router.patch('/:id/deactivate', authorize('admin', 'super_admin'), asyncHandler(ctrl.deactivateUser));

// PATCH /users/:id/reactivate — Admin, Super Admin
router.patch('/:id/reactivate', authorize('admin', 'super_admin'), asyncHandler(ctrl.reactivateUser));

// DELETE /users/:id — Super Admin only
router.delete('/:id', authorize('super_admin'), asyncHandler(ctrl.deleteUser));

module.exports = router;
