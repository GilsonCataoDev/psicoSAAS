import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AdminTestimonial {
  id: string
  userId: string
  userName: string
  userEmail: string
  rating: number | null
  text: string | null
  approvedForPublic: boolean
  publicConsent: boolean
  createdAt: string
}

export function useFeedbackStatus() {
  return useQuery<{ shouldShow: boolean }>({
    queryKey: ['feedback', 'status'],
    queryFn: () => api.get('/feedback/status').then(r => r.data),
    staleTime: Infinity,
    retry: false,
  })
}

export function useSubmitTestimonial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rating, text, publicConsent }: { rating: number; text?: string; publicConsent?: boolean }) =>
      api.post('/feedback', { rating, text, publicConsent }).then(r => r.data),
    onSuccess: () => qc.setQueryData(['feedback', 'status'], { shouldShow: false }),
  })
}

export function useDismissTestimonial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/feedback', { dismissed: true }).then(r => r.data),
    onSuccess: () => qc.setQueryData(['feedback', 'status'], { shouldShow: false }),
  })
}

export function useAdminTestimonials() {
  return useQuery<AdminTestimonial[]>({
    queryKey: ['admin', 'testimonials'],
    queryFn: () => api.get('/feedback/admin/testimonials').then(r => r.data),
  })
}

export function useAdminSetTestimonialApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approvedForPublic }: { id: string; approvedForPublic: boolean }) =>
      api.patch(`/feedback/admin/testimonials/${id}`, { approvedForPublic }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'testimonials'] }),
  })
}
