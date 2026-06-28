import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Session } from '@/types'

export function useSessions(params?: {
  patientId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  includeClinical?: boolean
  enabled?: boolean
}) {
  const { search, enabled, ...apiParams } = params ?? {}
  return useQuery<Session[]>({
    queryKey: ['sessions', apiParams, search],
    queryFn: () => api.get('/sessions', { params: apiParams }).then(r => r.data),
    enabled: enabled ?? true,
    select: search
      ? (data) => data.filter(s => s.patient?.name?.toLowerCase().includes(search.toLowerCase()))
      : undefined,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Session>) => api.post('/sessions', data).then(r => r.data),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      if (session?.patientId) qc.invalidateQueries({ queryKey: ['patients', session.patientId] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Session> }) =>
      api.patch(`/sessions/${id}`, data).then(r => r.data),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      if (session?.patientId) qc.invalidateQueries({ queryKey: ['patients', session.patientId] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (session?.firstSession) {
        window.dispatchEvent(new CustomEvent('usecognia:first-session-created'))
      }
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useTranscribeAudio() {
  return useMutation({
    mutationFn: async ({ blob, durationSeconds }: { blob: Blob; durationSeconds: number }) => {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      form.append('durationSeconds', String(Math.max(1, Math.ceil(durationSeconds))))
      return api.post<{ text: string }>('/sessions/transcribe', form).then(r => r.data)
    },
  })
}

export function useGenerateAiSummary() {
  return useMutation({
    mutationFn: (data: { transcription: string; patientName?: string }) =>
      api.post<{ draft: string }>('/sessions/ai-summary', data).then(r => r.data),
  })
}
