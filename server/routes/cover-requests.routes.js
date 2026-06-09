const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createCoverRequestSchema, coverConfigSchema } = require('../schemas/cover-requests.schema');
const ctrl = require('../controllers/cover-requests.controller');

const router = Router();

router.use(authenticate);

// Named routes BEFORE parameterized ones

// GET /cover-requests/open — Faculty
router.get('/open', authorize('faculty'), ctrl.getOpenRequests);

// GET /cover-requests/my — Faculty
router.get('/my', authorize('faculty'), ctrl.getMyCoverRequests);

// PATCH /cover-requests/config — Admin
router.patch('/config', authorize('admin', 'super_admin'), validate(coverConfigSchema), ctrl.updateCoverConfig);

// POST /cover-requests — Faculty
router.post('/', authorize('faculty'), validate(createCoverRequestSchema), ctrl.createCoverRequest);

// GET /cover-requests — Admin
router.get('/', authorize('admin', 'super_admin'), ctrl.listCoverRequests);

// POST /cover-requests/:id/volunteer — Faculty
router.post('/:id/volunteer', authorize('faculty'), ctrl.volunteer);

// PATCH /cover-requests/:id/confirm — Admin
router.patch('/:id/confirm', authorize('admin', 'super_admin'), ctrl.confirmCover);

// PATCH /cover-requests/:id/cancel — Faculty (own) or Admin (any)
router.patch('/:id/cancel', authorize('faculty', 'admin', 'super_admin'), ctrl.cancelCoverRequest);

// PATCH /cover-requests/:id/reject — Admin: clears volunteer, keeps request open
router.patch('/:id/reject', authorize('admin', 'super_admin'), ctrl.rejectVolunteer);

module.exports = router;
