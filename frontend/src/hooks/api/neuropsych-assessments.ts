import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { NeuropsychAssessment, NeuropsychBatteryItem } from '@/types'

export function useNeuropsychAssessments() {
  return useQuery<NeuropsychAssessment[]>({
    queryKey: ['neuropsych-assessments'],
    queryFn: () => api.get('/neuropsych-assessments').then(response => response.data),
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

export function useCreateNeuropsychBatteryItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<NeuropsychBatteryItem>) =>
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
  })
}

export function useDeleteNeuropsychBatteryItem(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/neuropsych-assessments/${assessmentId}/battery-items/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['neuropsych-assessments', assessmentId] }),
  })
}
