import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Booking, BookingPage } from '@/types/booking'

// ── Autenticado ───────────────────────────────────────────────────────────────

export function useBookings() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<Booking[]>({
    queryKey: ['bookings', userId],
    queryFn: () => api.get('/booking').then(r => r.data),
    enabled: !!userId,
  })
}

export function useBookingPage() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<BookingPage | null>({
    queryKey: ['booking-page', userId],
    queryFn: () => api.get('/booking/page').then(r => r.data).catch(() => null),
    enabled: !!userId,
    retry: false,
  })
}

export function useDailyBookingLink() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ slug: string; url: string; token?: string; expiresAt?: string }>({
    queryKey: ['booking-daily-link', userId],
    queryFn: () => api.get('/booking/daily-link').then(r => r.data),
    enabled: !!userId,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
}

export function useSaveBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<BookingPage>) => api.post('/booking/page', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-page'] })
      qc.invalidateQueries({ queryKey: ['booking-daily-link'] })
    },
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
  patientName?: string
  patientEmail?: string
  patientPhone?: string
  modality: 'presencial' | 'online'
  patientNotes?: string
  date: string
  time: string
  useSavedContact?: boolean
  rememberContact?: boolean
}

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (data: CreateBookingInput) =>
      api.post(`/public/booking/${slug}`, data, { skipAuthRedirect: true } as AuthAxiosRequestConfig).then(r => r.data),
  })
}

export type BookingContactMemoryPreview = {
  available: boolean
  name?: string
  email?: string
  phone?: string
}

export function useBookingContactMemory() {
  return useQuery<BookingContactMemoryPreview>({
    queryKey: ['booking-contact-memory'],
    queryFn: () => api.get('/public/booking/contact-memory', {
      skipAuthRedirect: true,
    } as AuthAxiosRequestConfig).then(response => response.data),
    staleTime: 60_000,
  })
}

export function useForgetBookingContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/public/booking/contact-memory', {
      skipAuthRedirect: true,
    } as AuthAxiosRequestConfig),
    onSuccess: () => queryClient.setQueryData(['booking-contact-memory'], { available: false }),
  })
}
