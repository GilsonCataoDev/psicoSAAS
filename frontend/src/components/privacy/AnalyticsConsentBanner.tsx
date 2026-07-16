import { useEffect, useState } from 'react'
import { BarChart3, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import {
  getAnalyticsConsent,
  identifyUser,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '@/lib/analytics'

export default function AnalyticsConsentBanner() {
  const userId = useAuthStore(state => state.user?.id)
  const [consent, setConsent] = useState<boolean | null>(() => getAnalyticsConsent())

  useEffect(() => subscribeAnalyticsConsent(setConsent), [])

  if (consent !== null) return null

  function choose(granted: boolean) {
    setAnalyticsConsent(granted)
    if (granted && userId) identifyUser(userId)
  }

  return (
    <aside
      role="dialog"
      aria-label="Preferência de métricas de uso"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-sage-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-white/15 dark:bg-neutral-900/95 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sage-100 p-2 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Ajude a melhorar o UseCognia
          </h2>
          <p className="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-300">
            Podemos coletar métricas básicas de uso. Não gravamos a tela nem enviamos nomes,
            dados de pacientes, anotações clínicas ou informações financeiras.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary inline-flex items-center gap-2 text-sm" onClick={() => choose(true)}>
              <BarChart3 className="h-4 w-4" />
              Permitir métricas
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => choose(false)}>
              Agora não
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
