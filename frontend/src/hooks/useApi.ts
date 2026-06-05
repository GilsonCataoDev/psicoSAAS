import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'
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

export function useAppointments(params?: { patientId?: string; from?: string; to?: string }) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', params],
    queryFn: () => api.get('/appointments', { params }).then(r => r.data),
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
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      if (session?.patientId) qc.invalidateQueries({ queryKey: ['patients', session.patientId] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['financial'] })
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

export function useWhatsAppStatus() {
  return useQuery<{ connected: boolean; configured: boolean }>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/notifications/whatsapp/status').then(r => r.data),
    retry: false,
    staleTime: 30_000,
  })
}

export type TemplateType = 'patient_form' | 'session_note' | 'document' | 'whatsapp_message' | 'receipt'

export type Template = {
  id: string
  type: TemplateType
  name: string
  content: string
  tags: string[]
  isDefault: boolean
}

export function useTemplates(type?: TemplateType) {
  return useQuery<Template[]>({
    queryKey: ['templates', type],
    queryFn: () => api.get('/templates', { params: type ? { type } : undefined }).then(r => r.data),
  })
}

export function useDefaultTemplate(type: TemplateType) {
  return useQuery<Template | null>({
    queryKey: ['templates', type, 'default'],
    queryFn: () => api.get(`/templates/${type}`).then(r => r.data),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: TemplateType; name: string; content: string; tags?: string[] }) =>
      api.post('/templates', data).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      qc.invalidateQueries({ queryKey: ['templates', vars.type] })
    },
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

// ─── Instrument assignments ────────────────────────────────────────────────

export type InstrumentField = {
  id: string
  label: string
  type: 'text' | 'textarea' | 'date' | 'email' | 'tel' | 'number' | 'select'
  options?: string[]
}

export type InstrumentAssignment = {
  id: string
  title: string
  description?: string
  status: 'pending' | 'completed' | 'expired'
  completedAt?: string
  createdAt: string
  fields: InstrumentField[]
  answers: Record<string, string> | null
  responseText?: string | null
}

export function useInstrumentAssignments(patientId?: string) {
  return useQuery<InstrumentAssignment[]>({
    queryKey: ['instrument-assignments', patientId],
    queryFn: () => api.get('/instrument-assignments', { params: { patientId } }).then(r => r.data),
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

export function usePublicInstrument(token: string | undefined) {
  return useQuery<any>({
    queryKey: ['public-instrument', token],
    queryFn: () => api.get(`/public/instruments/${token}`, { skipAuthRedirect: true } as AuthAxiosRequestConfig).then(r => r.data),
    enabled: !!token,
    retry: false,
  })
}

export function useSubmitPublicInstrument(token: string | undefined) {
  return useMutation({
    mutationFn: (answers: Record<string, string>) =>
      api.post(`/public/instruments/${token}`, { answers }, { skipAuthRedirect: true } as AuthAxiosRequestConfig).then(r => r.data),
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

export function useSendDocumentByEmail() {
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      api.post(`/documents/${id}/send-email`, { to }).then(r => r.data),
  })
}
