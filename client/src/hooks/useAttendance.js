import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function useLiveAttendance() {
  return useQuery({
    queryKey: ['liveAttendance'],
    queryFn: async () => {
      const res = await api.get('/attendance/live');
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useAttendance(dutySlotId) {
  return useQuery({
    queryKey: ['attendance', dutySlotId],
    queryFn: async () => {
      const res = await api.get(`/attendance/${dutySlotId}`);
      return res.data;
    },
    enabled: !!dutySlotId,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dutySlotId) => api.post(`/attendance/${dutySlotId}/check-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liveAttendance'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['dutySlots'] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dutySlotId) => api.post(`/attendance/${dutySlotId}/check-out`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['liveAttendance'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useOverrideAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dutySlotId, ...data }) => api.patch(`/attendance/${dutySlotId}/override`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liveAttendance'] }),
  });
}
