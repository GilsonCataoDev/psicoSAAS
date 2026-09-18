import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { NutritionPlan } from '@/types'

export type CreateNutritionPlanInput = {
  patientId: string
  title?: string
  content: string
  totalCalories?: number
  validFrom?: string
  validUntil?: string
}

export type UpdateNutritionPlanInput = Partial<Omit<CreateNutritionPlanInput, 'patientId'>>

export function useNutritionPlans(patientId?: string, enabled = true) {
  return useQuery<NutritionPlan[]>({
    queryKey: ['nutrition-plans', patientId],
    queryFn: () =>
      api.get('/nutrition-plans', { params: { patientId } }).then(response => response.data),
    enabled: Boolean(patientId) && enabled,
  })
}

export function useCreateNutritionPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNutritionPlanInput) =>
      api.post<NutritionPlan>('/nutrition-plans', data).then(response => response.data),
    onSuccess: (_, data) =>
      queryClient.invalidateQueries({ queryKey: ['nutrition-plans', data.patientId] }),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Não foi possível salvar o plano alimentar.'),
  })
}

export function useUpdateNutritionPlan(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNutritionPlanInput }) =>
      api.patch<NutritionPlan>(`/nutrition-plans/${id}`, data).then(response => response.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['nutrition-plans', patientId] }),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Não foi possível atualizar o plano alimentar.'),
  })
}

export function useDeleteNutritionPlan(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/nutrition-plans/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['nutrition-plans', patientId] }),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Não foi possível excluir o plano alimentar.'),
  })
}
