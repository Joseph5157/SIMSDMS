import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function useViolations(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['violations', filters],
    queryFn: async () => {
      const res = await api.get('/violations', { params: filters });
      return res.data;
    },
    ...options,
  });
}

export function useMyViolations(filters = {}) {
  return useQuery({
    queryKey: ['myViolations', filters],
    queryFn: async () => {
      const res = await api.get('/violations/my', { params: filters });
      return res.data;
    },
  });
}

export function useCreateViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/violations', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myViolations'] });
      qc.invalidateQueries({ queryKey: ['violations'] });
    },
  });
}

export function useHideViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/violations/${id}/hide`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['violations'] }),
  });
}

export function useFlagViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, flag_note }) => api.patch(`/violations/${id}/flag`, { flag_note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myViolations'] }),
  });
}

export function useResolveFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/violations/${id}/resolve-flag`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['violations'] });
      qc.invalidateQueries({ queryKey: ['report', 'flagged-violations'] });
    },
  });
}

export function useViolationAuditLog(id) {
  return useQuery({
    queryKey: ['violationAudit', id],
    queryFn: async () => {
      const res = await api.get(`/violations/${id}/audit-log`);
      return res.data;
    },
    enabled: !!id,
  });
}
