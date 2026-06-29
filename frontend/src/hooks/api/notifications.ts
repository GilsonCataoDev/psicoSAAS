import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export function useWhatsAppStatus() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ connected: boolean; configured: boolean }>({
    queryKey: ['whatsapp-status', userId],
    queryFn: () => api.get('/notifications/whatsapp/status').then(r => r.data),
    enabled: !!userId,
    retry: false,
    staleTime: 30_000,
  })
}
