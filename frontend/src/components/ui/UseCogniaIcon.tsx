import { cn } from '@/lib/utils'

export type UseCogniaIconName =
  | 'dashboard'
  | 'patients'
  | 'calendar'
  | 'public-link'
  | 'sessions'
  | 'documents'
  | 'financial'
  | 'settings'
  | 'login'
  | 'signup'
  | 'email-verification'
  | 'password-recovery'
  | 'plan-free'
  | 'plan-essential'
  | 'plan-professional'
  | 'automated-messages'
  | 'billing'
  | 'payment-methods'
  | 'security-lgpd'
  | 'success'
  | 'error'
  | 'warning'
  | 'profile'

interface UseCogniaIconProps {
  name: UseCogniaIconName
  size?: 24 | 32 | 64
  className?: string
  ariaLabel?: string
}

const AVAILABLE_ICONS = new Set<UseCogniaIconName>([
  'dashboard',
  'patients',
  'calendar',
  'public-link',
  'sessions',
  'documents',
  'financial',
  'settings',
  'login',
  'signup',
  'email-verification',
  'password-recovery',
  'plan-free',
  'plan-essential',
  'plan-professional',
  'automated-messages',
  'billing',
  'payment-methods',
  'security-lgpd',
  'success',
  'error',
  'warning',
  'profile',
])

export default function UseCogniaIcon({
  name,
  size = 24,
  className,
  ariaLabel,
}: UseCogniaIconProps) {
  if (!AVAILABLE_ICONS.has(name)) {
    // TODO: adicionar asset proprio para este icone ausente.
    return (
      <span
        className={cn('inline-flex shrink-0 rounded-full border border-current opacity-70', className)}
        style={{ width: size, height: size }}
        aria-hidden={ariaLabel ? undefined : true}
        aria-label={ariaLabel}
        role={ariaLabel ? 'img' : undefined}
      />
    )
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}assets/icons/${size}/icon-${name}.svg`}
      width={size}
      height={size}
      className={cn('inline-block shrink-0 object-contain', className)}
      alt={ariaLabel ?? ''}
      aria-hidden={ariaLabel ? undefined : true}
      loading="lazy"
      decoding="async"
    />
  )
}
