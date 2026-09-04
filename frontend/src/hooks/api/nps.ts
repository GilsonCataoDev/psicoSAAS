import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export type NpsResults = {
  avg: number | null
  total: number
  responded: number
  promoters: number
  detractors: number
  npsScore: number | null
  recentComments: { score: number; comment: string; createdAt: string }[]
}

export function useNpsResults() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<NpsResults>({
    queryKey: ['nps-results', userId],
    queryFn: () => api.get('/nps/results').then(r => r.data),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSendNps() {
  return useMutation<
    { token: string },
    Error,
    { patientId: string; sessionId?: string; patientPhone: string; patientName: string }
  >({
    mutationFn: data => api.post('/nps/send', data).then(r => r.data),
  })
}
