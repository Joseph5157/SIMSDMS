const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { blockedDatesSchema, workingDaysSchema, sessionsPerFacultySchema, assignSlotsSchema } = require('../schemas/calendar.schema');
const ctrl = require('../controllers/calendar.controller');

const router = Router();

router.use(authenticate);

// GET /calendar/:year/:month — All Auth
router.get('/:year/:month', ctrl.getConfig);

// POST /calendar/:year/:month/open — Admin
router.post('/:year/:month/open', authorize('admin', 'super_admin'), ctrl.openWindow);

// POST /calendar/:year/:month/close — Admin
router.post('/:year/:month/close', authorize('admin', 'super_admin'), ctrl.closeWindow);

// PATCH /calendar/:year/:month/blocked-dates — Admin
router.patch('/:year/:month/blocked-dates', authorize('admin', 'super_admin'), validate(blockedDatesSchema), ctrl.updateBlockedDates);

// PATCH /calendar/:year/:month/working-days — Admin
router.patch('/:year/:month/working-days', authorize('admin', 'super_admin'), validate(workingDaysSchema), ctrl.updateWorkingDays);

// PATCH /calendar/:year/:month/sessions-per-faculty — Admin
router.patch('/:year/:month/sessions-per-faculty', authorize('admin', 'super_admin'), validate(sessionsPerFacultySchema), ctrl.updateSessionsPerFaculty);

// GET /calendar/:year/:month/unassigned-faculty — Admin
router.get('/:year/:month/unassigned-faculty', authorize('admin', 'super_admin'), ctrl.getUnassignedFaculty);

// POST /calendar/:year/:month/assign/:facultyId — Admin
router.post('/:year/:month/assign/:facultyId', authorize('admin', 'super_admin'), validate(assignSlotsSchema), ctrl.assignSlots);

module.exports = router;
