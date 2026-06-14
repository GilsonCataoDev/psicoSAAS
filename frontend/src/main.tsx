import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initAnalytics } from '@/lib/analytics'
import { readPersistedStorage } from '@/lib/storageMigration'
import { applyTheme, ThemeMode } from '@/store/theme'
import './index.css'

if (
  window.location.protocol === 'http:' &&
  ['usecognia.com.br', 'www.usecognia.com.br'].includes(window.location.hostname)
) {
  window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`)
}

// Silencia rejeições não tratadas do registro do SW (ex: erro de cert SSL temporário no GitHub Pages)
window.addEventListener('unhandledrejection', (e) => {
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

applyTheme(persistedTheme ?? 'system')
initAnalytics()

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
              updateServiceWorker(true)
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
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
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
