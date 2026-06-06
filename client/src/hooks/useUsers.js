// Phase E — full implementation
import { useQuery } from '@tanstack/react-query';
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
