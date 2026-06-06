// Phase D — full implementation
import { useQuery } from '@tanstack/react-query';
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
  });
}
