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

// DELETE /cover-requests/:id — Faculty
router.delete('/:id', authorize('faculty'), ctrl.cancelCoverRequest);

// POST /cover-requests/:id/reject-volunteer — Admin
router.post('/:id/reject-volunteer', authorize('admin', 'super_admin'), ctrl.rejectVolunteer);

// PATCH /cover-requests/:id/confirm — Admin
router.patch('/:id/confirm', authorize('admin', 'super_admin'), ctrl.confirmCover);

module.exports = router;
