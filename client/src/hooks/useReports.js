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
export const useCoverRequestSummary  = (p) => useReport('cover-requests',        p);
export const useCompletionRate       = (p) => useReport('completion-rate',       p);
export const useUploadHistory        = (p) => useReport('upload-history',        p);
export const useActiveStudents       = (p) => useReport('active-students',       p);
