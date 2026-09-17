import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { NutritionAssessment } from '@/types'

export type CreateNutritionAssessmentInput = Pick<NutritionAssessment, 'patientId' | 'weightKg'>
  & Partial<Pick<NutritionAssessment, 'assessedAt' | 'heightCm' | 'waistCm' | 'bodyFatPercent' | 'notes'>>

export function useNutritionAssessments(patientId?: string, enabled = true) {
  return useQuery<NutritionAssessment[]>({
    queryKey: ['nutrition-assessments', patientId],
    queryFn: () => api.get('/nutrition-assessments', { params: { patientId } }).then(response => response.data),
    enabled: Boolean(patientId) && enabled,
  })
}

export function useCreateNutritionAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNutritionAssessmentInput) =>
      api.post<NutritionAssessment>('/nutrition-assessments', data).then(response => response.data),
    onSuccess: (_, data) => queryClient.invalidateQueries({ queryKey: ['nutrition-assessments', data.patientId] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Não foi possível salvar a avaliação.'),
  })
}

export function useDeleteNutritionAssessment(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/nutrition-assessments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition-assessments', patientId] }),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Não foi possível excluir o registro.'),
  })
}
