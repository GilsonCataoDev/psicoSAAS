import { useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import PWAInstallBanner from '@/components/ui/PWAInstallBanner'
import { api, USE_MOCK } from '@/lib/api'
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

/**
 * Restaura o csrfToken em memória após um page refresh.
 * /auth/me valida o access token (via cookie) e retorna um novo csrfToken.
 * Sem isso, requisições de mutação falhariam com 403 após F5.
 */
function useCsrfBoot() {
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)
  const resetSubscription = useSubscriptionStore((s) => s.resetSubscription)

  useEffect(() => {
    if (USE_MOCK) {
      setSubscription({ plan: 'pro', planId: 'pro', status: 'active' })
      return
    }
    api.get('/auth/me')
      .then(res => {
        if (res.data?.csrfToken) setCsrfToken(res.data.csrfToken)
        if (res.data?.id)        setAuth(res.data)
        return api.get('/billing/me')
      })
      .then(res => {
        setSubscription(res.data?.status ? res.data : { plan: 'essencial', planId: 'essencial', status: 'none' })
      })
      .catch((err) => {
        if (err?.response?.status === 403) resetSubscription()
        /* 401 → interceptor já redireciona para /login */
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
          setSubscription(res.data?.status ? res.data : { plan: 'essencial', planId: 'essencial', status: 'none' })
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
        <p className="font-medium">Você está em período de teste</p>
        <p className="mt-1">
          Cobrança em: {formatDate(subscription.trialEndsAt)}. Faltam {remaining} dia{remaining === 1 ? '' : 's'} para a cobrança.
        </p>
      </div>
    )
  }

  if (subscription.status === 'past_due') {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">Seu teste terminou e o pagamento falhou.</p>
        <Link to="/pricing" className="mt-2 inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-white">
          Pagar agora
        </Link>
      </div>
    )
  }

  return null
}

export default function AppLayout() {
  useCsrfBoot()
  useSubscriptionPolling()

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar — visível apenas em lg+ */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <SubscriptionBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Nav — visível apenas em mobile/tablet */}
      <BottomNav />
      <PWAInstallBanner />
    </div>
  )
}
