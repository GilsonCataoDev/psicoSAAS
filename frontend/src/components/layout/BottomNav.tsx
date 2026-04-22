import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, Stamp, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/',           icon: LayoutDashboard, label: 'Início'    },
  { to: '/pacientes',  icon: Users,           label: 'Pessoas'   },
  { to: '/agenda',     icon: CalendarDays,    label: 'Agenda'    },
  { to: '/documentos', icon: Stamp,           label: 'Docs'      },
  { to: '/financeiro', icon: Wallet,          label: 'Financeiro'},
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-neutral-100
                    flex items-stretch h-16 safe-area-bottom shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
              isActive
                ? 'text-sage-600'
                : 'text-neutral-400 hover:text-neutral-600',
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                'w-8 h-8 flex items-center justify-center rounded-xl transition-all',
                isActive && 'bg-sage-50',
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
