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
  sage:  'bg-sage-50  border-sage-100',
  amber: 'bg-amber-50 border-amber-100',
  rose:  'bg-rose-50  border-rose-100',
  mist:  'bg-mist-50  border-mist-100',
}

const iconAccents = {
  sage:  'bg-sage-100  text-sage-600',
  amber: 'bg-amber-100 text-amber-600',
  rose:  'bg-rose-100  text-rose-600',
  mist:  'bg-mist-100  text-mist-600',
}

export default function StatCard({ label, value, sub, icon, trend, accent = 'sage', className }: StatCardProps) {
  return (
    <div className={cn('card', accents[accent], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-neutral-800">{value}</p>
          {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.positive ? 'text-sage-600' : 'text-rose-600')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% este mês
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconAccents[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
