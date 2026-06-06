import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function useCoverRequests(filters = {}) {
  return useQuery({
    queryKey: ['coverRequests', filters],
    queryFn: async () => {
      const res = await api.get('/cover-requests', { params: filters });
      return res.data;
    },
  });
}

export function useOpenCoverRequests() {
  return useQuery({
    queryKey: ['openCoverRequests'],
    queryFn: async () => {
      const res = await api.get('/cover-requests/open');
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useMyCoverRequests() {
  return useQuery({
    queryKey: ['myCoverRequests'],
    queryFn: async () => {
      const res = await api.get('/cover-requests/my');
      return res.data;
    },
  });
}

export function useCreateCoverRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/cover-requests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myCoverRequests'] }),
  });
}

export function useVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/cover-requests/${id}/volunteer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['openCoverRequests'] });
      qc.invalidateQueries({ queryKey: ['myCoverRequests'] });
    },
  });
}

export function useConfirmCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/cover-requests/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coverRequests'] }),
  });
}
