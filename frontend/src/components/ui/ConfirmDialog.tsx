import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  tone?: 'danger' | 'warning'
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger'

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="space-y-5">
        <div className={cn(
          'flex gap-3 rounded-2xl border p-4 text-sm',
          isDanger
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-amber-200 bg-amber-50 text-amber-800',
        )}>
          <AlertTriangle className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            isDanger ? 'text-rose-500' : 'text-amber-500',
          )} />
          <p className="leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary text-sm">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700',
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
