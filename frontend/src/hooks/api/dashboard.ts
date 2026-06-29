import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export function useDashboard() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    enabled: !!userId,
  })
}
