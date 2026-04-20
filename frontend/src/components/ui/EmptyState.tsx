import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4 text-neutral-400">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-neutral-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-400 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
