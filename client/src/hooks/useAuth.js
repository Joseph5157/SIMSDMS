import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { loadUserFromStorage, saveUserToStorage, clearUserStorage } from '../lib/auth';

export function useCurrentUser() {
  const cachedUser = loadUserFromStorage();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      saveUserToStorage(res.data);
      return res.data;
    },
    initialData: cachedUser,
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
      saveUserToStorage(res.data);
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
      saveUserToStorage(res.data);
      qc.setQueryData(['currentUser'], res.data);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      clearUserStorage();
      qc.clear();
      window.location.href = '/login';
    },
  });
}
