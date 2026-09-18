import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'

export type PatientTask = {
  id: string
  patientId: string
  userId: string
  title: string
  description?: string | null
  dueDate?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CreatePatientTaskData = {
  title: string
  description?: string
  dueDate?: string
}

export type UpdatePatientTaskData = Partial<CreatePatientTaskData>

export function usePatientTasks(patientId: string | undefined) {
  return useQuery<PatientTask[]>({
    queryKey: ['patient-tasks', patientId],
    queryFn: () => api.get(`/patients/${patientId}/tasks`).then(r => r.data),
    enabled: !!patientId,
  })
}

export function useCreatePatientTask(patientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePatientTaskData) =>
      api.post(`/patients/${patientId}/tasks`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-tasks', patientId] })
    },
  })
}

export function useUpdatePatientTask(patientId: string | undefined, taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePatientTaskData) =>
      api.patch(`/patients/${patientId}/tasks/${taskId}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-tasks', patientId] })
    },
  })
}

export function useDeletePatientTask(patientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/patients/${patientId}/tasks/${taskId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-tasks', patientId] })
    },
  })
}

export function useCompletePortalTask(token: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, complete }: { taskId: string; complete: boolean }) => {
      const action = complete ? 'complete' : 'uncomplete'
      const config: AuthAxiosRequestConfig = { skipAuthRedirect: true }
      return api.patch(`/patient-portal/${token}/tasks/${taskId}/${action}`, {}, config).then(r => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-portal', token] })
    },
  })
}
