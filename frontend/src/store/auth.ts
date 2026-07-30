import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { identifyUser, resetAnalytics, track, EVENTS } from '@/lib/analytics'
import { migratePersistedStorage } from '@/lib/storageMigration'

export interface User {
  id: string
  name: string
  email: string
  crp: string
  avatar?: string
  avatarUrl?: string
  specialty?: string
  phone?: string
  cpfCnpj?: string
  emailVerified?: boolean
  firstLogin?: boolean
  onboardingStep?: number
  isAdmin?: boolean
  preferences?: Record<string, any>
  impersonatedBy?: string
  impersonatedByEmail?: string
}

function toPersistedUser(user: User | null): User | null {
  if (!user) return null
  const { id, name, email, crp, emailVerified, isAdmin } = user
  // Persistencia minima: evita CPF/CNPJ, telefone e outros dados pessoais no localStorage.
  return { id, name, email, crp, emailVerified, isAdmin }
}

function sanitizePersistedAuth(value: string): string {
  const parsed = JSON.parse(value)
  if (parsed?.state?.user) parsed.state.user = toPersistedUser(parsed.state.user)
  return JSON.stringify(parsed)
}

migratePersistedStorage('usecognia-auth', 'psicosaas-auth', sanitizePersistedAuth)

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
        identifyUser(user.id)
        set({ user, isAuthenticated: true })
      },

      setCsrfToken: (token) => set({ csrfToken: token }),

      logout: () => {
        track(EVENTS.LOGOUT)
        resetAnalytics()
        void import('@/lib/nativePush').then(({ unregisterNativePush }) => unregisterNativePush())
        void import('@/lib/nativeAuth').then(({ clearNativeTokens }) => clearNativeTokens())
        set({ user: null, isAuthenticated: false, csrfToken: null })
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'usecognia-auth',
      // Persiste SOMENTE o perfil — NUNCA o token JWT nem o csrfToken
      partialize: (state) => ({
        user: toPersistedUser(state.user),
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
