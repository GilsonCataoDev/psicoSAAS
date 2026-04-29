import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { identifyUser, resetAnalytics } from '@/lib/analytics'

export interface User {
  id: string
  name: string
  email: string
  crp: string
  avatar?: string
  specialty?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  // token JWT fica em HttpOnly cookie gerenciado pelo browser — nunca aqui
  // csrfToken em memória apenas (não-persistido) — renovado via /auth/me no boot
  csrfToken: string | null
  setAuth: (user: User) => void
  setCsrfToken: (token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      csrfToken: null,

      setAuth: (user) => {
        identifyUser(user.id, { name: user.name, crp: user.crp, specialty: user.specialty })
        set({ user, isAuthenticated: true })
      },

      setCsrfToken: (token) => set({ csrfToken: token }),

      logout: () => {
        resetAnalytics()
        set({ user: null, isAuthenticated: false, csrfToken: null })
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'psicosaas-auth',
      // Persiste SOMENTE o perfil — NUNCA o token JWT nem o csrfToken
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
