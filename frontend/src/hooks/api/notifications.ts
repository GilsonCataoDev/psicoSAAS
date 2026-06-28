import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useWhatsAppStatus() {
  return useQuery<{ connected: boolean; configured: boolean }>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/notifications/whatsapp/status').then(r => r.data),
    retry: false,
    staleTime: 30_000,
  })
}
