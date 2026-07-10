import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

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

export interface PublicTestimonial {
  firstName: string
  rating: number | null
  text: string | null
  createdAt: string
}

export function usePublicTestimonials() {
  return useQuery<{ count: number; averageRating: number | null; items: PublicTestimonial[] }>({
    queryKey: ['feedback', 'public'],
    queryFn: () => api.get('/feedback/public').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  })
}

export function useFeedbackStatus(enabled = true) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery<{ shouldShow: boolean }>({
    queryKey: ['feedback', 'status', userId],
    queryFn: () =>
      api.get('/feedback/status', { skipAuthRedirect: true } as AuthAxiosRequestConfig)
        .then(r => r.data)
        .catch((err) => {
          if (err?.response?.status === 401) return { shouldShow: false }
          throw err
        }),
    enabled: enabled && !!userId,
    staleTime: Infinity,
    retry: false,
  })
}

export function useSubmitTestimonial() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  return useMutation({
    mutationFn: ({ rating, text, publicConsent }: { rating: number; text?: string; publicConsent?: boolean }) =>
      api.post('/feedback', { rating, text, publicConsent }).then(r => r.data),
    onSuccess: () => qc.setQueryData(['feedback', 'status', userId], { shouldShow: false }),
  })
}

export function useDismissTestimonial() {
  const qc = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  return useMutation({
    mutationFn: () => api.post('/feedback', { dismissed: true }).then(r => r.data),
    onSuccess: () => qc.setQueryData(['feedback', 'status', userId], { shouldShow: false }),
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
