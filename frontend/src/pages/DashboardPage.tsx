import { useEffect } from 'react'
import { Users, CalendarCheck, Wallet, Clock, ArrowRight, Video, MapPin, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateRelative, formatTime } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { useOnboardingStore } from '@/store/onboarding'
import { track, EVENTS } from '@/lib/analytics'
import { useDashboard, useSessions } from '@/hooks/useApi'

export default function DashboardPage() {
  const { data: stats, isLoading: loading } = useDashboard()
  const { data: recentSessions = [] } = useSessions()
  const { completed: onboardingDone } = useOnboardingStore()

  useEffect(() => { track(EVENTS.LOGIN) }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 bg-neutral-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-neutral-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-56 bg-neutral-100 rounded-2xl" />
          <div className="h-56 bg-neutral-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  const s = stats ?? {} as any

  return (
    <div className="animate-slide-up space-y-5">
      <div>
        <h1 className="page-title">Seu dia de hoje</h1>
        <p className="page-subtitle">
          {(s?.todayAppointments?.length ?? 0) === 0
            ? 'Nenhuma sessão agendada para hoje'
            : `${s.todayAppointments.length} ${s.todayAppointments.length === 1 ? 'sessão' : 'sessões'} hoje`}
        </p>
      </div>

      {/* Onboarding wizard */}
      {!onboardingDone && <OnboardingWizard />}

      {/* Alerta de pacientes inativos */}
      {(s?.inactivePatients ?? 0) > 0 && onboardingDone && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{s.inactivePatients} pessoa{s.inactivePatients !== 1 ? 's' : ''}</strong> sem
            sessão há mais de 30 dias.{' '}
            <Link to="/pacientes" className="underline hover:no-underline">Ver quem são →</Link>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pessoas ativas" value={s?.activePatients ?? 0}
          icon={<Users className="w-5 h-5" />} accent="sage" />
        <StatCard label="Sessões este mês" value={s?.sessionsThisMonth ?? 0}
          icon={<CalendarCheck className="w-5 h-5" />} accent="mist"
          sub={`${s?.sessionsThisWeek ?? 0} esta semana`} />
        <StatCard label="Receita do mês" value={formatCurrency(s?.monthRevenue ?? 0)}
          icon={<Wallet className="w-5 h-5" />} accent="sage" />
        <StatCard label="Pendentes" value={s?.pendingPayments ?? 0}
          sub={s?.pendingAmount ? formatCurrency(s.pendingAmount) : undefined}
          icon={<Clock className="w-5 h-5" />}
          accent={(s?.pendingPayments ?? 0) > 0 ? 'amber' : 'sage'} />
      </div>

      {/* Middle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agenda de hoje */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Agenda de hoje</h2>
            <Link to="/agenda" className="text-sm text-sage-600 hover:text-sage-700 flex items-center gap-1">
              Ver tudo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(s?.todayAppointments?.length ?? 0) === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-400 text-sm">Nenhuma sessão para hoje 🌿</p>
              <Link to="/agenda" className="btn-secondary text-sm mt-3 inline-block">Agendar sessão</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {s.todayAppointments.map((appt: any) => (
                <div key={appt.id}
                  className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer">
                  <div className="text-center min-w-10 shrink-0">
                    <p className="text-base font-semibold text-neutral-700 leading-none">
                      {appt.time?.slice(0, 5) ?? formatTime(appt.time)}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{appt.duration ?? 50}m</p>
                  </div>
                  <div className="w-px h-8 bg-neutral-200 shrink-0" />
                  <Avatar name={appt.patient?.name ?? appt.patientName ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-700 text-sm truncate">
                      {appt.patient?.name ?? appt.patientName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {appt.modality === 'online'
                        ? <Video className="w-3 h-3 text-mist-500" />
                        : <MapPin className="w-3 h-3 text-sage-500" />}
                      <span className="text-xs text-neutral-400">
                        {appt.modality === 'online' ? 'Online' : 'Presencial'}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico de receita */}
        <div className="card">
          <h2 className="section-title">Receita mensal</h2>
          <p className="text-2xl font-semibold text-neutral-800 mb-1">
            {formatCurrency(s?.monthRevenue ?? 0)}
          </p>
          {s?.revenueChart && s.revenueChart.length >= 2 && (() => {
            const prev = s.revenueChart[s.revenueChart.length - 2]?.valor ?? 0
            const curr = s.revenueChart[s.revenueChart.length - 1]?.valor ?? 0
            const diff = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0
            return diff !== 0 ? (
              <p className={`text-xs mb-4 ${diff > 0 ? 'text-sage-600' : 'text-rose-500'}`}>
                {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}% em relação ao mês anterior
              </p>
            ) : null
          })()}
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={s?.revenueChart ?? []}>
              <defs>
                <linearGradient id="colorSage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3f8866" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3f8866" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#78786e' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Receita']}
              />
              <Area type="monotone" dataKey="valor" stroke="#3f8866" strokeWidth={2} fill="url(#colorSage)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sessões recentes */}
      {recentSessions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Sessões recentes</h2>
            <Link to="/sessoes" className="text-sm text-sage-600 hover:text-sage-700 flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentSessions.slice(0, 5).map((session: any) => (
              <div key={session.id} className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
                <Avatar name={session.patient?.name ?? session.patientName ?? '?'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-neutral-700 text-sm truncate">
                      {session.patient?.name ?? session.patientName}
                    </p>
                    <span className="text-xs text-neutral-400 shrink-0">
                      {formatDateRelative(session.date)}
                    </span>
                  </div>
                  {session.summary && (
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{session.summary}</p>
                  )}
                </div>
                {session.mood && (
                  <span className="text-base shrink-0">{['','😔','😟','😐','🙂','😊'][session.mood]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
