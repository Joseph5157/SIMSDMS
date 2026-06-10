const { Router }       = require('express');
const authenticate     = require('../middleware/authenticate');
const authorize        = require('../middleware/authorize');
const validateQuery    = require('../middleware/validateQuery');
const asyncHandler     = require('../middleware/asyncHandler');
const ctrl             = require('../controllers/reports.controller');
const {
  yearMonthQuery,
  studentViolationQuery,
  facultyActivityQuery,
  activeStudentsQuery,
} = require('../schemas/reports.schema');

const router = Router();
router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/monthly-attendance',   validateQuery(yearMonthQuery),          asyncHandler(ctrl.monthlyAttendanceSummary));
router.get('/late-arrivals',        validateQuery(yearMonthQuery),          asyncHandler(ctrl.lateArrivalReport));
router.get('/absent-faculty',       validateQuery(yearMonthQuery),          asyncHandler(ctrl.absentFacultyReport));
router.get('/auto-clockout',        validateQuery(yearMonthQuery),          asyncHandler(ctrl.autoClockOutReport));
router.get('/attendance-overrides', validateQuery(yearMonthQuery),          asyncHandler(ctrl.attendanceOverrideLog));
router.get('/student-violations',   validateQuery(studentViolationQuery),   asyncHandler(ctrl.studentViolationHistory));
router.get('/faculty-activity',     validateQuery(facultyActivityQuery),    asyncHandler(ctrl.facultyViolationActivity));
router.get('/violation-types',      validateQuery(yearMonthQuery),          asyncHandler(ctrl.violationTypeBreakdown));
router.get('/pending-fines',        asyncHandler(ctrl.pendingFinesSummary));
router.get('/flagged-violations',   asyncHandler(ctrl.flaggedViolationsReport));
router.get('/duty-coverage',        validateQuery(yearMonthQuery),          asyncHandler(ctrl.monthlyDutyCoverage));
router.get('/unassigned-faculty',   validateQuery(yearMonthQuery),          asyncHandler(ctrl.unassignedFacultyReport));
router.get('/cover-requests',       validateQuery(yearMonthQuery),          asyncHandler(ctrl.coverRequestSummary));
router.get('/completion-rate',      asyncHandler(ctrl.sessionCompletionRate));
router.get('/upload-history',       asyncHandler(ctrl.studentUploadHistory));
router.get('/active-students',      validateQuery(activeStudentsQuery),     asyncHandler(ctrl.activeStudentRoster));

module.exports = router;
