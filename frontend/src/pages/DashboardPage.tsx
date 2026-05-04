import { useEffect } from 'react'
import { Users, CalendarCheck, Wallet, Clock, ArrowRight, Video, MapPin, AlertTriangle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateRelative, formatTime } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useAuthStore } from '@/store/auth'
import { track, EVENTS } from '@/lib/analytics'
import { useDashboard, useSessions } from '@/hooks/useApi'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function contextMessage(sessionsToday: number, pendingPayments: number): string {
  if (sessionsToday > 0) {
    return sessionsToday === 1
      ? 'Voce tem 1 consulta hoje. Tudo organizado para um atendimento tranquilo.'
      : `Voce tem ${sessionsToday} consultas hoje. Sua agenda esta sob controle.`
  }
  if (pendingPayments > 0) return 'Sem consultas hoje. Um bom momento para revisar pendencias financeiras.'
  return 'Nenhuma consulta agendada. Use o dia para planejar com clareza.'
}

const MOODS = ['', '😔', '😟', '😐', '🙂', '😊']

export default function DashboardPage() {
  const { data: stats, isLoading: loading } = useDashboard()
  const { data: recentSessions = [] } = useSessions()
  const user = useAuthStore(s => s.user)
  const firstName = user?.name?.split(' ')[0] ?? 'Psicólogo(a)'

  useEffect(() => { track(EVENTS.LOGIN) }, [])

  const s = stats ?? {} as any
  const sessionsToday = s?.todayAppointments?.length ?? 0

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-36 bg-neutral-200 rounded-3xl" />
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

  return (
    <div className="animate-slide-up space-y-5">

      {/* ── Hero: saudação ──────────────────────────────────────────── */}
      <div className="hero-gradient rounded-2xl p-7 text-white relative overflow-hidden shadow-soft">
        {/* Círculos decorativos */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -right-2 w-28 h-28 bg-white/5 rounded-full" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sage-200 text-xs font-medium uppercase tracking-widest mb-1.5">
              {greeting()}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
              {firstName} 👋
            </h1>
            <p className="text-sage-100 text-sm leading-relaxed">
              {contextMessage(sessionsToday, s?.pendingPayments ?? 0)}
            </p>
          </div>

          {/* Data — desktop */}
          <div className="hidden sm:flex flex-col items-end shrink-0 text-right">
            <p className="text-sage-300 text-xs capitalize font-medium">
              {format(new Date(), 'EEEE', { locale: ptBR })}
            </p>
            <p className="text-white text-lg font-semibold leading-tight">
              {format(new Date(), "dd", { locale: ptBR })}
            </p>
            <p className="text-sage-200 text-xs capitalize">
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Indicadores rápidos inline */}
        {sessionsToday > 0 && (
          <div className="relative mt-5 flex items-center gap-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-sage-100">
              <CalendarCheck className="w-3.5 h-3.5 text-sage-300" />
              <span>{sessionsToday} sessão{sessionsToday !== 1 ? 'ões' : ''} hoje</span>
            </div>
            {(s?.pendingPayments ?? 0) > 0 && (
              <>
                <span className="text-white/20">·</span>
                <div className="flex items-center gap-1.5 text-xs text-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>{s.pendingPayments} pagamento{s.pendingPayments !== 1 ? 's' : ''} pendente{s.pendingPayments !== 1 ? 's' : ''}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Alerta de pacientes inativos */}
      {(s?.inactivePatients ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm text-amber-800">
            <strong>{s.inactivePatients} pessoa{s.inactivePatients !== 1 ? 's' : ''}</strong> sem sessão há mais de 30 dias.{' '}
            <Link to="/pacientes" className="underline underline-offset-2 hover:no-underline font-medium">
              Ver quem são →
            </Link>
          </p>
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pacientes ativos"
          value={s?.activePatients ?? 0}
          icon={<Users className="w-4 h-4" />}
          accent="sage"
          sub={s?.activePatients > 0 ? 'em acompanhamento' : 'cadastre o primeiro'}
        />
        <StatCard
          label="Consultas do mes"
          value={s?.sessionsThisMonth ?? 0}
          icon={<CalendarCheck className="w-4 h-4" />}
          accent="mist"
          sub={`${s?.sessionsThisWeek ?? 0} esta semana`}
        />
        <StatCard
          label="Receita mensal"
          value={formatCurrency(s?.monthRevenue ?? 0)}
          icon={<Wallet className="w-4 h-4" />}
          accent="sage"
        />
        <StatCard
          label="Pagamentos pendentes"
          value={s?.pendingPayments ?? 0}
          sub={s?.pendingAmount ? formatCurrency(s.pendingAmount) : 'tudo em dia ✓'}
          icon={<Clock className="w-4 h-4" />}
          accent={(s?.pendingPayments ?? 0) > 0 ? 'amber' : 'sage'}
        />
      </div>

      {/* ── Agenda + Receita ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Agenda de hoje */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title mb-0">Agenda de hoje</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <Link to="/agenda"
              className="flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-700 transition-colors">
              Ver agenda <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {sessionsToday === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-sage-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-sage-400" />
              </div>
              <p className="text-sm font-medium text-neutral-600 mb-1">Nenhuma sessão hoje</p>
              <p className="text-xs text-neutral-400 mb-4">Um bom dia para organizar seus registros. 🌿</p>
              <Link to="/agenda" className="btn-secondary text-xs px-4 py-2">
                Agendar sessão
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {s.todayAppointments.map((appt: any) => (
                <div key={appt.id}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 transition-colors cursor-pointer group">
                  {/* Horário */}
                  <div className="text-center w-10 shrink-0">
                    <p className="text-sm font-bold text-neutral-700 leading-none tabular-nums">
                      {appt.time?.slice(0, 5) ?? formatTime(appt.time)}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{appt.duration ?? 50}m</p>
                  </div>

                  <div className="w-px h-8 bg-neutral-100 shrink-0" />

                  <Avatar name={appt.patient?.name ?? appt.patientName ?? '?'} size="sm"
                    colorClass={appt.patient?.avatarColor} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-700 truncate leading-tight">
                      {appt.patient?.name ?? appt.patientName}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {appt.modality === 'online'
                        ? <Video className="w-3 h-3 text-mist-400" />
                        : <MapPin className="w-3 h-3 text-sage-400" />}
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

        {/* Receita */}
        <div className="card flex flex-col">
          <h2 className="section-title">Receita mensal</h2>
          <p className="text-3xl font-semibold text-neutral-800 leading-none tracking-tight mb-1">
            {formatCurrency(s?.monthRevenue ?? 0)}
          </p>

          {s?.revenueChart && s.revenueChart.length >= 2 && (() => {
            const prev = s.revenueChart[s.revenueChart.length - 2]?.valor ?? 0
            const curr = s.revenueChart[s.revenueChart.length - 1]?.valor ?? 0
            const diff = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0
            return diff !== 0 ? (
              <p className={`text-xs font-medium mb-4 ${diff > 0 ? 'text-sage-600' : 'text-rose-500'}`}>
                {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}% vs. mês anterior
              </p>
            ) : <div className="mb-4" />
          })()}

          <div className="flex-1 min-h-[100px]">
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={s?.revenueChart ?? []} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCogniaBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4DA8DA" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#4DA8DA" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#a8a89e' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), 'Receita']}
                />
                <Area type="monotone" dataKey="valor" stroke="#4DA8DA" strokeWidth={2}
                  fill="url(#colorCogniaBlue)" dot={false} activeDot={{ r: 4, fill: '#4DA8DA' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <Link to="/financeiro"
            className="mt-3 pt-3 border-t border-neutral-50 flex items-center justify-between text-xs text-neutral-400 hover:text-sage-600 transition-colors">
            <span>Ver lançamentos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Sessões recentes ─────────────────────────────────────────── */}
      {recentSessions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Sessões recentes</h2>
            <Link to="/sessoes"
              className="flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-700 transition-colors">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {recentSessions.slice(0, 5).map((session: any) => (
              <div key={session.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group">
                <Avatar
                  name={session.patient?.name ?? '?'}
                  colorClass={session.patient?.avatarColor}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-700 truncate leading-tight">
                      {session.patient?.name ?? '—'}
                    </p>
                    <span className="text-xs text-neutral-400 shrink-0 tabular-nums">
                      {formatDateRelative(session.date)}
                    </span>
                  </div>
                  {session.summary && (
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{session.summary}</p>
                  )}
                </div>
                {session.mood && (
                  <span className="text-base shrink-0 opacity-80">{MOODS[session.mood]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
