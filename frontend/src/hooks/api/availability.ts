import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useAvailability() {
  return useQuery<{ id: string; weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]>({
    queryKey: ['availability'],
    queryFn: () => api.get('/availability').then(r => r.data),
  })
}

export function useBlockedDates() {
  return useQuery<{ id: string; date: string; reason?: string }[]>({
    queryKey: ['blocked-dates'],
    queryFn: () => api.get('/availability/blocked').then(r => r.data),
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
