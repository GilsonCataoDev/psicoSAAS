import { UseCogniaIconName } from '@/components/ui/UseCogniaIcon'
import { hasProfessionCapability, type ProfessionCapability } from '@/lib/professions'
import { termsFor } from '@/lib/terms'

export type NavigationItem = {
  to: string
  icon: UseCogniaIconName
  label: string
  proOnly?: boolean
  mobile?: boolean
  /** Capacidade profissional exigida para exibir a ferramenta. */
  requiredCapability?: ProfessionCapability
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Início', mobile: true },
  { to: '/pacientes', icon: 'patients', label: 'Pacientes', mobile: true },
  { to: '/agenda', icon: 'calendar', label: 'Agenda', mobile: true },
  { to: '/agendamentos', icon: 'public-link', label: 'Agenda pública' },
  { to: '/sessoes', icon: 'sessions', label: 'Sessões' },
  { to: '/documentos', icon: 'documents', label: 'Documentos' },
  { to: '/instrumentos', icon: 'instruments', label: 'Instrumentos', proOnly: true, requiredCapability: 'instruments' },
  { to: '/avaliacoes', icon: 'assessments', label: 'Avaliações', proOnly: true, requiredCapability: 'neuropsych_assessments' },
  { to: '/financeiro', icon: 'financial', label: 'Financeiro', mobile: true },
  { to: '/crm', icon: 'public-link', label: 'CRM' },
  { to: '/relatorios', icon: 'sessions', label: 'Relatórios' },
  { to: '/configuracoes', icon: 'settings', label: 'Ajustes' },
]

/**
 * Itens de navegação ajustados à profissão da conta: esconde os módulos
 * exclusivos por profissão e troca os rótulos que mudam de vocabulário.
 * Para `psicologia` (padrão) devolve exatamente a lista original.
 */
export function getNavigationItems(profession?: string | null): NavigationItem[] {
  const t = termsFor(profession)
  return NAVIGATION_ITEMS
    .filter(item => !item.requiredCapability || hasProfessionCapability(profession, item.requiredCapability))
    .map(item => {
      if (item.to === '/pacientes') return { ...item, label: t.patientsCapitalized }
      if (item.to === '/sessoes') return { ...item, label: t.sessionsCapitalized }
      return item
    })
}
