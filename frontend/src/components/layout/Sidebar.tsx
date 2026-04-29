import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays,
  FileText, Wallet, Settings, LogOut, Heart, Link2,
  Stamp, Zap,
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
    <aside className="hidden lg:flex w-60 bg-white border-r border-neutral-100 flex-col h-full shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-neutral-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 hero-gradient rounded-xl flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display font-medium text-neutral-800 text-lg tracking-tight">
            Psico<span className="text-sage-500">SaaS</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
          >
            {({ isActive }) => (
              <div className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer select-none',
                isActive
                  ? 'bg-sage-50 text-sage-700'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700',
              )}>
                {/* Indicador lateral ativo */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sage-500 rounded-r-full" />
                )}

                {/* Ícone */}
                <div className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 shrink-0',
                  isActive ? 'bg-sage-100' : 'group-hover:bg-neutral-100',
                )}>
                  <Icon className="w-4 h-4" />
                </div>

                <span className={cn('text-sm', isActive && 'font-semibold')}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Banner trial / plano */}
      <div className="px-3 pb-2">
        {isTrialing && daysLeft !== null && daysLeft <= 14 ? (
          <NavLink
            to="/planos"
            className="block hero-gradient text-white rounded-2xl p-3.5 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3.5 h-3.5" />
              <p className="text-xs font-semibold">Período de teste</p>
            </div>
            <p className="text-xs text-sage-100 mb-2.5">
              {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}.
            </p>
            <div className="bg-white/20 rounded-full h-1">
              <div
                className="bg-white rounded-full h-1 transition-all"
                style={{ width: `${Math.max(5, ((14 - daysLeft) / 14) * 100)}%` }}
              />
            </div>
          </NavLink>
        ) : subscription.status === 'active' && currentPlan ? (
          <NavLink
            to="/planos"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <div className="w-7 h-7 bg-sage-100 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-sage-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-700">Plano {currentPlan.name}</p>
              <p className="text-xs text-neutral-400">Gerenciar assinatura</p>
            </div>
          </NavLink>
        ) : null}
      </div>

      {/* Usuário */}
      <div className="px-3 py-3 border-t border-neutral-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center text-xs font-bold shrink-0">
            {user ? getInitials(user.name) : 'PS'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-700 truncate leading-tight">{user?.name ?? 'Psicólogo(a)'}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.crp ? `CRP ${user.crp}` : 'Minha conta'}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
