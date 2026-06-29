import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export function useAvailability() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ id: string; weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]>({
    queryKey: ['availability', userId],
    queryFn: () => api.get('/availability').then(r => r.data),
    enabled: !!userId,
  })
}

export function useBlockedDates() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ id: string; date: string; reason?: string }[]>({
    queryKey: ['blocked-dates', userId],
    queryFn: () => api.get('/availability/blocked').then(r => r.data),
    enabled: !!userId,
  })
}

export function useAddBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { date: string; reason?: string }) =>
      api.post('/availability/blocked', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  })
}

export function useRemoveBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/availability/blocked/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  })
}

export function useSaveAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slots: { weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]) =>
      api.post('/availability/slots', { slots }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  })
}
