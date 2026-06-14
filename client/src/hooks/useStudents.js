import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { getCacheKey, setCacheKey } from '../lib/cache';

export function useStudents(filters = {}) {
  // Generate cache key based on filters
  const cacheKey = `STUDENTS_${JSON.stringify(filters)}`;
  const cachedData = getCacheKey(cacheKey);

  return useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      const res = await api.get('/students', { params: filters });
      // Cache the result
      setCacheKey(cacheKey, res.data);
      return res.data;
    },
    initialData: cachedData,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useStudentSearch(q) {
  return useQuery({
    queryKey: ['studentSearch', q],
    queryFn: async () => {
      const res = await api.get('/students/search', { params: { q } });
      return res.data;
    },
    enabled: q?.length >= 2,
  });
}

export function useUploadStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/students/upload', form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUploadLogs(filters = {}) {
  return useQuery({
    queryKey: ['uploadLogs', filters],
    queryFn: async () => {
      const res = await api.get('/students/upload-logs', { params: filters });
      return res.data;
    },
  });
}

export function usePromoteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/students/${id}/promote`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeactivateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/students/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}
