import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function useViolationSettings() {
  return useQuery({
    queryKey: ['violationSettings'],
    queryFn: async () => {
      const res = await api.get('/violation-settings');
      return res.data;
    },
  });
}

export function useUpdateViolationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch('/violation-settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['violationSettings'] }),
  });
}
