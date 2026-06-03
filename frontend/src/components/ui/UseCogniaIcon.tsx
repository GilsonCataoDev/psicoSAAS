import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Library,
  Link2,
  LockKeyhole,
  LogIn,
  LucideIcon,
  MailCheck,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'

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
  | 'instruments'
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

const ICONS: Record<UseCogniaIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  patients: Users,
  calendar: CalendarDays,
  'public-link': Link2,
  sessions: ClipboardList,
  documents: FileText,
  financial: CircleDollarSign,
  settings: Settings,
  login: LogIn,
  signup: UserPlus,
  'email-verification': MailCheck,
  'password-recovery': LockKeyhole,
  'plan-free': BadgeCheck,
  'plan-essential': FileCheck2,
  'plan-professional': Sparkles,
  'automated-messages': MessageCircle,
  instruments: Library,
  billing: CreditCard,
  'payment-methods': CreditCard,
  'security-lgpd': ShieldCheck,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  profile: User,
}

export default function UseCogniaIcon({
  name,
  size = 24,
  className,
  ariaLabel,
}: UseCogniaIconProps) {
  const Icon = ICONS[name]

  return (
    <Icon
      size={size}
      strokeWidth={size >= 64 ? 1.5 : 2}
      className={cn('inline-block shrink-0', className)}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    />
  )
}
