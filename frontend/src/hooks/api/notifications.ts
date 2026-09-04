import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export function useSendReengagement() {
  return useMutation<
    { sent: number; failed: number; skipped: number },
    Error,
    { monthsSince: number; template: string }
  >({
    mutationFn: data => api.post('/notifications/whatsapp/reengagement', data).then(r => r.data),
  })
}

export function useWhatsAppStatus(options?: { enabled?: boolean }) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ connected: boolean; configured: boolean }>({
    queryKey: ['whatsapp-status', userId],
    queryFn: () => api.get('/notifications/whatsapp/status').then(r => r.data),
    enabled: (options?.enabled ?? true) && !!userId,
    retry: false,
    staleTime: 30_000,
  })
}
