import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import {
  getAnalyticsConsent,
  identifyUser,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '@/lib/analytics'

export default function AnalyticsConsentBanner() {
  const userId  = useAuthStore(state => state.user?.id)
  const [consent, setConsent] = useState<boolean | null>(() => getAnalyticsConsent())

  useEffect(() => subscribeAnalyticsConsent(setConsent), [])

  // Only show to logged-in users who haven't chosen yet
  if (!userId || consent !== null) return null

  function choose(granted: boolean) {
    setAnalyticsConsent(granted)
    if (granted && userId) identifyUser(userId)
  }

  return (
    <aside
      role="dialog"
      aria-label="Conectar métricas à conta"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-sage-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-white/15 dark:bg-neutral-900/95 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sage-100 p-2 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Vincular uso à sua conta?
          </h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Já coletamos métricas anônimas de navegação. Com sua permissão, vinculamos
            essas métricas à sua conta para entender melhor como cada funcionalidade é usada.
            Nenhum dado clínico ou de paciente é enviado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-1.5 text-xs"
              onClick={() => choose(true)}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Sim, vincular
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => choose(false)}
            >
              Não, obrigado
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
