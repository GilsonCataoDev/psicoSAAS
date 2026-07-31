import { Fragment, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle, CheckCircle2,
  Users, ShieldAlert, Bell, BellOff, ChevronDown, ChevronUp,
  RefreshCw, Mail, MessageCircle, Loader2, Target, Sparkles,
} from 'lucide-react'
import {
  useChurnDashboard, useChurnAnalytics, useChurnAlerts,
  useResolveChurnAlert, useSendReactivationEmail, ChurnAccount, ChurnRiskLevel,
  useUserTimeline, useChurnAiDiagnosis, useSendChurnWhatsApp,
} from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Risk config ─────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<ChurnRiskLevel, { label: string; color: string; bg: string; dot: string }> = {
  LOW:      { label: 'Baixo',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  MEDIUM:   { label: 'Médio',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500'   },
  HIGH:     { label: 'Alto',     color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   dot: 'bg-orange-500'  },
  CRITICAL: { label: 'Crítico',  color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',       dot: 'bg-rose-500'    },
}

const TIER_BAR: Record<string, string> = {
  green:  'bg-emerald-500',
  yellow: 'bg-amber-400',
  red:    'bg-rose-500',
}

function fmt(d: string | null) {
  if (!d) return '—'
  return format(parseISO(d), "dd/MM/yy", { locale: ptBR })
}

// ─── Timeline drawer ─────────────────────────────────────────────────────────
function TimelineDrawer({ userId, name }: { userId: string; name: string }) {
  const { data: tl, isLoading } = useUserTimeline(userId)

  const steps: Array<{ label: string; date: string | null; done: boolean }> = tl ? [
    { label: 'Cadastro',            date: tl.signupAt,            done: true },
    { label: 'Primeiro acesso',     date: tl.firstLoginAt,        done: !!tl.firstLoginAt },
    { label: 'Primeiro paciente',   date: tl.firstPatientAt,      done: !!tl.firstPatientAt },
    { label: 'Primeiro prontuário', date: tl.firstSessionAt,      done: !!tl.firstSessionAt },
    { label: 'Primeiro agendamento',date: tl.firstAppointmentAt,  done: !!tl.firstAppointmentAt },
    { label: 'Último acesso',       date: tl.lastActiveAt,        done: !!tl.lastActiveAt },
  ] : []

  if (isLoading) return <p className="text-sm text-neutral-400 py-2">Carregando timeline…</p>
  if (!tl) return null

  return (
    <div className="px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-100 text-sm">
      <p className="font-semibold text-neutral-700 mb-3">Timeline — {name}</p>
      <div className="flex items-start gap-0">
        {steps.map((s, i) => (
          <div key={s.label} className="flex-1 flex flex-col items-center gap-1 relative">
            {/* connector line */}
            {i < steps.length - 1 && (
              <div className={cn('absolute top-3 left-1/2 h-0.5 w-full',
                s.done ? 'bg-sage-300' : 'bg-neutral-200')} />
            )}
            <div className={cn('relative z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center',
              s.done ? 'border-sage-500 bg-sage-100' : 'border-neutral-300 bg-white')}>
              {s.done
                ? <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                : <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />}
            </div>
            <p className={cn('text-center text-xs leading-tight', s.done ? 'text-neutral-700' : 'text-neutral-400')}>
              {s.label}
            </p>
            <p className="text-xs text-neutral-400">{fmt(s.date)}</p>
          </div>
        ))}
      </div>
      {tl.daysSinceLastActive !== null && tl.daysSinceLastActive > 0 && (
        <p className="mt-3 text-xs text-amber-700 font-medium">
          ⚠️ Sem acesso há {tl.daysSinceLastActive} dias
        </p>
      )}
    </div>
  )
}

// ─── Account row ─────────────────────────────────────────────────────────────
function AccountRow({ account }: { account: ChurnAccount }) {
  const [expanded, setExpanded] = useState(false)
  const risk = RISK_CONFIG[account.riskLevel]
  const sendEmail = useSendReactivationEmail()
  const aiDiagnose = useChurnAiDiagnosis()
  const sendWhatsApp = useSendChurnWhatsApp()

  function handleAiDiagnose(e: React.MouseEvent) {
    e.stopPropagation()
    aiDiagnose.mutate(account.id, {
      onError: () => toast.error('Não foi possível gerar o diagnóstico por IA'),
    })
  }

  function handleSendDiagnosisWhatsApp(e: React.MouseEvent) {
    e.stopPropagation()
    if (!account.hasPhone || !aiDiagnose.data) return
    if (!window.confirm(`Enviar esta mensagem por WhatsApp para ${account.name}?`)) return
    sendWhatsApp.mutate({ userId: account.id, message: aiDiagnose.data.explanation }, {
      onSuccess: (result) => {
        if (result.sent) toast.success(`WhatsApp enviado para ${account.name}`)
        else toast.error(result.error ?? 'Não foi possível enviar o WhatsApp')
      },
      onError: () => toast.error('Não foi possível enviar o WhatsApp'),
    })
  }

  function handleEmail(e: React.MouseEvent) {
    e.stopPropagation()
    sendEmail.mutate(account.id, {
      onSuccess: () => toast.success(`E-mail de reativação enviado para ${account.name}`),
      onError: () => toast.error('Falha ao enviar e-mail'),
    })
  }

  function handleSendReactivationWhatsApp(e: React.MouseEvent) {
    e.stopPropagation()
    if (!account.hasPhone) return
    if (!window.confirm(`Enviar mensagem de reativação por WhatsApp para ${account.name}?`)) return
    sendWhatsApp.mutate({ userId: account.id, message: whatsappMsg }, {
      onSuccess: (result) => {
        if (result.sent) toast.success(`WhatsApp enviado para ${account.name}`)
        else toast.error(result.error ?? 'Não foi possível enviar o WhatsApp')
      },
      onError: () => toast.error('Não foi possível enviar o WhatsApp'),
    })
  }

  const whatsappMsg =
    `Olá ${account.name}! Aqui é a equipe do UseCognia. Percebemos que faz um tempo que você não acessa a plataforma. Podemos te ajudar com algo? 😊`

  return (
    <Fragment>
      <tr
        className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full shrink-0', risk.dot)} />
            <div className="min-w-0">
              <p className="font-medium text-neutral-800 truncate max-w-[180px]">{account.name}</p>
              <p className="text-xs text-neutral-400 truncate max-w-[180px]">{account.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-medium capitalize text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
            {account.plan ?? 'free'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', TIER_BAR[account.tier])}
                style={{ width: `${account.score}%` }}
              />
            </div>
            <span className="tabular-nums text-sm font-semibold text-neutral-700">{account.score}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', risk.bg, risk.color)}>
            {risk.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-neutral-500">{fmt(account.lastActiveAt)}</td>
        <td className="px-4 py-3 text-sm tabular-nums text-neutral-600">
          {account.daysSinceLastActive !== null ? `${account.daysSinceLastActive}d` : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-neutral-500">
          {account.reasons[0] ?? '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              title="Enviar e-mail de reativação"
              onClick={handleEmail}
              disabled={sendEmail.isPending}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-sage-300 hover:text-sage-700 disabled:opacity-40 transition-colors"
            >
              {sendEmail.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Mail className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleSendReactivationWhatsApp}
              disabled={!account.hasPhone || sendWhatsApp.isPending}
              title={account.hasPhone ? 'Enviar WhatsApp' : 'Conta sem telefone cadastrado'}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 transition-colors"
            >
              {sendWhatsApp.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <MessageCircle className="h-3.5 w-3.5" />}
            </button>
            {expanded ? <ChevronUp className="h-4 w-4 text-neutral-400 ml-1" /> : <ChevronDown className="h-4 w-4 text-neutral-400 ml-1" />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-neutral-50/70">
          <td colSpan={8} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* Score breakdown */}
              <div className="rounded-xl border border-neutral-100 bg-white p-4 text-sm space-y-2">
                <p className="font-semibold text-neutral-700">Score breakdown</p>
                {Object.entries(account.scoreBreakdown).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize text-neutral-500">{k}</span>
                    <span className={cn('font-medium', v < 0 ? 'text-rose-600' : 'text-neutral-800')}>{v > 0 ? `+${v}` : v}</span>
                  </div>
                ))}
                <div className="pt-1 border-t flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{account.score}/100</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-neutral-100 bg-white p-4 text-sm space-y-2">
                <p className="font-semibold text-neutral-700">Recomendações</p>
                {account.recommendations.length === 0
                  ? <p className="text-neutral-400">Nenhuma ação urgente.</p>
                  : account.recommendations.map(r => (
                    <div key={r.action} className="flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0',
                        r.impact === 'high' ? 'bg-rose-500' : r.impact === 'medium' ? 'bg-amber-400' : 'bg-neutral-300')} />
                      <span className="text-neutral-700">{r.label}</span>
                      <span className={cn('ml-auto text-xs', r.impact === 'high' ? 'text-rose-600' : 'text-neutral-400')}>
                        {r.impact === 'high' ? 'Alta' : r.impact === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-neutral-100 bg-white p-4 text-sm" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sage-600" /> Diagnóstico com IA
                </p>
                <div className="flex items-center gap-1.5">
                  {aiDiagnose.data && (
                    <button
                      type="button"
                      onClick={handleSendDiagnosisWhatsApp}
                      disabled={!account.hasPhone || sendWhatsApp.isPending}
                      title={account.hasPhone ? 'Enviar por WhatsApp' : 'Conta sem telefone cadastrado'}
                      className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1"
                    >
                      {sendWhatsApp.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <MessageCircle className="h-3.5 w-3.5" />}
                      Enviar por WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAiDiagnose}
                    disabled={aiDiagnose.isPending}
                    className="btn-secondary text-xs px-2.5 py-1"
                  >
                    {aiDiagnose.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : aiDiagnose.data ? 'Gerar de novo' : 'Gerar'}
                  </button>
                </div>
              </div>
              {aiDiagnose.data && (
                <p className="mt-2 text-neutral-600 leading-relaxed">{aiDiagnose.data.explanation}</p>
              )}
            </div>

            <div className="mt-3">
              <TimelineDrawer userId={account.id} name={account.name} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

// ─── Alerts panel ─────────────────────────────────────────────────────────────
function AlertsPanel() {
  const { data: alerts = [], isLoading } = useChurnAlerts(false)
  const resolve = useResolveChurnAlert()

  if (isLoading) return <p className="text-sm text-neutral-400">Carregando alertas…</p>
  if (!alerts.length) return (
    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      Nenhum alerta pendente.
    </div>
  )

  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-900">{a.message}</p>
            <p className="text-xs text-amber-600 mt-0.5">{fmt(a.createdAt)} · {a.type}</p>
          </div>
          <button
            type="button"
            onClick={() => resolve.mutate(a.id)}
            disabled={resolve.isPending}
            className="shrink-0 text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            Resolver
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChurnPage() {
  const [riskFilter, setRiskFilter] = useState<ChurnRiskLevel | undefined>()
  const [planFilter, setPlanFilter] = useState<string>('')
  const [showAlerts, setShowAlerts] = useState(false)
  const [search, setSearch] = useState('')

  const { data: dashboard, isLoading, dataUpdatedAt, refetch, isFetching } = useChurnDashboard({
    riskLevel: riskFilter,
    plan: planFilter || undefined,
  })
  const { data: analytics } = useChurnAnalytics()

  const accounts = (dashboard?.accounts ?? []).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  )

  const summaryCards = [
    { label: 'Total',            value: dashboard?.summary.total ?? 0,           icon: Users,        color: 'text-neutral-600', filter: undefined },
    { label: 'Saudáveis',        value: dashboard?.summary.healthy ?? 0,          icon: CheckCircle2, color: 'text-emerald-600', filter: 'LOW' as ChurnRiskLevel },
    { label: 'Em risco',         value: dashboard?.summary.atRisk ?? 0,           icon: AlertTriangle,color: 'text-amber-600',   filter: 'MEDIUM' as ChurnRiskLevel },
    { label: 'Críticos',         value: dashboard?.summary.critical ?? 0,         icon: ShieldAlert,  color: 'text-rose-600',    filter: 'CRITICAL' as ChurnRiskLevel },
    { label: 'Taxa ativação',    value: `${dashboard?.summary.activationRate ?? 0}%`, icon: Target,   color: 'text-sage-600',    filter: undefined },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Churn Prevention</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Health scores e risco de cancelamento
            {dataUpdatedAt ? ` · atualizado ${format(new Date(dataUpdatedAt), "HH:mm")}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAlerts(s => !s)}
            className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              showAlerts ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50')}
          >
            {showAlerts ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            Alertas {dashboard?.summary.pendingAlerts ? `(${dashboard.summary.pendingAlerts})` : ''}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alerts panel */}
      {showAlerts && (
        <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" /> Alertas ativos
          </h2>
          <AlertsPanel />
        </section>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map(card => (
          <button
            key={card.label}
            type="button"
            onClick={() => card.filter !== undefined && setRiskFilter(f => f === card.filter ? undefined : card.filter)}
            className={cn(
              'rounded-2xl border bg-white p-4 shadow-sm text-left transition-colors',
              card.filter && riskFilter === card.filter
                ? 'border-sage-300 ring-1 ring-sage-200'
                : 'border-neutral-100 hover:border-neutral-200',
            )}
          >
            <card.icon className={cn('h-5 w-5 mb-2', card.color)} />
            <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Analytics row */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-100 bg-white p-4 text-sm">
            <p className="text-xs text-neutral-400 uppercase font-semibold mb-1">Ativação 7d</p>
            <p className="text-2xl font-bold text-neutral-900">{analytics.activation7d}</p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-white p-4 text-sm">
            <p className="text-xs text-neutral-400 uppercase font-semibold mb-1">Ativação 30d</p>
            <p className="text-2xl font-bold text-neutral-900">{analytics.activation30d}</p>
          </div>
          {(Object.entries(analytics.riskDistribution) as Array<[ChurnRiskLevel, number]>).map(([level, count]) => (
            <div key={level} className="rounded-xl border border-neutral-100 bg-white p-4 text-sm">
              <p className="text-xs text-neutral-400 uppercase font-semibold mb-1">{RISK_CONFIG[level].label}</p>
              <p className={cn('text-2xl font-bold', RISK_CONFIG[level].color)}>{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-full max-w-xs text-sm"
        />
        <select
          value={riskFilter ?? ''}
          onChange={e => setRiskFilter((e.target.value as ChurnRiskLevel) || undefined)}
          className="input-field text-sm w-auto"
        >
          <option value="">Todos os riscos</option>
          {(Object.keys(RISK_CONFIG) as ChurnRiskLevel[]).map(r => (
            <option key={r} value={r}>{RISK_CONFIG[r].label}</option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="input-field text-sm w-auto"
        >
          <option value="">Todos os planos</option>
          <option value="free">Gratuito</option>
          <option value="pro">Pro</option>
        </select>
        {(riskFilter || planFilter || search) && (
          <button
            type="button"
            onClick={() => { setRiskFilter(undefined); setPlanFilter(''); setSearch('') }}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <section className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                {['Nome', 'Plano', 'Score', 'Risco', 'Último acesso', 'Dias sem acesso', 'Motivo principal', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-400">Calculando scores…</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-400">Nenhuma conta encontrada.</td></tr>
              ) : (
                accounts.map(a => <AccountRow key={a.id} account={a} />)
              )}
            </tbody>
          </table>
        </div>
        {accounts.length > 0 && (
          <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-400">
            {accounts.length} conta{accounts.length !== 1 ? 's' : ''} · ordenadas por maior risco
          </div>
        )}
      </section>
    </div>
  )
}
