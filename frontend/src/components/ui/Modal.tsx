import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

export default function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            // Mobile: full screen bottom sheet
            'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-lifted p-5 animate-slide-up',
            // Desktop: centered modal
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:rounded-3xl sm:w-full sm:p-6',
            // Max-height on mobile
            'max-h-[92dvh] overflow-y-auto',
            sizes[size],
          )}
        >
          {/* Drag handle — mobile only */}
          <div className="sm:hidden w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4" />

          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-lg font-display font-medium text-neutral-800">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-neutral-500 mt-0.5">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors ml-4 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
