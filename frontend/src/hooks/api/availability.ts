import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export type AvailabilityBlock = {
  id: string
  type: 'weekly' | 'date'
  weekday?: number | null
  date?: string | null
  startTime: string
  endTime: string
  reason?: string
}

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

export type SuggestedSlot = { date: string; time: string }

export function useSmartSuggest(opts: {
  enabled?: boolean
  days?: number
  sessionDuration?: number
  buffer?: number
  modality?: 'presencial' | 'online'
  maxSlots?: number
} = {}) {
  const userId = useAuthStore(s => s.user?.id)
  const { enabled = true, ...params } = opts
  return useQuery<SuggestedSlot[]>({
    queryKey: ['smart-suggest', userId, params],
    queryFn: () => api.get('/availability/smart-suggest', { params }).then(r => r.data),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useExtraAvailability() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ id: string; date: string; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]>({
    queryKey: ['extra-availability', userId],
    queryFn: () => api.get('/availability/extra').then(r => r.data),
    enabled: !!userId,
  })
}

export function useAvailabilityBlocks() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<AvailabilityBlock[]>({
    queryKey: ['availability-blocks', userId],
    queryFn: () => api.get('/availability/blocks').then(r => r.data),
    enabled: !!userId,
  })
}

export function useAddAvailabilityBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: 'weekly' | 'date'; weekday?: number; date?: string; startTime: string; endTime: string; reason?: string }) =>
      api.post('/availability/blocks', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability-blocks'] }),
  })
}

export function useRemoveAvailabilityBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/availability/blocks/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability-blocks'] }),
  })
}

export function useAddExtraAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { date: string; startTime: string; endTime: string; modality?: 'presencial' | 'online' }) =>
      api.post('/availability/extra', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra-availability'] }),
  })
}

export function useRemoveExtraAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/availability/extra/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra-availability'] }),
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

export function useAddBlockedWeek() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { date: string; reason?: string }) =>
      api.post('/availability/blocked/week', data).then(r => r.data),
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
