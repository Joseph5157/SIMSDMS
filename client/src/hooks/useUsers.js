import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { getCacheKey, setCacheKey } from '../lib/cache';

export function useUsers(filters = {}) {
  // Generate cache key based on filters
  const cacheKey = `USERS_${JSON.stringify(filters)}`;
  const cachedData = getCacheKey(cacheKey);

  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const res = await api.get('/users', { params: filters });
      // Cache the result
      setCacheKey(cacheKey, res.data);
      return res.data;
    },
    initialData: cachedData,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/users/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/users/${id}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetUserLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-login`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
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
