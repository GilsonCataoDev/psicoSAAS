import { useAuthStore } from '@/store/auth'
import { termsFor, type Terms } from '@/lib/terms'

/**
 * Vocabulário da interface para a conta logada. Sem sessão (ou conta antiga
 * sem `profession`), assume o padrão histórico: psicologia.
 */
export function useTerms(): Terms {
  const profession = useAuthStore(s => s.user?.profession)
  return termsFor(profession)
}
