import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Eye } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import PWAInstallBanner from '@/components/ui/PWAInstallBanner'
import PushNotificationBanner from '@/components/ui/PushNotificationBanner'
import Modal from '@/components/ui/Modal'
import { api, USE_MOCK, type AuthAxiosRequestConfig } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { useFeedbackStatus } from '@/hooks/api/testimonial'

const OnboardingTour = lazy(() => import('@/components/onboarding/OnboardingTour'))
const FirstSessionCelebration = lazy(() => import('@/components/onboarding/FirstSessionCelebration'))
const TestimonialModal = lazy(() => import('@/components/features/testimonial/TestimonialModal'))

function useCoreRoutePreload() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (connection?.saveData) return

    const preload = () => {
      void Promise.allSettled([
        import('@/pages/PatientsPage'),
        import('@/pages/AgendaPage'),
        import('@/pages/SessionsPage'),
      ])
    }

    const requestIdle = window.requestIdleCallback
    let idleId: number | undefined
    const timer = window.setTimeout(() => {
      if (requestIdle) idleId = requestIdle(preload, { timeout: 5000 })
      else preload()
    }, 3000)

    return () => {
      window.clearTimeout(timer)
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
    }
  }, [])
}

function formatDate(date?: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function daysUntil(date?: string | null) {
  if (!date) return 0
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000))
}

