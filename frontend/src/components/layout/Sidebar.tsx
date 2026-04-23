import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays,
  FileText, Wallet, Settings, LogOut, Heart, Link2,
  ClipboardList, Stamp, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore, PLANS } from '@/store/subscription'
import { getInitials, cn } from '@/lib/utils'

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Início'       },
  { to: '/pacientes',     icon: Users,           label: 'Pessoas'      },
  { to: '/agenda',        icon: CalendarDays,    label: 'Agenda'       },
  { to: '/agendamentos',  icon: Link2,           label: 'Link público' },
  { to: '/sessoes',       icon: FileText,        label: 'Sessões'      },
  { to: '/documentos',    icon: Stamp,           label: 'Documentos'   },
  { to: '/financeiro',    icon: Wallet,          label: 'Financeiro'   },
  { to: '/configuracoes', icon: Settings,        label: 'Ajustes'      },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { subscription } = useSubscriptionStore()

  const currentPlan = PLANS.find(p => p.id === subscription.planId)
  const isTrialing = subscription.status === 'trialing'
  const daysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  return (
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

      {/* Banner de plano / trial */}
      <div className="px-3 pb-2">
        {isTrialing && daysLeft !== null && daysLeft <= 14 ? (
          <NavLink
            to="/planos"
            className="block bg-gradient-to-br from-sage-500 to-sage-600 text-white rounded-2xl p-3 hover:from-sage-600 hover:to-sage-700 transition-all"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4" />
              <p className="text-xs font-semibold">Período de teste</p>
            </div>
            <p className="text-xs text-sage-100">
              {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}. Assine para continuar.
            </p>
            <div className="mt-2 bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white rounded-full h-1.5 transition-all"
                style={{ width: `${Math.max(5, ((14 - daysLeft) / 14) * 100)}%` }}
              />
            </div>
          </NavLink>
        ) : subscription.status === 'active' && currentPlan ? (
          <NavLink
            to="/planos"
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <div className="w-6 h-6 bg-sage-100 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-sage-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-600">Plano {currentPlan.name}</p>
              <p className="text-xs text-neutral-400">Ver detalhes</p>
            </div>
          </NavLink>
        ) : null}
      </div>

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
