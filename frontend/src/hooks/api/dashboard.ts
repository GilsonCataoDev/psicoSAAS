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

export type RetentionMetrics = {
  byMonth: { label: string; newPatients: number }[]
  statusBreakdown: { active: number; paused: number; discharged: number }
  avgTreatmentDays: number
}

export function useRetentionMetrics() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<RetentionMetrics>({
    queryKey: ['retention', userId],
    queryFn: () => api.get('/analytics/retention').then(r => r.data),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
