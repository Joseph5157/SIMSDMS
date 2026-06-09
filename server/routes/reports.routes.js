const { Router }       = require('express');
const authenticate     = require('../middleware/authenticate');
const authorize        = require('../middleware/authorize');
const validateQuery    = require('../middleware/validateQuery');
const ctrl             = require('../controllers/reports.controller');
const {
  yearMonthQuery,
  studentViolationQuery,
  facultyActivityQuery,
  activeStudentsQuery,
} = require('../schemas/reports.schema');

const router = Router();
router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/monthly-attendance',   validateQuery(yearMonthQuery),          ctrl.monthlyAttendanceSummary);
router.get('/late-arrivals',        validateQuery(yearMonthQuery),          ctrl.lateArrivalReport);
router.get('/absent-faculty',       validateQuery(yearMonthQuery),          ctrl.absentFacultyReport);
router.get('/auto-clockout',        validateQuery(yearMonthQuery),          ctrl.autoClockOutReport);
router.get('/attendance-overrides', validateQuery(yearMonthQuery),          ctrl.attendanceOverrideLog);
router.get('/student-violations',   validateQuery(studentViolationQuery),   ctrl.studentViolationHistory);
router.get('/faculty-activity',     validateQuery(facultyActivityQuery),    ctrl.facultyViolationActivity);
router.get('/violation-types',      validateQuery(yearMonthQuery),          ctrl.violationTypeBreakdown);
router.get('/pending-fines',        ctrl.pendingFinesSummary);
router.get('/flagged-violations',   ctrl.flaggedViolationsReport);
router.get('/duty-coverage',        validateQuery(yearMonthQuery),          ctrl.monthlyDutyCoverage);
router.get('/unassigned-faculty',   validateQuery(yearMonthQuery),          ctrl.unassignedFacultyReport);
router.get('/cover-requests',       validateQuery(yearMonthQuery),          ctrl.coverRequestSummary);
router.get('/completion-rate',      ctrl.sessionCompletionRate);
router.get('/upload-history',       ctrl.studentUploadHistory);
router.get('/active-students',      validateQuery(activeStudentsQuery),     ctrl.activeStudentRoster);

module.exports = router;
