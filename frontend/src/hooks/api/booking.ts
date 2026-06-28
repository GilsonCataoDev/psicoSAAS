import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'
import { Booking, BookingPage } from '@/types/booking'

// ── Autenticado ───────────────────────────────────────────────────────────────

export function useBookings() {
  return useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => api.get('/booking').then(r => r.data),
  })
}

export function useBookingPage() {
  return useQuery<BookingPage | null>({
    queryKey: ['booking-page'],
    queryFn: () => api.get('/booking/page').then(r => r.data).catch(() => null),
    retry: false,
  })
}

export function useDailyBookingLink() {
  return useQuery<{ slug: string; url: string; token?: string; expiresAt?: string }>({
    queryKey: ['booking-daily-link'],
    queryFn: () => api.get('/booking/daily-link').then(r => r.data),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
}

export function useSaveBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<BookingPage>) => api.post('/booking/page', data).then(r => r.data),
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

// ── Público ───────────────────────────────────────────────────────────────────

export function usePublicBookingPage(slug: string) {
  return useQuery<BookingPage>({
    queryKey: ['public-booking', slug],
    queryFn: () => api.get(`/public/booking/${slug}`, { skipAuthRedirect: true } as AuthAxiosRequestConfig).then(r => r.data),
    enabled: !!slug,
    retry: false,
  })
}

export function usePublicBookingSlots(slug: string, date: string | null, modality?: string | null) {
  return useQuery<string[]>({
    queryKey: ['public-booking-slots', slug, date, modality],
    queryFn: () => api.get(`/public/booking/${slug}/slots`, {
      params: { date, modality },
      skipAuthRedirect: true,
    } as AuthAxiosRequestConfig).then(r => r.data),
    enabled: !!slug && !!date && !!modality,
  })
}

export function usePublicBookingDates(slug: string, month: string, modality?: string | null, enabled = true) {
  return useQuery<string[]>({
    queryKey: ['public-booking-dates', slug, month, modality],
    queryFn: () => api.get(`/public/booking/${slug}/dates`, {
      params: { month, modality },
      skipAuthRedirect: true,
    } as AuthAxiosRequestConfig).then(r => r.data),
    enabled: enabled && !!slug && !!month && !!modality,
  })
}

export interface CreateBookingInput {
  patientName: string
  patientEmail: string
  patientPhone?: string
  modality: 'presencial' | 'online'
  patientNotes?: string
  date: string
  time: string
}

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (data: CreateBookingInput) =>
      api.post(`/public/booking/${slug}`, data, { skipAuthRedirect: true } as AuthAxiosRequestConfig).then(r => r.data),
  })
}
