import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  trend?: { value: number; positive: boolean }
  accent?: 'sage' | 'amber' | 'rose' | 'mist'
  className?: string
}

const accents = {
  sage:  { bar: 'bg-sage-500',  icon: 'bg-sage-100  text-sage-600',  sub: 'text-sage-600'  },
  amber: { bar: 'bg-amber-400', icon: 'bg-amber-100 text-amber-600', sub: 'text-amber-600' },
  rose:  { bar: 'bg-rose-400',  icon: 'bg-rose-100  text-rose-600',  sub: 'text-rose-600'  },
  mist:  { bar: 'bg-mist-500',  icon: 'bg-mist-100  text-mist-600',  sub: 'text-mist-600'  },
}

export default function StatCard({ label, value, sub, icon, trend, accent = 'sage', className }: StatCardProps) {
  const a = accents[accent]

  return (
    <div className={cn(
      'card relative overflow-hidden flex flex-col gap-3',
      className,
    )}>
      {/* Barra de acento lateral */}
      <div className={cn('absolute left-0 top-4 bottom-4 w-1 rounded-r-full', a.bar)} />

      <div className="flex items-start justify-between pl-3">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide leading-none">
          {label}
        </p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', a.icon)}>
            {icon}
          </div>
        )}
      </div>

      <div className="pl-3">
        <p className="text-2xl font-semibold text-neutral-800 leading-none tracking-tight">
          {value}
        </p>
        {sub && (
          <p className={cn('text-xs mt-1.5 font-medium', a.sub)}>
            {sub}
          </p>
        )}
        {trend && (
          <p className={cn('text-xs mt-1.5 font-medium flex items-center gap-0.5',
            trend.positive ? 'text-sage-600' : 'text-rose-500')}>
            <span>{trend.positive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% este mês</span>
          </p>
        )}
      </div>
    </div>
  )
}
