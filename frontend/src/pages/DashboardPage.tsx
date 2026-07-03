import { lazy, Suspense, useState } from 'react'
import { Users, CalendarCheck, Wallet, Clock, ArrowRight, Video, MapPin, AlertTriangle, Sparkles, MessageSquareText, Ban, TimerReset, CheckCircle2, ShieldCheck, NotebookPen, AlertCircle, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDateRelative, formatTime } from '@/lib/utils'
import LightweightChart from '@/components/ui/LightweightChart'
import { useAuthStore } from '@/store/auth'
import { useDashboard } from '@/hooks/api/dashboard'
import { useSessions } from '@/hooks/api/sessions'
import ReferralCard from '@/components/features/referral/ReferralCard'
import { OnboardingProfile, useOnboardingStore } from '@/store/onboarding'

const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard'))
const NewSessionModal = lazy(() => import('@/components/features/sessions/NewSessionModal'))

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

const MOODS = ['', '1', '2', '3', '4', '5']
const VIDEO_LINK_RE = /https?:\/\/[^\s)]+/i

type SuggestedAction = {
  id: string
  title: string
  text: string
  href: string
  cta: string
  icon: typeof Users
}

function onboardingSummary(profile: OnboardingProfile) {
  const usage = {
    solo: 'uso individual',
    assistant: 'uso com atendente',
    clinic: 'rotina de clinica',
  }[profile.usageMode]
  const volume = {
    '0_5': '0 a 5 pacientes',
    '6_10': '6 a 10 pacientes',
    more_10: 'mais de 10 pacientes',
    student: 'estudante',
  }[profile.patientVolume]
  return `${usage} · ${volume}`
}

function suggestedActions(profile?: OnboardingProfile, stats?: any): SuggestedAction[] {
  if (!profile) return []

  const actions: SuggestedAction[] = []
  const add = (action: SuggestedAction) => {
    if (!actions.some(item => item.id === action.id)) actions.push(action)
  }

  if ((stats?.activePatients ?? 0) === 0 || profile.patientVolume === 'student' || profile.patientVolume === '0_5') {
    add({
      id: 'patient',
      title: 'Cadastre sua primeira pessoa',
      text: 'Comece com nome e WhatsApp; os detalhes podem entrar depois.',
      href: '/pacientes?new=1',
      cta: 'Adicionar pessoa',
      icon: Users,
    })
  }

  for (const objective of profile.objectives) {
    if (objective === 'reminders') {
      add({
        id: 'whatsapp',
        title: 'Prepare lembretes pelo WhatsApp',
        text: 'Conecte ou configure mensagens para reduzir faltas e esquecimentos.',
        href: '/configuracoes?tab=messages',
        cta: 'Configurar mensagens',
        icon: MessageSquareText,
      })
    }
    if (objective === 'agenda') {
      add({
        id: 'agenda',
        title: 'Monte sua agenda base',
        text: 'Defina horarios de atendimento e veja seus espacos livres.',
        href: '/agenda',
        cta: 'Abrir agenda',
        icon: CalendarCheck,
      })
      add({
        id: 'booking',
        title: 'Ative o link publico',
        text: 'Permita que pacientes escolham horarios disponiveis sem troca de mensagens.',
        href: '/agendamentos?tab=settings',
        cta: 'Configurar link',
        icon: ExternalLink,
      })
    }
    if (objective === 'records') {
      add({
        id: 'records',
        title: 'Organize prontuario e evolucao',
        text: 'Depois da primeira sessao, registre a evolucao em um fluxo simples.',
        href: '/pacientes',
        cta: 'Ver pacientes',
        icon: NotebookPen,
      })
    }
    if (objective === 'financial') {
      add({
        id: 'financial',
        title: 'Configure cobrancas e recebimentos',
        text: 'Acompanhe pendencias e deixe sua chave PIX pronta.',
        href: '/configuracoes?tab=payment',
        cta: 'Ajustar financeiro',
        icon: Wallet,
      })
    }
    if (objective === 'documents') {
      add({
        id: 'documents',
        title: 'Prepare documentos recorrentes',
        text: 'Recibos, declaracoes e arquivos ficam reunidos na area de documentos.',
        href: '/documentos',
        cta: 'Abrir documentos',
        icon: NotebookPen,
      })
    }
  }

  if (profile.usageMode !== 'solo') {
    add({
      id: 'settings',
      title: 'Padronize a rotina da equipe',
      text: 'Comece por agenda, mensagens e preferencias para reduzir retrabalho.',
      href: '/configuracoes',
      cta: 'Abrir configuracoes',
      icon: ShieldCheck,
    })
  }

  return actions.slice(0, 3)
}

