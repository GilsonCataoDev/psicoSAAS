import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, Wallet, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/store/notifications'

const items = [
  { to: '/',              icon: LayoutDashboard, label: 'Início'    },
  { to: '/pacientes',     icon: Users,           label: 'Pacientes' },
  { to: '/agenda',        icon: CalendarDays,    label: 'Agenda'    },
  { to: '/financeiro',    icon: Wallet,          label: 'Financeiro'},
  { to: '/configuracoes', icon: Settings,        label: 'Ajustes'   },
]

export default function BottomNav() {
  const unread = useNotificationStore(s => s.notifications.filter(n => !n.read).length)

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-t border-neutral-100
                    flex items-stretch h-16 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
        >
          {({ isActive }) => (
            <>
              {/* Indicador topo */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-sage-500 rounded-b-full" />
              )}

              <div className={cn(
                'w-9 h-7 flex items-center justify-center rounded-xl transition-all relative',
                isActive ? 'bg-sage-50' : '',
              )}>
                <Icon className={cn(
                  'w-[18px] h-[18px] transition-colors',
                  isActive ? 'text-sage-600' : 'text-neutral-400',
                )} />
                {/* Badge de notificação não lida no item de Ajustes */}
                {to === '/configuracoes' && unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-colors',
                isActive ? 'text-sage-600' : 'text-neutral-400',
              )}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
