import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export type InstrumentField = {
  id: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'email' | 'tel' | 'number' | 'select'
  options?: string[]
}

export type InstrumentAssignment = {
  id: string
  instrumentId: string
  title: string
  description?: string
  category: string
  status: 'pending' | 'completed' | 'expired'
  completedAt?: string
  createdAt: string
  fields: InstrumentField[]
  answers: Record<string, string> | null
  responseText?: string | null
  score?: number | null
  scoreDetails?: string | null
}

export type PublicInstrumentData = {
  token: string
  instrumentId: string
  category: string
  title: string
  description?: string
  patientName?: string | null
  expiresAt: string
  fields: InstrumentField[]
}

export function useInstrumentAssignments(patientId?: string) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<InstrumentAssignment[]>({
    queryKey: ['instrument-assignments', userId, patientId],
    queryFn: () => api.get('/instrument-assignments', { params: { patientId } }).then(r => r.data),
    enabled: !!userId,
  })
}

export function useCreateInstrumentAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      patientId: string
      instrumentId: string
      title: string
      description?: string
      category: string
      template: string
      sendWhatsApp?: boolean
    }) => api.post('/instrument-assignments', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instrument-assignments'] }),
  })
}

export function useUpdateInstrumentAnswers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, string> }) =>
      api.patch(`/instrument-assignments/${id}/answers`, { answers }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instrument-assignments'] }),
  })
}

export type AssessmentAiInterpretationResult = {
  draft: string
  criticalAlert: string | null
}

export function useAssessmentAiInterpretation() {
  return useMutation({
    mutationFn: ({ id, scaleName, scoreDetails, criticalFlags }: {
      id: string
      scaleName: string
      scoreDetails: { score: number; level?: string; subscales?: Array<{ label: string; score: number; level?: string }> }
      criticalFlags: Array<{ label: string; note: string }>
    }) =>
      api.post<AssessmentAiInterpretationResult>(`/instrument-assignments/${id}/ai-interpretation`, {
        scaleName, scoreDetails, criticalFlags,
      }).then(r => r.data),
  })
}

export function usePublicInstrument(token: string | undefined) {
  return useQuery<PublicInstrumentData>({
    queryKey: ['public-instrument', token],
    queryFn: () =>
      api.get(`/public/instruments/${token}`, { skipAuthRedirect: true } as AuthAxiosRequestConfig).then(r => r.data),
    enabled: !!token,
    retry: false,
  })
}

export function useSubmitPublicInstrument(token: string | undefined) {
  return useMutation({
    mutationFn: ({ answers, score, scoreDetails }: {
      answers: Record<string, string>
      score?: number | null
      scoreDetails?: string | null
    }) =>
      api.post(
        `/public/instruments/${token}`,
        { answers, score, scoreDetails },
        { skipAuthRedirect: true } as AuthAxiosRequestConfig,
      ).then(r => r.data),
  })
}
