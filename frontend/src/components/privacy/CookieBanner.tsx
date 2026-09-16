import { useState } from 'react'
import { Cookie } from 'lucide-react'
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics'

export default function CookieBanner() {
  const [consent, setConsent] = useState<boolean | null>(() => getAnalyticsConsent())

  // Already decided, or logged-in banner (AnalyticsConsentBanner) handles it
  if (consent !== null) return null

  function choose(granted: boolean) {
    setAnalyticsConsent(granted)
    setConsent(granted)
  }

  return (
    <aside
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-3 bottom-3 z-[99] mx-auto max-w-xl rounded-2xl border border-sage-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-white/15 dark:bg-neutral-900/95 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sage-100 p-2 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Usamos cookies e análise de navegação
          </h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Coletamos dados anônimos de uso (PostHog) e conversão (Meta Pixel) para melhorar o
            produto. Nenhum dado clínico ou de paciente é coletado aqui.
            Veja nossa{' '}
            <a href="/privacidade" className="underline hover:text-neutral-700 dark:hover:text-neutral-200">
              Política de Privacidade
            </a>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sage-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-900"
              onClick={() => choose(true)}
            >
              Aceitar
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/5"
              onClick={() => choose(false)}
            >
              Recusar
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
