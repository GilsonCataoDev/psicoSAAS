import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Appointment } from '@/types'

export function useAppointments(params?: { patientId?: string; from?: string; to?: string; enabled?: boolean }) {
  const { enabled, ...apiParams } = params ?? {}
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Appointment[]>({
    queryKey: ['appointments', userId, apiParams],
    queryFn: () => api.get('/appointments', { params: apiParams }).then(r => r.data),
    enabled: (enabled ?? true) && !!userId,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Appointment>) => api.post('/appointments', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      api.patch(`/appointments/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (vars.status === 'no_show') {
        qc.invalidateQueries({ queryKey: ['sessions'] })
      }
    },
  })
}

export function useDeleteAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateAppointmentGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, fromDate, data }: { groupId: string; fromDate: string; data: Partial<Appointment> }) =>
      api.patch(`/appointments/group/${groupId}/from/${fromDate}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteAppointmentGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, fromDate }: { groupId: string; fromDate: string }) =>
      api.delete(`/appointments/group/${groupId}/from/${fromDate}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
