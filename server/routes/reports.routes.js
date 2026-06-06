const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const ctrl         = require('../controllers/reports.controller');

const router = Router();
router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/monthly-attendance',    ctrl.monthlyAttendanceSummary);
router.get('/late-arrivals',         ctrl.lateArrivalReport);
router.get('/absent-faculty',        ctrl.absentFacultyReport);
router.get('/auto-clockout',         ctrl.autoClockOutReport);
router.get('/attendance-overrides',  ctrl.attendanceOverrideLog);
router.get('/student-violations',    ctrl.studentViolationHistory);
router.get('/faculty-activity',      ctrl.facultyViolationActivity);
router.get('/violation-types',       ctrl.violationTypeBreakdown);
router.get('/pending-fines',         ctrl.pendingFinesSummary);
router.get('/flagged-violations',    ctrl.flaggedViolationsReport);
router.get('/duty-coverage',         ctrl.monthlyDutyCoverage);
router.get('/unassigned-faculty',    ctrl.unassignedFacultyReport);
router.get('/cover-requests',        ctrl.coverRequestSummary);
router.get('/completion-rate',       ctrl.sessionCompletionRate);
router.get('/upload-history',        ctrl.studentUploadHistory);
router.get('/active-students',       ctrl.activeStudentRoster);

module.exports = router;
