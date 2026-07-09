import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

function useAnalytics(path, params = {}) {
  return useQuery({
    queryKey: ['analytics', path, params],
    queryFn: async () => {
      const res = await api.get(`/analytics/${path}`, { params });
      return res.data;
    },
  });
}

export const useAnalyticsSummary        = (p) => useAnalytics('summary', p);
export const useAnalyticsTrend          = (p) => useAnalytics('trend', p);
export const useViolationTypeAnalysis   = (p) => useAnalytics('violation-types', p);
export const useRepeatViolators         = (p) => useAnalytics('repeat-violators', p);

export const useAnalyticsFilterOptions = () => useQuery({
  queryKey: ['analytics', 'filter-options'],
  queryFn: async () => {
    const res = await api.get('/analytics/filter-options');
    return res.data;
  },
  staleTime: 5 * 60 * 1000,
});
