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
  setAuth: (user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) => {
        identifyUser(user.id, { name: user.name, crp: user.crp, specialty: user.specialty })
        set({ user, isAuthenticated: true })
      },

      logout: () => {
        resetAnalytics()
        set({ user: null, isAuthenticated: false })
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'psicosaas-auth',
      // Persiste SOMENTE o perfil — NUNCA o token JWT
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
