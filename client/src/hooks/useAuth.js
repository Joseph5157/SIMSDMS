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

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }) => api.post('/auth/login', { email, password }),
    onSuccess: (res) => {
      qc.setQueryData(['currentUser'], res.data);
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ current_password, new_password }) =>
      api.post('/auth/change-password', { current_password, new_password }),
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
