import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/store/notifications'
import { useAuthStore } from '@/store/auth'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import { getNavigationItems } from './navigation'
import MoreMenuSheet from './MoreMenuSheet'

export default function BottomNav() {
  const unread = useNotificationStore(s => s.notifications.filter(n => !n.read).length)
  const profession = useAuthStore(s => s.user?.profession)
  const items = getNavigationItems(profession).filter(item => item.mobile)
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        id="mobile-navigation"
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-t border-neutral-100
                      dark:border-white/10 dark:bg-[#17211d]/95
                      flex items-stretch h-16 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        {items.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'} className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative">
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-sage-500 rounded-b-full" />}
                <div className={cn('w-9 h-7 flex items-center justify-center rounded-xl transition-all relative', isActive ? 'bg-sage-50 dark:bg-sage-500/20' : '')}>
                  <UseCogniaIcon name={icon} size={24} />
                </div>
                <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-sage-600 dark:text-sage-200' : 'text-neutral-400 dark:text-neutral-300')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
        >
          <div className="w-9 h-7 flex items-center justify-center rounded-xl relative">
            <Menu className="h-6 w-6 text-neutral-500 dark:text-neutral-300" />
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#17211d]" />}
          </div>
          <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-300">Mais</span>
        </button>
      </nav>
      <MoreMenuSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
