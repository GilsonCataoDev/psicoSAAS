import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays,
  FileText, Wallet, Settings, LogOut, Heart, Link2,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getInitials, cn } from '@/lib/utils'

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Início'       },
  { to: '/pacientes',     icon: Users,           label: 'Pessoas'      },
  { to: '/agenda',        icon: CalendarDays,    label: 'Agenda'       },
  { to: '/agendamentos',  icon: Link2,           label: 'Link público' },
  { to: '/sessoes',       icon: FileText,        label: 'Sessões'      },
  { to: '/financeiro',    icon: Wallet,          label: 'Financeiro'   },
  { to: '/configuracoes', icon: Settings,        label: 'Ajustes'      },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    // hidden em mobile, flex em lg+
    <aside className="hidden lg:flex w-64 bg-white border-r border-neutral-100 flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-neutral-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sage-500 rounded-xl flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display font-medium text-neutral-800 text-lg">
            Psico<span className="text-sage-500">SaaS</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn('nav-item', isActive && 'active')}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-neutral-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {user ? getInitials(user.name) : 'PS'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-700 truncate">{user?.name ?? 'Psicólogo(a)'}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.crp ? `CRP ${user.crp}` : 'Minha conta'}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