function useCsrfBoot() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)
  const resetSubscription = useSubscriptionStore((s) => s.resetSubscription)
  const isSubscriptionLoaded = useSubscriptionStore((s) => s.isLoaded)
  const [booting, setBooting] = useState(() => !(isAuthenticated && isSubscriptionLoaded))

  useEffect(() => {
    if (USE_MOCK) {
      setSubscription({ plan: 'pro', planId: 'pro', status: 'active' })
      setBooting(false)
      return
    }

    api.get('/auth/bootstrap')
      .then(({ data }) => {
        const authUser = data?.user
        if (authUser?.csrfToken) setCsrfToken(authUser.csrfToken)
        if (authUser?.id) setAuth(authUser)
        setSubscription(
          data?.subscription?.status
            ? data.subscription
            : { plan: 'free', planId: 'free', status: 'none' },
        )
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
  const isImpersonating = useAuthStore((s) => Boolean(s.user?.impersonatedBy))
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (USE_MOCK || !isAuthenticated) return
    if (isImpersonating) return

    const refresh = () => {
      api.post('/auth/refresh', undefined, { skipAuthRedirect: true } as AuthAxiosRequestConfig)
        .then(async ({ data }) => {
          if (data?.csrfToken) setCsrfToken(data.csrfToken)
          if (data?.tokens) {
            const { setNativeTokens } = await import('@/lib/nativeAuth')
            await setNativeTokens(data.tokens)
          }
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
  }, [isAuthenticated, isImpersonating, logout, setAuth, setCsrfToken])
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
  const plan = String(subscription.planId ?? subscription.plan ?? 'free')

  if (subscription.status === 'active' && plan === 'free') {
    return (
      <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800 dark:border-sage-400/30 dark:bg-sage-500/15 dark:text-sage-100">
        <p className="font-medium">Plano Gratis ativo</p>
        <p className="mt-1">
          Use o UseCognia sem cartão para organizar sua rotina com até 10 pacientes.
        </p>
      </div>
    )
  }

  if (subscription.status === 'trialing') {
    const remaining = daysUntil(subscription.trialEndsAt)

    return (
      <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800 dark:border-sage-400/30 dark:bg-sage-500/15 dark:text-sage-100">
        <p className="font-medium">Voce esta em periodo de teste</p>
        <p className="mt-1">
          Cobranca em: {formatDate(subscription.trialEndsAt)}. Faltam {remaining} dia{remaining === 1 ? '' : 's'} para a cobranca.
        </p>
      </div>
    )
  }

  if (subscription.status === 'past_due') {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
        <p className="font-medium">Seu teste terminou e o pagamento falhou.</p>
        <Link to="/planos" className="mt-2 inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-white">
          Pagar agora
        </Link>
      </div>
    )
  }

  return null
}

type UpgradeOffer = {
  eligible: boolean
  shouldNotify: boolean
  offerCode: string | null
  promotionalPrice: number | null
  regularPrice: number
  includesTrial: boolean
  discount: { pro: string } | null
  title: string
  message: string
  benefits: string[]
}

function FreeUpgradeOfferModal() {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const plan = String(subscription.planId ?? subscription.plan ?? 'free')
  const queryClient = useQueryClient()
  const [hidden, setHidden] = useState(false)
  const enabled = subscription.status === 'active' && plan === 'free'
  const { data } = useQuery({
    queryKey: ['billing', 'upgrade-offer'],
    queryFn: () => api.get<UpgradeOffer>('/billing/upgrade-offer').then(res => res.data),
    enabled,
    staleTime: 60 * 60 * 1000,
  })

  if (!enabled || hidden || !data?.shouldNotify) return null

  function dismiss() {
    setHidden(true)
    queryClient.setQueryData<UpgradeOffer>(['billing', 'upgrade-offer'], current => (
      current ? { ...current, shouldNotify: false } : current
    ))
    void api.post('/billing/upgrade-offer/viewed').catch(() => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'upgrade-offer'] })
    })
  }

  return (
    <Modal
      open
      onClose={dismiss}
      title="Novidades no UseCognia Pro"
      description="Uma condição especial para sua conta Free"
      size="md"
    >
      <div className="overflow-hidden rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 to-white p-5 dark:border-sage-400/20 dark:from-sage-500/15 dark:to-cognia-panel">
        <p className="text-sm font-medium text-sage-700 dark:text-sage-200">{data.title}</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="font-display text-4xl font-semibold text-sage-700 dark:text-sage-200">R$ 34,90</span>
          <span className="pb-1 text-sm text-neutral-600 dark:text-neutral-300">no primeiro mês</span>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-300">
          Depois, R$ 97,90/mês. {data.includesTrial ? 'Você ainda começa com 7 dias grátis.' : 'Sem fidelidade.'}
        </p>
      </div>

      <p className="mt-5 text-sm text-neutral-600 dark:text-neutral-300">{data.message}</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-200">
        {data.benefits.map(benefit => (
          <li key={benefit} className="flex gap-2">
            <span aria-hidden="true" className="text-sage-600">✓</span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
        Oferta aplicada automaticamente uma vez por conta elegível.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={dismiss} className="btn-secondary">Agora não</button>
        <Link to="/planos" onClick={dismiss} className="btn-primary text-center">Conhecer o Pro</Link>
      </div>
    </Modal>
  )
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
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
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

function ImpersonationBanner() {
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)
  const invalidateSubscription = useSubscriptionStore((s) => s.invalidateSubscription)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  if (!user?.impersonatedBy) return null

  async function exitImpersonation() {
    setExiting(true)
    try {
      await queryClient.cancelQueries()
      queryClient.clear()
      invalidateSubscription()
      // /auth/refresh usa o refresh_token do admin (nunca tocado durante a
      // impersonação) e restaura automaticamente a sessão original.
      const { data } = await api.post('/auth/refresh', undefined, { skipAuthRedirect: true } as AuthAxiosRequestConfig)
      if (data?.csrfToken) setCsrfToken(data.csrfToken)
      if (data?.user) setAuth(data.user)
      const { data: subscription } = await api.get('/billing/me')
      setSubscription(
        subscription?.status
          ? subscription
          : { plan: 'free', planId: 'free', status: 'none' },
      )
      navigate('/admin', { replace: true })
    } catch {
      toast.error('Não foi possível voltar para a conta de admin. Faça login novamente.')
    } finally {
      setExiting(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md">
      <span className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        Você está vendo como <strong>{user.name}</strong> ({user.email})
      </span>
      <button
        type="button"
        onClick={exitImpersonation}
        disabled={exiting}
        className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 disabled:opacity-60"
      >
        {exiting ? 'Voltando...' : 'Voltar para admin'}
      </button>
    </div>
  )
}

function useTestimonialTrigger(enabled: boolean) {
  const { data } = useFeedbackStatus(enabled)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!data?.shouldShow) return
    const timer = window.setTimeout(() => setOpen(true), 3000)
    return () => window.clearTimeout(timer)
  }, [data?.shouldShow])

  return { open, close: () => setOpen(false) }
}

function useNativePushBoot(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    import('@/lib/nativePush').then(({ registerNativePush }) => registerNativePush())
  }, [enabled])
}

export default function AppLayout() {
  const booting = useCsrfBoot()
  useSessionKeepAlive()
  useSubscriptionPolling()
  useCoreRoutePreload()
  useNativePushBoot(!booting)
  const testimonial = useTestimonialTrigger(!booting)
  const location = useLocation()
  const reduce = useReducedMotion()

  if (booting) {
    return (
      <div className="flex h-dvh cognia-surface items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh cognia-surface overflow-hidden flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
      <a href="#main-content" className="skip-link">Ir para o conteúdo</a>
      <a href="#main-navigation" className="skip-link left-44 max-lg:hidden">Ir para o menu</a>
      <a href="#patient-search" className="skip-link left-80 max-md:hidden">Ir para a busca</a>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 pb-28 lg:pb-6 animate-fade-in"
        >
          <div className="max-w-7xl mx-auto">
            <EmailVerificationBanner />
            <SubscriptionBanner />
            <FreeUpgradeOfferModal />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0.01 : 0.18, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <BottomNav />
      <PWAInstallBanner />
      <PushNotificationBanner />
      <Suspense fallback={null}>
        <OnboardingTour />
        <FirstSessionCelebration />
        <TestimonialModal open={testimonial.open} onDone={testimonial.close} />
      </Suspense>
      </div>
    </div>
  )
}
