import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import PWAInstallBanner from '@/components/ui/PWAInstallBanner'
import OnboardingTour from '@/components/onboarding/OnboardingTour'
import FirstSessionCelebration from '@/components/onboarding/FirstSessionCelebration'
import { api, USE_MOCK, type AuthAxiosRequestConfig } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'

function formatDate(date?: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function daysUntil(date?: string | null) {
  if (!date) return 0
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000))
}

function useCsrfBoot() {
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)
  const resetSubscription = useSubscriptionStore((s) => s.resetSubscription)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    if (USE_MOCK) {
      setSubscription({ plan: 'pro', planId: 'pro', status: 'active' })
      setBooting(false)
      return
    }

    const loadSession = () => api.get('/auth/me', { skipAuthRedirect: true } as AuthAxiosRequestConfig)
      .catch((err) => {
        if (err?.response?.status !== 401) throw err
        return api.post('/auth/refresh', undefined, { skipAuthRedirect: true } as AuthAxiosRequestConfig)
          .then(() => api.get('/auth/me', { skipAuthRedirect: true } as AuthAxiosRequestConfig))
      })

    loadSession()
      .then(res => {
        if (res.data?.csrfToken) setCsrfToken(res.data.csrfToken)
        if (res.data?.id) setAuth(res.data)
        return api.get('/billing/me')
      })
      .then(res => {
        setSubscription(res.data?.status ? res.data : { plan: 'free', planId: 'free', status: 'none' })
      })
      .catch((err) => {
        if (err?.response?.status === 401) logout()
        if (err?.response?.status === 403) resetSubscription()
      })
      .finally(() => setBooting(false))
  }, [logout, resetSubscription, setAuth, setCsrfToken, setSubscription])

  return booting
}

function useSessionKeepAlive() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (USE_MOCK || !isAuthenticated) return

    const refresh = () => {
      api.post('/auth/refresh', undefined, { skipAuthRedirect: true } as AuthAxiosRequestConfig)
        .then(({ data }) => {
          if (data?.csrfToken) setCsrfToken(data.csrfToken)
          if (data?.user) setAuth(data.user)
        })
        .catch((err) => {
          if (err?.response?.status === 401) logout()
        })
    }

    const timer = window.setInterval(refresh, 10 * 60 * 1000)
    window.addEventListener('online', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', refresh)
    }
  }, [isAuthenticated, logout, setAuth, setCsrfToken])
}

function useSubscriptionPolling() {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)

  useEffect(() => {
    if (USE_MOCK) return
    if (subscription.status !== 'trialing' && subscription.status !== 'pending') return

    const timer = window.setInterval(() => {
      api.get('/billing/me')
        .then((res) => {
          setSubscription(res.data?.status ? res.data : { plan: 'free', planId: 'free', status: 'none' })
        })
        .catch(() => {})
    }, 5000)

    return () => window.clearInterval(timer)
  }, [setSubscription, subscription.status])
}

function SubscriptionBanner() {
  const subscription = useSubscriptionStore((s) => s.subscription)

  if (subscription.status === 'trialing') {
    const remaining = daysUntil(subscription.trialEndsAt)

    return (
      <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800">
        <p className="font-medium">Voce esta em periodo de teste</p>
        <p className="mt-1">
          Cobranca em: {formatDate(subscription.trialEndsAt)}. Faltam {remaining} dia{remaining === 1 ? '' : 's'} para a cobranca.
        </p>
      </div>
    )
  }

  if (subscription.status === 'past_due') {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">Seu teste terminou e o pagamento falhou.</p>
        <Link to="/planos" className="mt-2 inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-white">
          Pagar agora
        </Link>
      </div>
    )
  }

  return null
}

function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  if (!user || user.emailVerified) return null

  async function resendVerification() {
    setSending(true)
    setSendError(null)
    try {
      const { data } = await api.post('/auth/resend-verification')
      toast.success(data?.message ?? 'Link de verificacao enviado.')
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Nao foi possivel reenviar agora.'
      setSendError(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-medium">Confirme seu e-mail para proteger sua conta.</p>
      <p className="mt-1">Enviamos um link para {user.email}. Confira tambem spam ou lixo eletronico.</p>
      <button
        type="button"
        onClick={resendVerification}
        disabled={sending}
        className="mt-2 inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-white disabled:opacity-60"
      >
        {sending ? 'Enviando...' : 'Reenviar link'}
      </button>
      {sendError && (
        <p className="mt-2 text-xs text-amber-900">
          {sendError}
        </p>
      )}
    </div>
  )
}

export default function AppLayout() {
  const booting = useCsrfBoot()
  useSessionKeepAlive()
  useSubscriptionPolling()

  if (booting) {
    return (
      <div className="flex h-dvh cognia-surface items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh cognia-surface overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 pb-28 lg:pb-6 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <EmailVerificationBanner />
            <SubscriptionBanner />
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
      <PWAInstallBanner />
      <OnboardingTour />
      <FirstSessionCelebration />
    </div>
  )
}
