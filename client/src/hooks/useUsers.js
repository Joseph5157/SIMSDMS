import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function useUsers(filters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const res = await api.get('/users', { params: filters });
      return res.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/users/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetUserLogin() {
  return useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-login`),
  });
}

export function useAuditLogs(filters = {}) {
  return useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs', { params: filters });
      return res.data;
    },
  });
}
