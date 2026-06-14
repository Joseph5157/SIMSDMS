import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { getCacheKey, setCacheKey } from '../lib/cache';

export function useMonthSlots(year, month) {
  const cacheKey = `DUTY_SLOTS_${year}_${month}`;
  const cachedData = getCacheKey(cacheKey);

  return useQuery({
    queryKey: ['dutySlots', year, month],
    queryFn: async () => {
      const res = await api.get(`/duty-slots/${year}/${month}`);
      setCacheKey(cacheKey, res.data);
      return res.data;
    },
    initialData: cachedData,
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!year && !!month,
  });
}

export function useAvailableSlots(year, month) {
  const cacheKey = `AVAILABLE_SLOTS_${year}_${month}`;
  const cachedData = getCacheKey(cacheKey);

  return useQuery({
    queryKey: ['availableSlots', year, month],
    queryFn: async () => {
      const res = await api.get(`/duty-slots/available/${year}/${month}`);
      setCacheKey(cacheKey, res.data);
      return res.data;
    },
    initialData: cachedData,
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!year && !!month,
  });
}

export function usePickSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/duty-slots/pick', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availableSlots'] });
      qc.invalidateQueries({ queryKey: ['dutySlots'] });
    },
  });
}

export function useUnpickSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/duty-slots/${id}/unpick`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availableSlots'] });
      qc.invalidateQueries({ queryKey: ['dutySlots'] });
    },
  });
}

export function useAdminAssignSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/duty-slots/admin-assign', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dutySlots'] }),
  });
}
