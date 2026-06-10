import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (email) => api.post('/auth/request-otp', { email }),
  });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, otp }) => api.post('/auth/verify-otp', { email, otp }),
    onSuccess: (res) => {
      qc.setQueryData(['currentUser'], res.data);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.clear();
      window.location.href = '/login';
    },
  });
}
