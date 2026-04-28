import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Patient, Appointment, Session, FinancialRecord } from '@/types'

// ── Patients ──────────────────────────────────────────────────────────────────

export function usePatients() {
  return useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
  })
}

export function usePatient(id: string) {
  return useQuery<Patient>({
    queryKey: ['patients', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Patient>) => api.post('/patients', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

// ── Appointments ──────────────────────────────────────────────────────────────

export function useAppointments(params?: { patientId?: string }) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', params],
    queryFn: () => api.get('/appointments', { params }).then(r => r.data),
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Appointment>) => api.post('/appointments', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useSessions(params?: { patientId?: string }) {
  return useQuery<Session[]>({
    queryKey: ['sessions', params],
    queryFn: () => api.get('/sessions', { params }).then(r => r.data),
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Session>) => api.post('/sessions', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

// ── Financial ─────────────────────────────────────────────────────────────────

export function useFinancial() {
  return useQuery<FinancialRecord[]>({
    queryKey: ['financial'],
    queryFn: () => api.get('/financial').then(r => r.data),
  })
}

export function useCreateFinancial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<FinancialRecord>) => api.post('/financial', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  })
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
  })
}
