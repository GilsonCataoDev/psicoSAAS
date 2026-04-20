import { Users, CalendarCheck, Wallet, Clock, ArrowRight, Video, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { mockDashboard, mockAppointments, mockSessions } from '@/lib/mock-data'
import { formatCurrency, formatDateRelative, formatTime } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

const revenueData = [
  { mes: 'Out', valor: 3200 },
  { mes: 'Nov', valor: 3800 },
  { mes: 'Dez', valor: 3100 },
  { mes: 'Jan', valor: 4200 },
  { mes: 'Fev', valor: 3900 },
  { mes: 'Mar', valor: 4680 },
]

export default function DashboardPage() {
  const stats = mockDashboard
  const todayAppointments = mockAppointments.filter(
    (a) => a.date === new Date().toISOString().split('T')[0],
  )
  const recentSessions = mockSessions.slice(0, 3)

  return (
    <div className="animate-slide-up space-y-5">
      <div>
        <h1 className="page-title">Seu dia de hoje</h1>
        <p className="page-subtitle">
          {todayAppointments.length === 0
            ? 'Nenhuma sessão agendada para hoje'
            : `${todayAppointments.length} ${todayAppointments.length === 1 ? 'sessão agendada' : 'sessões agendadas'} para hoje`}
        </p>
      </div>

      {/* Stats — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pessoas ativas" value={stats.activePatients}
          icon={<Users className="w-5 h-5" />} accent="sage" trend={{ value: 12, positive: true }} />
        <StatCard label="Sessões este mês" value={stats.sessionsThisMonth}
          icon={<CalendarCheck className="w-5 h-5" />} accent="mist"
          sub={`${stats.sessionsThisWeek} esta semana`} />
        <StatCard label="Receita do mês" value={formatCurrency(stats.monthRevenue)}
          icon={<Wallet className="w-5 h-5" />} accent="sage" trend={{ value: 8, positive: true }} />
        <StatCard label="Pagamentos pendentes" value={stats.pendingPayments}
          sub={formatCurrency(stats.pendingAmount)} icon={<Clock className="w-5 h-5" />}
          accent={stats.pendingPayments > 0 ? 'amber' : 'sage'} />
      </div>

      {/* Middle section — stack mobile, side-by-side desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agenda de hoje */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Agenda de hoje</h2>
            <Link to="/agenda" className="text-sm text-sage-600 hover:text-sage-700 flex items-center gap-1">
              Ver tudo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-400 text-sm">Nenhuma sessão agendada para hoje 🌿</p>
              <Link to="/agenda" className="btn-secondary text-sm mt-3 inline-block">Agendar sessão</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((appt) => (
                <div key={appt.id}
                  className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer">
                  <div className="text-center min-w-10 shrink-0">
                    <p className="text-base font-semibold text-neutral-700 leading-none">{formatTime(appt.time)}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{appt.duration}m</p>
                  </div>
                  <div className="w-px h-8 bg-neutral-200 shrink-0" />
                  <Avatar name={appt.patient!.name} colorClass={appt.patient!.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-700 text-sm truncate">{appt.patient!.name}</p>
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
          <p className="text-2xl font-semibold text-neutral-800 mb-1">{formatCurrency(stats.monthRevenue)}</p>
          <p className="text-xs text-sage-600 mb-4">↑ 8% em relação ao mês anterior</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={revenueData}>
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
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Sessões recentes</h2>
          <Link to="/sessoes" className="text-sm text-sage-600 hover:text-sage-700 flex items-center gap-1">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-neutral-400 text-sm py-4">Nenhuma sessão registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
                <Avatar name={session.patient!.name} colorClass={session.patient!.avatarColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-neutral-700 text-sm truncate">{session.patient!.name}</p>
                    <span className="text-xs text-neutral-400 shrink-0">{formatDateRelative(session.date)}</span>
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
        )}
      </div>
    </div>
  )
}
