import { cn } from '@/lib/utils'
import { EmotionalTag, TAG_COLORS, TAG_LABELS } from '@/types'

interface TagBadgeProps {
  tag: EmotionalTag
  small?: boolean
}

export function TagBadge({ tag, small }: TagBadgeProps) {
  return (
    <span className={cn('badge', TAG_COLORS[tag], small && 'text-[10px] px-2 py-0.5')}>
      {TAG_LABELS[tag]}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'discharged' | 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'paid' | 'pending' | 'overdue' | 'waived'
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:     { label: 'Ativa',          className: 'bg-sage-100 text-sage-700' },
  paused:     { label: 'Em pausa',       className: 'bg-amber-100 text-amber-700' },
  discharged: { label: 'Alta',           className: 'bg-neutral-100 text-neutral-500' },
  scheduled:  { label: 'Agendada',       className: 'bg-mist-100 text-mist-700' },
  completed:  { label: 'Realizada',      className: 'bg-sage-100 text-sage-700' },
  cancelled:  { label: 'Cancelada',      className: 'bg-neutral-100 text-neutral-500' },
  no_show:    { label: 'Não compareceu', className: 'bg-rose-100 text-rose-700' },
  paid:       { label: 'Pago',           className: 'bg-sage-100 text-sage-700' },
  pending:    { label: 'Pendente',       className: 'bg-amber-100 text-amber-700' },
  overdue:    { label: 'Em atraso',      className: 'bg-rose-100 text-rose-700' },
  waived:     { label: 'Cortesia',       className: 'bg-neutral-100 text-neutral-500' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-600' }
  return <span className={cn('badge', config.className)}>{config.label}</span>
}
