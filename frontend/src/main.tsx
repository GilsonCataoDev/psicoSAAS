import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import App from './App'
import { initAnalytics } from '@/lib/analytics'
import { readPersistedStorage } from '@/lib/storageMigration'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { applyTheme, ThemeMode } from '@/store/theme'
import './index.css'

const CHUNK_RECOVERY_KEY = 'usecognia.chunk-recovery-at'

function isStaleChunkError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? '')
  return [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'Loading chunk',
  ].some(fragment => message.includes(fragment))
}

async function recoverFromStaleChunk() {
  const lastRecovery = Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY) ?? 0)
  if (Date.now() - lastRecovery < 30_000) return
  sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()))

  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.update()
    await new Promise(resolve => window.setTimeout(resolve, 500))
  } finally {
    window.location.reload()
  }
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  void recoverFromStaleChunk()
})

if (
  window.location.protocol === 'http:' &&
  ['usecognia.com.br', 'www.usecognia.com.br'].includes(window.location.hostname)
) {
  window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`)
}

// Silencia rejeicoes nao tratadas do registro do SW (ex: certificado SSL temporario no host)
window.addEventListener('unhandledrejection', (e) => {
  if (isStaleChunkError(e.reason)) {
    e.preventDefault()
    void recoverFromStaleChunk()
    return
  }
  if (e.reason instanceof Error && e.reason.name === 'SecurityError' && e.reason.message.includes('ServiceWorker')) {
    e.preventDefault()
  }
})

const persistedTheme = (() => {
  try {
    const raw = readPersistedStorage('usecognia-theme', 'psicosaas-theme')
    return raw ? JSON.parse(raw)?.state?.mode as ThemeMode | undefined : undefined
  } catch {
    return undefined
  }
})()

function restoreLegacyHashRoute() {
  const hash = window.location.hash
  if (!hash.startsWith('#/')) return

  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const cleanPath = `${basePath}${hash.slice(1)}${window.location.search}`
  window.history.replaceState(null, '', cleanPath)
}

restoreLegacyHashRoute()
applyTheme(persistedTheme ?? 'system')

function runWhenIdle(callback: () => void) {
  const requestIdle = window.requestIdleCallback
  if (requestIdle) requestIdle(callback, { timeout: 3000 })
  else window.setTimeout(callback, 1500)
}

window.addEventListener('load', () => {
  window.setTimeout(() => sessionStorage.removeItem(CHUNK_RECOVERY_KEY), 10_000)
  runWhenIdle(initAnalytics)
  void import('virtual:pwa-register').then(({ registerSW }) => {
      const updateServiceWorker = registerSW({
        immediate: true,
        onNeedRefresh() {
          toast((t) => (
            <div className="flex max-w-sm flex-col gap-3">
              <div>
                <p className="font-semibold text-neutral-900">Atualizacao disponivel</p>
                <p className="mt-1 text-sm text-neutral-600">Recarregue para usar a versao mais recente do UseCognia.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(t.id)
                    void updateServiceWorker(true)
                  }}
                  className="rounded-lg bg-sage-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600"
                >
                  Depois
                </button>
              </div>
            </div>
          ), { duration: 10000 })
        },
        onOfflineReady() {
          toast.success('UseCognia pronto para abrir mais rapido neste dispositivo.')
        },
      })
    })
}, { once: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

useAuthStore.subscribe((state, previousState) => {
  if (state.user?.id !== previousState.user?.id || state.isAuthenticated !== previousState.isAuthenticated) {
    queryClient.clear()
    useSubscriptionStore.getState().invalidateSubscription()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={(import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fafafa',
              color: '#1c1c1a',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
