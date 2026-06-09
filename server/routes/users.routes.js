const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createUserSchema, updateProfileSchema } = require('../schemas/users.schema');
const ctrl = require('../controllers/users.controller');

const router = Router();

// All /users routes require authentication
router.use(authenticate);

// GET /users/me — All authenticated roles
router.get('/me', ctrl.getMe);

// POST /users — Admin, Super Admin
router.post('/', authorize('admin', 'super_admin'), validate(createUserSchema), ctrl.createUser);

// GET /users/pending — Admin, Super Admin
router.get('/pending', authorize('admin', 'super_admin'), ctrl.getPendingUsers);

// GET /users — Admin, Super Admin
router.get('/', authorize('admin', 'super_admin'), ctrl.listUsers);

// GET /users/:id — All authenticated
router.get('/:id', ctrl.getUser);

// PATCH /users/:id/profile — All authenticated (faculty: own only; admin+ can patch anyone)
router.patch('/:id/profile', validate(updateProfileSchema), ctrl.updateProfile);

// PATCH /users/:id/deactivate — Admin, Super Admin
router.patch('/:id/deactivate', authorize('admin', 'super_admin'), ctrl.deactivateUser);

// PATCH /users/:id/reactivate — Admin, Super Admin
router.patch('/:id/reactivate', authorize('admin', 'super_admin'), ctrl.reactivateUser);

// POST /users/:id/regenerate-invite — Admin, Super Admin
router.post('/:id/regenerate-invite', authorize('admin', 'super_admin'), ctrl.regenerateInvite);

module.exports = router;
