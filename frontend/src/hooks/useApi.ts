import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Patient, Appointment, Session, FinancialRecord } from '@/types'
import { Documento } from '@/types/prontuario'

// ── Auth ──────────────────────────────────────────────────────────────────────

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      api.post('/auth/reset-password', { token, password }).then(r => r.data),
  })
}

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

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> & { prontuario?: Record<string, any>; privateNotes?: string } }) =>
      api.patch(`/patients/${id}`, data).then(r => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patients', vars.id] })
    },
  })
}

export function useMe() {
  return useQuery<any>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
    staleTime: 5 * 60 * 1000,
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

// ── Financial ─────────────────────────────────────────────────────────────────

export function useFinancial(params?: { patientId?: string; status?: string }) {
  return useQuery<FinancialRecord[]>({
    queryKey: ['financial', params],
    queryFn: () => api.get('/financial', { params }).then(r => r.data),
  })
}

export function useCreateFinancial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<FinancialRecord>) => api.post('/financial', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  })
}

export function useMarkFinancialPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      api.patch(`/financial/${id}/pay`, { method }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  })
}

export function useSendCharge() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/financial/${id}/send-charge`).then(r => r.data),
  })
}

export function useGeneratePaymentLink() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ url: string }>(`/financial/${id}/payment-link`).then(r => r.data),
  })
}

export function useChargeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; creditCard: any; creditCardHolderInfo: any }) =>
      api.post<{ message: string; paymentId: string }>(`/financial/${id}/charge-card`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
  })
}

// ── Availability ─────────────────────────────────────────────────────────────

export function useAvailability() {
  return useQuery<{ id: string; weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]>({
    queryKey: ['availability'],
    queryFn: () => api.get('/availability').then(r => r.data),
  })
}

export function useBlockedDates() {
  return useQuery<{ id: string; date: string; reason?: string }[]>({
    queryKey: ['blocked-dates'],
    queryFn: () => api.get('/availability/blocked').then(r => r.data),
  })
}

export function useAddBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { date: string; reason?: string }) =>
      api.post('/availability/blocked', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  })
}

export function useRemoveBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/availability/blocked/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  })
}

export function useSaveAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slots: { weekday: number; startTime: string; endTime: string; modality?: 'presencial' | 'online' }[]) =>
      api.post('/availability/slots', { slots }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  })
}

// ── Booking (authenticated) ───────────────────────────────────────────────────

export function useBookings() {
  return useQuery<any[]>({
    queryKey: ['bookings'],
    queryFn: () => api.get('/booking').then(r => r.data),
  })
}

export function useBookingPage() {
  return useQuery<any>({
    queryKey: ['booking-page'],
    queryFn: () => api.get('/booking/page').then(r => r.data).catch(() => null),
    retry: false,
  })
}

export function useDailyBookingLink() {
  return useQuery<{ token: string; url: string; expiresAt: string }>({
    queryKey: ['booking-daily-link'],
    queryFn: () => api.get('/booking/daily-link').then(r => r.data),
    // Revalida a cada hora — o token muda à meia-noite UTC
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
}

export function useSaveBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/booking/page', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booking-page'] }),
  })
}

export function useConfirmBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/booking/${id}/confirm`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRejectBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/booking/${id}/reject`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function usePayBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, method }: { id: string; method?: string }) =>
      api.patch(`/booking/${id}/pay`, { method: method ?? 'outros' }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/** Sincroniza bookings confirmados que não têm Appointment ainda */
export function useSyncBookingAppointments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/booking/sync-appointments').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

// ── Booking (public) ──────────────────────────────────────────────────────────

export function usePublicBookingPage(slug: string) {
  return useQuery<any>({
    queryKey: ['public-booking', slug],
    queryFn: () => api.get(`/public/booking/${slug}`).then(r => r.data),
    enabled: !!slug,
    retry: false,
  })
}

export function usePublicBookingSlots(slug: string, date: string | null, modality?: string | null) {
  return useQuery<string[]>({
    queryKey: ['public-booking-slots', slug, date, modality],
    queryFn: () => api.get(`/public/booking/${slug}/slots`, { params: { date, modality } }).then(r => r.data),
    enabled: !!slug && !!date && !!modality,
  })
}

export function usePublicBookingDates(slug: string, month: string, modality?: string | null) {
  return useQuery<string[]>({
    queryKey: ['public-booking-dates', slug, month, modality],
    queryFn: () => api.get(`/public/booking/${slug}/dates`, { params: { month, modality } }).then(r => r.data),
    enabled: !!slug && !!month && !!modality,
  })
}

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (data: any) => api.post(`/public/booking/${slug}`, data).then(r => r.data),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteFinancial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/financial/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function useDocuments() {
  return useQuery<Documento[]>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then(r => r.data),
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { patientId: string; patientName: string; type: string; title: string; content: string }) =>
      api.post('/documents', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}
