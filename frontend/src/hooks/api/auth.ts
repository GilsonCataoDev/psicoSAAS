import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type User } from '@/store/auth'

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

export function useMe() {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
}
