import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

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
