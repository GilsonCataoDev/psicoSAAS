import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import PWAInstallBanner from '@/components/ui/PWAInstallBanner'
import { api, USE_MOCK } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

/**
 * Restaura o csrfToken em memória após um page refresh.
 * /auth/me valida o access token (via cookie) e retorna um novo csrfToken.
 * Sem isso, requisições de mutação falhariam com 403 após F5.
 */
function useCsrfBoot() {
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setAuth      = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    if (USE_MOCK) return
    api.get('/auth/me')
      .then(res => {
        if (res.data?.csrfToken) setCsrfToken(res.data.csrfToken)
        if (res.data?.id)        setAuth(res.data)
      })
      .catch(() => { /* 401 → interceptor já redireciona para /login */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default function AppLayout() {
  useCsrfBoot()

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar — visível apenas em lg+ */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 animate-fade-in">
          <div className="max-w-7xl mx-auto">
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
