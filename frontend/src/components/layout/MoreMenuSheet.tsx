import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, ShieldCheck, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useHasPlan } from '@/store/subscription'
import { cn } from '@/lib/utils'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import { NAVIGATION_ITEMS } from './navigation'

interface MoreMenuSheetProps {
  open: boolean
  onClose: () => void
}

export default function MoreMenuSheet({ open, onClose }: MoreMenuSheetProps) {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const isPro = useHasPlan('pro')
  const extraItems = NAVIGATION_ITEMS.filter(item => !item.mobile && (!item.proOnly || isPro))

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            className="lg:hidden fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:bg-[#17211d]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Mais opções</h2>
              <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 dark:hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-2">
              {extraItems.map(({ to, icon, label }) => (
                <NavLink key={to} to={to} onClick={onClose} className="flex flex-col items-center gap-1.5 rounded-2xl border border-neutral-100 p-3 text-center transition-colors hover:border-sage-200 hover:bg-sage-50/70 dark:border-white/10 dark:hover:bg-sage-950/20">
                  {({ isActive }) => (
                    <>
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', isActive ? 'bg-sage-100 dark:bg-sage-500/20' : 'bg-neutral-50 dark:bg-white/5')}>
                        <UseCogniaIcon name={icon} size={24} />
                      </div>
                      <span className={cn('text-xs', isActive ? 'font-semibold text-sage-700 dark:text-sage-200' : 'text-neutral-600 dark:text-neutral-300')}>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
              {user?.isAdmin && (
                <NavLink to="/admin" onClick={onClose} className="flex flex-col items-center gap-1.5 rounded-2xl border border-neutral-100 p-3 text-center transition-colors hover:border-sage-200 hover:bg-sage-50/70 dark:border-white/10 dark:hover:bg-sage-950/20">
                  {({ isActive }) => (
                    <>
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', isActive ? 'bg-sage-100 dark:bg-sage-500/20' : 'bg-neutral-50 dark:bg-white/5')}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className={cn('text-xs', isActive ? 'font-semibold text-sage-700 dark:text-sage-200' : 'text-neutral-600 dark:text-neutral-300')}>Admin</span>
                    </>
                  )}
                </NavLink>
              )}
            </div>
            <button
              type="button"
              onClick={() => { onClose(); logout() }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-100 p-3 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:border-white/10 dark:hover:bg-rose-950/20"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
