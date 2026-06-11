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

// POST /users — DEPRECATED (use POST /invites instead)
router.post('/', authorize('admin', 'super_admin'), (req, res) =>
  res.status(410).json({
    error: true,
    code: 'GONE',
    message: 'POST /users is no longer used. Use POST /invites to invite new users.',
  })
);

// GET /users/pending — DEPRECATED (use GET /invites instead)
router.get('/pending', authorize('admin', 'super_admin'), (req, res) =>
  res.status(410).json({
    error: true,
    code: 'GONE',
    message: 'GET /users/pending is no longer used. Use GET /invites for pending invites.',
  })
);

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

// POST /users/:id/regenerate-invite — DEPRECATED (use POST /invites/:id/regenerate instead)
router.post('/:id/regenerate-invite', authorize('admin', 'super_admin'), (req, res) =>
  res.status(410).json({
    error: true,
    code: 'GONE',
    message: 'Use POST /invites/:id/regenerate instead.',
  })
);

module.exports = router;
