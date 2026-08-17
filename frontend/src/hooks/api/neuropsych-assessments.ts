import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { NeuropsychAiAnalysis, NeuropsychAiAnalysisField, NeuropsychAiUsage, NeuropsychAssessment, NeuropsychBatteryItem } from '@/types'

type CreateNeuropsychBatteryItemInput =
  Pick<NeuropsychBatteryItem, 'name' | 'procedureType' | 'domains'>
  & Partial<Pick<NeuropsychBatteryItem, 'purpose' | 'plannedDate' | 'sortOrder' | 'instrumentAssignmentId'>>

export type NeuropsychAssessmentFilters = {
  status?: NeuropsychAssessment['status']
  patientId?: string
}

export function useNeuropsychAssessments(filters: NeuropsychAssessmentFilters = {}, enabled = true) {
  return useQuery<NeuropsychAssessment[]>({
    queryKey: ['neuropsych-assessments', filters],
    queryFn: () => api.get('/neuropsych-assessments', { params: { ...filters, pageSize: 200 } })
      .then(response => response.data.data as NeuropsychAssessment[]),
    enabled,
  })
}

export function useNeuropsychAssessment(id?: string) {
  return useQuery<NeuropsychAssessment>({
    queryKey: ['neuropsych-assessments', id],
    queryFn: () => api.get(`/neuropsych-assessments/${id}`).then(response => response.data),
    enabled: !!id,
  })
}

export function useCreateNeuropsychAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { patientId: string; startedAt?: string }) =>
      api.post<NeuropsychAssessment>('/neuropsych-assessments', data).then(response => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useUpdateNeuropsychAssessment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<NeuropsychAssessment>) =>
      api.patch<NeuropsychAssessment>(`/neuropsych-assessments/${id}`, data).then(response => response.data),
    onSuccess: data => {
      queryClient.setQueryData(['neuropsych-assessments', id], data)
      queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments'] })
    },
  })
}

export function useDeleteNeuropsychAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/neuropsych-assessments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao excluir. Tente novamente.'),
  })
}

export function useCreateNeuropsychBatteryItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNeuropsychBatteryItemInput) =>
      api.post(`/neuropsych-assessments/${assessmentId}/battery-items`, data).then(response => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId] }),
  })
}

export function useUpdateNeuropsychBatteryItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<NeuropsychBatteryItem> }) =>
      api.patch(`/neuropsych-assessments/${assessmentId}/battery-items/${itemId}`, data).then(response => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao salvar. Tente novamente.'),
  })
}

export function useDeleteNeuropsychBatteryItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/neuropsych-assessments/${assessmentId}/battery-items/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao remover. Tente novamente.'),
  })
}

export function useNeuropsychAiUsage(assessmentId?: string) {
  return useQuery<NeuropsychAiUsage>({
    queryKey: ['neuropsych-assessments', assessmentId, 'ai-usage'],
    queryFn: () => api.get(`/neuropsych-assessments/${assessmentId}/ai-usage`).then(response => response.data),
    enabled: !!assessmentId,
  })
}

export function useNeuropsychAiAnalyses(assessmentId?: string) {
  return useQuery<NeuropsychAiAnalysis[]>({
    queryKey: ['neuropsych-assessments', assessmentId, 'ai-analysis'],
    queryFn: () => api.get(`/neuropsych-assessments/${assessmentId}/ai-analysis`).then(response => response.data),
    enabled: !!assessmentId,
  })
}

export function useGenerateNeuropsychAiAnalysis(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: NeuropsychAiAnalysisField[]) =>
      api.post<NeuropsychAiAnalysis>(`/neuropsych-assessments/${assessmentId}/ai-analysis`, { fields }).then(response => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId, 'ai-analysis'] })
      queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId, 'ai-usage'] })
    },
  })
}

export function useExportNeuropsychAssessment(assessmentId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(`/neuropsych-assessments/${assessmentId}/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      const cd = res.headers['content-disposition'] as string | undefined
      const match = cd?.match(/filename="([^"]+)"/)
      a.href = url
      a.download = match?.[1] ?? `Laudo_${assessmentId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    onError: () => toast.error('Erro ao gerar o laudo. Tente novamente.'),
  })
}

export function useCreateNeuropsychShareLink(assessmentId: string) {
  return useMutation({
    mutationFn: () => api.post<{ url: string }>(`/neuropsych-assessments/${assessmentId}/share`).then(response => response.data),
    onError: () => toast.error('Erro ao gerar o link. Tente novamente.'),
  })
}

export function useRevokeNeuropsychShareLink(assessmentId: string) {
  return useMutation({
    mutationFn: () => api.delete(`/neuropsych-assessments/${assessmentId}/share`),
    onError: () => toast.error('Erro ao revogar o link. Tente novamente.'),
  })
}

export function useDeleteNeuropsychAiAnalysis(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (analysisId: string) => api.delete(`/neuropsych-assessments/${assessmentId}/ai-analysis/${analysisId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId, 'ai-analysis'] }),
  })
}
