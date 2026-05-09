import { cn } from '@/lib/utils'

interface EmptyStateProps {
  image?: string
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ image, icon, title, description, actionLabel, onAction, action, className }: EmptyStateProps) {
  const actionNode = action ?? (actionLabel && onAction ? (
    <button type="button" onClick={onAction} className="btn-primary">
      {actionLabel}
    </button>
  ) : null)

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {image ? (
        <img
          src={`${import.meta.env.BASE_URL}assets/empty-states/${image}`}
          alt=""
          className="mb-5 h-36 w-auto max-w-full object-contain"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      ) : icon ? (
        <div className="w-14 h-14 bg-sage-50 rounded-2xl flex items-center justify-center mb-4 text-sage-400">
          {icon}
        </div>
      ) : null}
      <h3 className="font-semibold text-neutral-700 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-neutral-400 max-w-xs leading-relaxed">{description}</p>}
      {actionNode && <div className="mt-6">{actionNode}</div>}
    </div>
  )
}