export default function DashboardPage() {
  const { data: stats, isLoading: loading } = useDashboard()
  const { data: recentSessions = [] } = useSessions()
  const user = useAuthStore(s => s.user)
  const onboardingCompleted = useOnboardingStore(s => s.completed)
  const onboardingProfile = useOnboardingStore(s => s.profile)
  const firstName = user?.name?.split(' ')[0] ?? 'Psicólogo(a)'
  const [sessionDefaults, setSessionDefaults] = useState<{ patientId: string; date: string; appointmentId: string } | null>(null)


  const today = format(new Date(), 'yyyy-MM-dd')
  const overduePayments = (stats as any)?.pendingPaymentsDetail?.filter(
    (p: any) => p.dueDate && p.dueDate < today
  ) ?? []

  const s = stats ?? {} as any
  const sessionsToday = s?.todayAppointments?.length ?? 0
  const registeredSessions = Number(s?.registeredSessions ?? 0)
  const estimatedSavedMinutes = Math.max(registeredSessions * 30, s?.roi?.estimatedMinutesSaved ?? 0)
  const nextActions = suggestedActions(onboardingProfile, s)

  function openVideoAppointment(appt: any) {
    const link = appt.meetingUrl || String(appt.notes ?? '').match(VIDEO_LINK_RE)?.[0]
    if (!link) return
    window.open(link, '_blank', 'noopener,noreferrer')
  }

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
      {!onboardingCompleted && (
        <Suspense fallback={null}>
          <OnboardingWizard />
        </Suspense>
      )}

      {/* ── Hero: saudação ──────────────────────────────────────────── */}
      <div className="hero-gradient rounded-2xl p-7 text-white shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sage-200 text-xs font-medium uppercase tracking-widest mb-1.5">
              {greeting()}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
              {firstName}
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
          <div className="mt-5 flex items-center gap-3 pt-4 border-t border-white/10">
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

      {/* Alerta de pagamentos em atraso */}
      {overduePayments.length > 0 && (
        <div className="bg-rose-50 border border-rose-200/70 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-sm text-rose-800">
            <strong>{overduePayments.length} pagamento{overduePayments.length !== 1 ? 's' : ''} em atraso</strong> — {formatCurrency(overduePayments.reduce((s: number, p: any) => s + Number(p.amount), 0))} aguardando.{' '}
            <Link to="/financeiro" className="underline underline-offset-2 hover:no-underline font-medium">
              Ver lançamentos →
            </Link>
          </p>
        </div>
      )}

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
      {onboardingCompleted && onboardingProfile && nextActions.length > 0 && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700">
                Proximos passos
              </p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-800">
                Sugestoes para o seu perfil
              </h2>
              <p className="text-xs text-neutral-400">
                {onboardingSummary(onboardingProfile)}
              </p>
            </div>
            <Link to="/configuracoes" className="text-xs font-semibold text-sage-600 hover:text-sage-700">
              Ajustar depois
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {nextActions.map(action => {
              const Icon = action.icon
              return (
                <Link
                  key={action.id}
                  to={action.href}
                  className="rounded-2xl border border-neutral-100 bg-white p-4 transition-colors hover:border-sage-200 hover:bg-sage-50/40"
                >
                  <Icon className="mb-3 h-5 w-5 text-sage-600" />
                  <p className="text-sm font-semibold text-neutral-800">{action.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">{action.text}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sage-700">
                    {action.cta} <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

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
          sub={s?.pendingAmount ? formatCurrency(s.pendingAmount) : 'tudo em dia'}
          icon={<Clock className="w-4 h-4" />}
          accent={(s?.pendingPayments ?? 0) > 0 ? 'amber' : 'sage'}
        />
      </div>

      {(s?.clinicIndicators?.totalAppointments ?? 0) > 0 && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title mb-0">Indicadores da clinica</h2>
              <p className="text-xs text-neutral-400">Resumo operacional do mes atual.</p>
            </div>
            <Link to="/agenda" className="text-xs font-semibold text-sage-600 hover:text-sage-700">
              Ver agenda
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-sage-50 px-4 py-3">
              <CalendarCheck className="mb-2 h-4 w-4 text-sage-700" />
              <p className="text-xl font-semibold text-neutral-800">{s.clinicIndicators.attendanceRate}%</p>
              <p className="text-xs text-neutral-500">comparecimento</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-3">
              <Ban className="mb-2 h-4 w-4 text-amber-700" />
              <p className="text-xl font-semibold text-neutral-800">{s.clinicIndicators.noShowRate}%</p>
              <p className="text-xs text-neutral-500">faltas no mes</p>
            </div>
            <div className="rounded-xl bg-mist-50 px-4 py-3">
              <Video className="mb-2 h-4 w-4 text-mist-700" />
              <p className="text-xl font-semibold text-neutral-800">{s.clinicIndicators.onlineRate}%</p>
              <p className="text-xs text-neutral-500">online</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <Users className="mb-2 h-4 w-4 text-neutral-600" />
              <p className="text-xl font-semibold text-neutral-800">{s.clinicIndicators.avgSessionsPerActivePatient}</p>
              <p className="text-xs text-neutral-500">sessoes por paciente</p>
            </div>
          </div>
          {(s.clinicIndicators.noShows ?? 0) + (s.clinicIndicators.cancelled ?? 0) > 0 && (
            <p className="mt-3 text-xs text-neutral-500">
              {s.clinicIndicators.noShows} falta{s.clinicIndicators.noShows === 1 ? '' : 's'} e {s.clinicIndicators.cancelled} cancelamento{s.clinicIndicators.cancelled === 1 ? '' : 's'} registrados no mes.
            </p>
          )}
        </div>
      )}

      {/* ── Agenda + Receita ─────────────────────────────────────────── */}
      {registeredSessions > 0 && (
        <div className="rounded-2xl border border-sage-100 bg-white p-4 shadow-card dark:border-white/10 dark:bg-cognia-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700 dark:text-sage-300">
                {registeredSessions >= 5 ? 'Status: em crescimento' : 'Primeira prova de valor'}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-800 dark:text-white">
                Seu fluxo clinico ja esta registrado no UseCognia.
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-300">
                Proximo ganho: ativar lembretes automaticos para reduzir faltas.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[620px]">
              <div className="rounded-xl bg-sage-50 px-3 py-3 dark:bg-white/5">
                <CheckCircle2 className="mb-1 h-4 w-4 text-sage-700 dark:text-sage-200" />
                <p className="text-base font-semibold text-neutral-800 dark:text-white">{registeredSessions}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">sessoes registradas</p>
              </div>
              <div className="rounded-xl bg-mist-50 px-3 py-3 dark:bg-white/5">
                <Ban className="mb-1 h-4 w-4 text-mist-700 dark:text-mist-200" />
                <p className="text-base font-semibold text-neutral-800 dark:text-white">{s?.roi?.absencesCount ?? s?.roi?.earlyCancellations ?? 0}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">cancelamentos e faltas</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-3 dark:bg-white/5">
                <TimerReset className="mb-1 h-4 w-4 text-amber-700 dark:text-amber-200" />
                <p className="text-base font-semibold text-neutral-800 dark:text-white">
                  {estimatedSavedMinutes >= 60 ? `${Math.round((estimatedSavedMinutes / 60) * 10) / 10}h` : `${estimatedSavedMinutes}min`}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">tempo economizado</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/5">
                <ShieldCheck className="mb-1 h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                <p className="text-base font-semibold text-neutral-800 dark:text-white">OK</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-300">auditoria ativa</p>
              </div>
            </div>
          </div>

          {registeredSessions >= 5 && (
            <div className="mt-4 grid gap-2 border-t border-neutral-100 pt-4 text-sm text-neutral-600 dark:border-white/10 dark:text-neutral-300 sm:grid-cols-3">
              <span>Ultima semana: {s?.sessionsThisWeek ?? 0} sessoes</span>
              <span>Proxima semana: tendencia de crescimento</span>
              <span>Pacientes em inadimplencia: {s?.pendingPayments ?? 0}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/configuracoes?tab=messages" className="rounded-full bg-sage-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-700">
              Conectar WhatsApp
            </Link>
            <Link to="/documentos" className="rounded-full border border-sage-200 px-3 py-1.5 text-xs font-semibold text-sage-700 hover:bg-sage-50 dark:border-white/10 dark:text-sage-200">
              Gerar recibo
            </Link>
            <Link to="/configuracoes?tab=notify" className="rounded-full border border-sage-200 px-3 py-1.5 text-xs font-semibold text-sage-700 hover:bg-sage-50 dark:border-white/10 dark:text-sage-200">
              Configurar lembretes
            </Link>
          </div>
        </div>
      )}

      {(s?.roi?.remindersSent ?? 0) + (s?.roi?.earlyCancellations ?? 0) > 0 && (
        <div className="grid gap-3 rounded-2xl border border-sage-100 bg-white p-4 shadow-card md:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700">ROI do mes</p>
            <p className="mt-1 text-sm text-neutral-500">Automacoes que viraram economia operacional.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-sage-50 px-4 py-3">
            <MessageSquareText className="h-4 w-4 text-sage-700" />
            <div>
              <p className="text-lg font-semibold text-neutral-800">{s.roi.remindersSent}</p>
              <p className="text-xs text-neutral-500">lembretes enviados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
            <Ban className="h-4 w-4 text-amber-700" />
            <div>
              <p className="text-lg font-semibold text-neutral-800">{s.roi.absencesCount ?? s.roi.earlyCancellations ?? 0}</p>
              <p className="text-xs text-neutral-500">{formatCurrency(s.roi.absencesAmount ?? 0)} em faltas e cancelamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-mist-50 px-4 py-3">
            <TimerReset className="h-4 w-4 text-mist-700" />
            <div>
              <p className="text-lg font-semibold text-neutral-800">{Math.round(((s.roi.estimatedMinutesSaved ?? 0) / 60) * 10) / 10}h</p>
              <p className="text-xs text-neutral-500">tempo estimado salvo</p>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs text-neutral-400 mb-4">Um bom dia para organizar seus registros.</p>
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

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={appt.status} />
                    {appt.modality === 'online' && (appt.meetingUrl || String(appt.notes ?? '').match(VIDEO_LINK_RE)?.[0]) && (
                      <button
                        onClick={() => openVideoAppointment(appt)}
                        title="Entrar na chamada"
                        className="opacity-100 transition-opacity flex items-center gap-1 rounded-xl bg-mist-50 border border-mist-200 px-2 py-1 text-xs font-medium text-mist-700 hover:bg-mist-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <ExternalLink className="w-3 h-3" /> Chamada
                      </button>
                    )}
                    {appt.status !== 'completed' && (
                      <button
                        onClick={() => setSessionDefaults({ patientId: appt.patientId, date: appt.date, appointmentId: appt.id })}
                        title="Registrar sessão"
                        className="opacity-100 transition-opacity flex items-center gap-1 rounded-xl bg-sage-50 border border-sage-200 px-2 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <NotebookPen className="w-3 h-3" /> Registrar
                      </button>
                    )}
                  </div>
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
            <LightweightChart
              data={(s?.revenueChart ?? []).map((item: any) => ({ label: item.mes, value: Number(item.valor) || 0 }))}
              height={110}
              color="#4DA8DA"
              fillOpacity={0.22}
              formatValue={formatCurrency}
            />
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
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">Evolução registrada</p>
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

      {/* Referral — visível para usuários com ao menos 1 paciente ativo */}
      {onboardingCompleted && (s?.activePatients ?? 0) >= 1 && (
        <ReferralCard />
      )}

      {sessionDefaults && (
        <Suspense fallback={null}>
          <NewSessionModal
            open
            onClose={() => setSessionDefaults(null)}
            defaults={sessionDefaults}
          />
        </Suspense>
      )}
    </div>
  )
}
