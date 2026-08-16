import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Session, SessionRevision, NoteSnippet } from '@/types'

export function useSessions(params?: {
  patientId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  includeClinical?: boolean
  enabled?: boolean
}) {
  const { search, enabled, ...apiParams } = params ?? {}
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Session[]>({
    queryKey: ['sessions', userId, apiParams, search],
    queryFn: () => api.get('/sessions', { params: apiParams }).then(r => r.data),
    enabled: (enabled ?? true) && !!userId,
    select: search
      ? (data) => {
          const needle = search.toLowerCase()
          return data.filter(s =>
            s.patient?.name?.toLowerCase().includes(needle)
            || s.summary?.toLowerCase().includes(needle)
            || s.privateNotes?.toLowerCase().includes(needle)
            || s.nextSteps?.toLowerCase().includes(needle)
            || s.tags?.some(t => t.toLowerCase().includes(needle)),
          )
        }
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

export function useCreateHistoricalSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Session>) => api.post('/sessions/historical', data).then(r => r.data),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      if (session?.patientId) qc.invalidateQueries({ queryKey: ['patients', session.patientId] })
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

export function useSessionHistory(sessionId: string | undefined) {
  return useQuery<SessionRevision[]>({
    queryKey: ['session-history', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/history`).then(r => r.data),
    enabled: !!sessionId,
  })
}

export function useAddAddendum() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post(`/sessions/${id}/addendum`, { text }).then(r => r.data),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      if (session?.patientId) qc.invalidateQueries({ queryKey: ['patients', session.patientId] })
    },
  })
}

export function useSnippets() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<NoteSnippet[]>({
    queryKey: ['note-snippets', userId],
    queryFn: () => api.get('/sessions/snippets').then(r => r.data),
    enabled: !!userId,
  })
}

export function useCreateSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; content: string }) =>
      api.post('/sessions/snippets', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note-snippets'] }),
  })
}

export function useDeleteSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/snippets/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note-snippets'] }),
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
    mutationFn: async ({ blob, durationSeconds, patientId }: { blob: Blob; durationSeconds: number; patientId: string }) => {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      form.append('durationSeconds', String(Math.max(1, Math.ceil(durationSeconds))))
      form.append('patientId', patientId)
      return api.post<{ text: string }>('/sessions/transcribe', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
  })
}

export function useTranscribeCall() {
  return useMutation({
    mutationFn: async ({ blob, durationSeconds, patientId }: { blob: Blob; durationSeconds: number; patientId: string }) => {
      const form = new FormData()
      form.append('audio', blob, 'call.webm')
      form.append('durationSeconds', String(Math.max(1, Math.ceil(durationSeconds))))
      form.append('patientId', patientId)
      return api.post<{ text: string }>('/sessions/transcribe-call', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
  })
}

export function useGenerateAiSummary() {
  return useMutation({
    mutationFn: (data: { transcription: string; patientId: string }) =>
      api.post<{ draft: string; draftId: string }>('/sessions/ai-summary', data).then(r => r.data),
  })
}

export function useGenerateProntuarioDraft() {
  return useMutation({
    mutationFn: (data: { input: string; mode: 'resumo' | 'evolucao' | 'organizar'; patientId: string }) =>
      api.post<{ draft: string; draftId: string }>('/sessions/ai-prontuario', data).then(r => r.data),
  })
}

export function useGenerateSessionPlan() {
  return useMutation({
    mutationFn: (data: { clinicalContext: string; patientId: string }) =>
      api.post<{ draft: string; draftId: string }>('/sessions/ai-session-plan', data).then(r => r.data),
  })
}
