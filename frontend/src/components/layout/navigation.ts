import { UseCogniaIconName } from '@/components/ui/UseCogniaIcon'

export type NavigationItem = {
  to: string
  icon: UseCogniaIconName
  label: string
  proOnly?: boolean
  mobile?: boolean
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Início', mobile: true },
  { to: '/pacientes', icon: 'patients', label: 'Pacientes', mobile: true },
  { to: '/agenda', icon: 'calendar', label: 'Agenda', mobile: true },
  { to: '/agendamentos', icon: 'public-link', label: 'Agenda pública' },
  { to: '/sessoes', icon: 'sessions', label: 'Sessões' },
  { to: '/documentos', icon: 'documents', label: 'Documentos' },
  { to: '/instrumentos', icon: 'instruments', label: 'Instrumentos', proOnly: true },
  { to: '/avaliacoes', icon: 'assessments', label: 'Avaliações', proOnly: true },
  { to: '/financeiro', icon: 'financial', label: 'Financeiro', mobile: true },
  { to: '/configuracoes', icon: 'settings', label: 'Ajustes' },
]
