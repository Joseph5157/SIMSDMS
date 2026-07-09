import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

function useReport(path, params = {}) {
  return useQuery({
    queryKey: ['report', path, params],
    queryFn: async () => {
      const res = await api.get(`/reports/${path}`, { params });
      return res.data;
    },
  });
}

export const useMonthlyAttendance    = (p) => useReport('monthly-attendance',   p);
export const useLateArrivals         = (p) => useReport('late-arrivals',         p);
export const useAbsentFaculty        = (p) => useReport('absent-faculty',        p);
export const useAutoClockOut         = (p) => useReport('auto-clockout',         p);
export const useAttendanceOverrides  = (p) => useReport('attendance-overrides',  p);
export const useStudentViolations    = (p) => useReport('student-violations',    p);
export const useFacultyActivity      = (p) => useReport('faculty-activity',      p);
export const useViolationTypeBreakdown = (p) => useReport('violation-types',   p);
export const usePendingFines         = (p) => useReport('pending-fines',         p);
export const useFlaggedViolations    = (p) => useReport('flagged-violations',    p);
export const useDutyCoverage         = (p) => useReport('duty-coverage',         p);
export const useUnassignedFacultyReport = (p) => useReport('unassigned-faculty', p);
export const useDutyReassignmentReport = (p) => useReport('duty-reassignments',  p);
export const useCompletionRate       = (p) => useReport('completion-rate',       p);
export const useUploadHistory        = (p) => useReport('upload-history',        p);
export const useActiveStudents       = (p) => useReport('active-students',       p);

export const useDailyViolationReport = (date) => {
  return useQuery({
    queryKey: ['report', 'daily-violations', date],
    queryFn: async () => {
      const res = await api.get(`/reports/student-violations/daily/${date}`);
      return res.data;
    },
    enabled: !!date,
  });
};

export const useWeeklyViolationReport = (from_date, to_date) => {
  return useQuery({
    queryKey: ['report', 'weekly-violations', from_date, to_date],
    queryFn: async () => {
      const res = await api.get('/reports/student-violations/weekly', { params: { from_date, to_date } });
      return res.data;
    },
    enabled: !!from_date && !!to_date,
  });
};
