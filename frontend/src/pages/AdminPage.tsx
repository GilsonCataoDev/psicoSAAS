import { Fragment, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Database,
  Eye,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Webhook,
  X,
} from 'lucide-react'
import { useAdminStats, useAdminUsers, useAdminOverrideSubscription, useAdminMonitor, useAdminHealthScores, useCleanupTestUsers, useImpersonateUser, AdminUser, HealthScore } from '@/hooks/useApi'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { api } from '@/lib/api'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  past_due: 'Em atraso',
  canceled: 'Cancelado',
  pending: 'Pendente',
  none: '—',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-neutral-100 text-neutral-500',
  pending: 'bg-orange-100 text-orange-700',
  none: 'bg-neutral-100 text-neutral-400',
}

function formatShortDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function relativeDate(value?: string | null) {
  if (!value) return 'Nunca'
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `${days}d atrás`
}

function OverrideModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [status, setStatus] = useState(user.subscription?.status ?? '')
  const [plan, setPlan] = useState(user.subscription?.plan ?? '')
  const override = useAdminOverrideSubscription()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    override.mutate(
      { userId: user.id, status: status || undefined, plan: plan || undefined },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-sm font-semibold text-neutral-800">
          Override — {user.name}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-sage-400 focus:outline-none"
            >
              <option value="">— sem alteração —</option>
              {['active', 'trialing', 'past_due', 'canceled', 'pending'].map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Plano</label>
            <select
              value={plan}
              onChange={e => setPlan(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-sage-400 focus:outline-none"
            >
              <option value="">— sem alteração —</option>
              {['free', 'essencial', 'pro'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={override.isPending}
              className="flex-1 rounded-xl bg-sage-600 py-2 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-50"
            >
              {override.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsersTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const { data: users, isLoading } = useAdminUsers({ page, search: search.trim() || undefined, plan: plan || undefined, status: status || undefined })
  const impersonate = useImpersonateUser()
  const setAuth = useAuthStore(s => s.setAuth)
  const setCsrfToken = useAuthStore(s => s.setCsrfToken)
  const setSubscription = useSubscriptionStore(s => s.setSubscription)
  const invalidateSubscription = useSubscriptionStore(s => s.invalidateSubscription)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const totalPages = users ? Math.max(1, Math.ceil(users.total / users.limit)) : 1
  const hasFilters = !!search.trim() || !!plan || !!status

  function resetFilters() {
    setSearch('')
    setPlan('')
    setStatus('')
    setPage(1)
  }

  async function copyEmail(email: string) {
    await navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    window.setTimeout(() => setCopiedEmail(null), 1600)
  }

  async function viewAs(user: AdminUser) {
    try {
      await queryClient.cancelQueries()
      queryClient.clear()
      invalidateSubscription()
      const result = await impersonate.mutateAsync(user.id)
      setAuth(result.user)
      setCsrfToken(result.csrfToken)
      const { data: subscription } = await api.get('/billing/me')
      setSubscription(
        subscription?.status
          ? subscription
          : { plan: 'free', planId: 'free', status: 'none' },
      )
      toast.success(`Visualizando como ${user.name}`)
      navigate('/dashboard', { replace: true })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível visualizar como este usuário.')
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome, e-mail ou CRP"
              className="h-10 w-full rounded-xl border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-sage-400"
            />
          </label>
          <select
            value={plan}
            onChange={e => { setPlan(e.target.value); setPage(1) }}
            className="h-10 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600 outline-none focus:border-sage-400"
          >
            <option value="">Todos os planos</option>
            <option value="free">Free</option>
            <option value="essencial">Essencial</option>
            <option value="pro">Pro</option>
          </select>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="h-10 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600 outline-none focus:border-sage-400"
          >
            <option value="">Todos os status</option>
            {['active', 'trialing', 'past_due', 'canceled', 'pending', 'none'].map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-sm">
        <table className="min-w-[920px] w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Renovação</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3">Verificação</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {isLoading && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs text-neutral-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && users?.data.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-xs text-neutral-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {users?.data.map(u => (
              <tr key={u.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-800">{u.name}</p>
                  <p className="text-[11px] text-neutral-400">CRP {u.crp || '—'}</p>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  <button
                    type="button"
                    onClick={() => copyEmail(u.email)}
                    className="group inline-flex max-w-[220px] items-center gap-1.5 text-left hover:text-sage-700"
                    title="Copiar e-mail"
                  >
                    <span className="truncate">{u.email}</span>
                    {copiedEmail === u.email
                      ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      : <Copy className="h-3.5 w-3.5 shrink-0 text-neutral-300 group-hover:text-sage-500" />}
                  </button>
                </td>
                <td className="px-4 py-3 capitalize text-neutral-600">{u.subscription?.plan ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[u.subscription?.status ?? 'none']}`}>
                    {STATUS_LABEL[u.subscription?.status ?? 'none']}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  {u.subscription?.trialEndsAt
                    ? `Trial ${formatShortDate(u.subscription.trialEndsAt)}`
                    : formatShortDate(u.subscription?.currentPeriodEnd)}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">{relativeDate(u.lastActiveAt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    u.emailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {u.emailVerified ? 'Verificado' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => viewAs(u)}
                      disabled={impersonate.isPending}
                      title="Ver como este usuário"
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700 disabled:opacity-40"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver como
                    </button>
                    <button
                      onClick={() => setSelected(u)}
                      className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700"
                    >
                      Override
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex min-w-[920px] items-center justify-between border-t border-neutral-100 px-4 py-3">
            <span className="text-xs text-neutral-400">
              Página {page} de {totalPages} · {users?.total ?? 0} resultado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-neutral-200 px-3 py-1 text-xs disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-neutral-200 px-3 py-1 text-xs disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <OverrideModal user={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

function MonitorTab() {
  const { data: monitor, isLoading } = useAdminMonitor()

  if (isLoading) {
    return <p className="py-10 text-center text-xs text-neutral-400">Carregando…</p>
  }

  if (!monitor) return null

  const { email, billing } = monitor
  const { database, integrations } = monitor.system
  const emailTotal = email.last7d.sent + email.last7d.failed

  const billingOrder = ['active', 'trialing', 'past_due', 'canceled', 'pending', 'none']
  const billingEntries = billingOrder
    .filter(s => billing.byStatus[s] !== undefined)
    .map(s => ({ status: s, count: billing.byStatus[s] }))

  return (
    <div className="space-y-6">
      {/* System health */}
      <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sage-600" />
            <h2 className="text-sm font-semibold text-neutral-800">Operação</h2>
          </div>
          <time className="text-[11px] text-neutral-400">
            Atualizado em {new Date(monitor.generatedAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <HealthItem
            icon={Database}
            label="Banco"
            ok={database.ok}
            detail={database.ok ? `${database.latencyMs}ms` : 'Falha'}
          />
          <HealthItem
            icon={Mail}
            label="Resend"
            ok={integrations.resend.configured}
            detail={integrations.resend.configured ? 'Configurado' : 'Pendente'}
          />
          <HealthItem
            icon={CreditCard}
            label="Asaas"
            ok={integrations.asaas.configured && integrations.asaas.webhookProtected}
            detail={integrations.asaas.webhookProtected ? 'Webhook protegido' : 'Verificar token'}
          />
          <HealthItem
            icon={MessageCircle}
            label="WhatsApp"
            ok={integrations.whatsapp.configured && integrations.whatsapp.operational !== false}
            detail={!integrations.whatsapp.configured
              ? 'Não configurado'
              : integrations.whatsapp.operational === false
                ? `Falhando · ${integrations.whatsapp.last24h.failed} erro(s) em 24h`
                : integrations.whatsapp.operational === true
                  ? `${integrations.whatsapp.last24h.sent} envio(s) OK em 24h`
                  : 'Configurado · sem envios em 24h'}
          />
          <HealthItem
            icon={Bell}
            label="Push"
            ok={integrations.webPush.configured}
            detail={integrations.webPush.configured ? 'Configurado' : 'Pendente'}
          />
        </div>
      </section>

      {/* Email health */}
      <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-sage-600" />
          <h2 className="text-sm font-semibold text-neutral-800">E-mail — últimos 7 dias</h2>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-neutral-50 p-3 text-center">
            <p className="text-xl font-bold text-neutral-800">{email.last7d.sent}</p>
            <p className="text-xs text-neutral-400">Enviados</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 text-center">
            <p className={`text-xl font-bold ${email.last7d.failed > 0 ? 'text-red-600' : 'text-neutral-800'}`}>
              {email.last7d.failed}
            </p>
            <p className="text-xs text-neutral-400">Falhas</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 text-center">
            <p className={`text-xl font-bold ${email.failureRate > 10 ? 'text-red-600' : email.failureRate > 0 ? 'text-yellow-600' : 'text-neutral-800'}`}>
              {emailTotal > 0 ? `${email.failureRate}%` : '—'}
            </p>
            <p className="text-xs text-neutral-400">Taxa de falha</p>
          </div>
        </div>

        {email.recentFailures.length > 0 ? (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Falhas recentes
            </p>
            <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
              {email.recentFailures.map(f => (
                <div key={f.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-neutral-700">{f.to}</p>
                      <p className="truncate text-xs text-neutral-400">{f.subject}</p>
                      {f.error && (
                        <p className="mt-0.5 truncate text-[11px] text-red-500">{f.error}</p>
                      )}
                    </div>
                    <time className="shrink-0 text-[11px] text-neutral-400">
                      {new Date(f.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-emerald-600">Nenhuma falha nos últimos 7 dias.</p>
        )}
      </section>

      {/* Billing health */}
      <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-sage-600" />
          <h2 className="text-sm font-semibold text-neutral-800">Billing — assinaturas</h2>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {billingEntries.map(({ status, count }) => (
            <span
              key={status}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[status] ?? 'bg-neutral-100 text-neutral-500'}`}
            >
              {STATUS_LABEL[status] ?? status}
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold">{count}</span>
            </span>
          ))}
          {billingEntries.length === 0 && (
            <p className="text-xs text-neutral-400">Nenhuma assinatura registrada.</p>
          )}
        </div>

        {billing.pastDueAccounts.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-yellow-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Em atraso (últimos 30 dias)
            </p>
            <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
              {billing.pastDueAccounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-700">{acc.user.name}</p>
                    <p className="truncate text-xs text-neutral-400">{acc.user.email}</p>
                  </div>
                  <span className="shrink-0 text-xs capitalize text-neutral-500">{acc.plan}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent webhooks */}
        {billing.recentWebhooks.length > 0 && (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              <Webhook className="h-3.5 w-3.5" />
              Webhooks recentes
            </p>
            <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
              {billing.recentWebhooks.map(wh => (
                <div key={wh.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-700">{wh.eventType}</p>
                    <p className="truncate text-[11px] text-neutral-400">{wh.eventId}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-neutral-400">
                    {new Date(wh.processedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function HealthItem({
  icon: Icon,
  label,
  ok,
  detail,
}: {
  icon: typeof Activity
  label: string
  ok: boolean
  detail: string
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Icon className={`h-4 w-4 ${ok ? 'text-emerald-600' : 'text-yellow-600'}`} />
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          ok ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {ok ? 'OK' : 'Atenção'}
        </span>
      </div>
      <p className="text-xs font-semibold text-neutral-700">{label}</p>
      <p className="mt-0.5 text-[11px] text-neutral-400">{detail}</p>
    </div>
  )
}

const TIER_LABEL: Record<HealthScore['tier'], string> = {
  healthy: 'Saudável',
  attention: 'Atenção',
  risk: 'Risco',
}

const TIER_COLOR: Record<HealthScore['tier'], string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  attention: 'bg-yellow-100 text-yellow-700',
  risk: 'bg-rose-100 text-rose-700',
}

function ScoreBar({ score, tier }: { score: number; tier: HealthScore['tier'] }) {
  const fill = tier === 'healthy' ? 'bg-emerald-500' : tier === 'attention' ? 'bg-yellow-400' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-neutral-800 tabular-nums">{score}</span>
    </div>
  )
}

function computeFactors(u: HealthScore) {
  const daysSince = u.lastActiveAt
    ? Math.floor((Date.now() - new Date(u.lastActiveAt).getTime()) / 86_400_000)
    : 9999
  const recencyPts = daysSince <= 7 ? 40 : daysSince <= 14 ? 28 : daysSince <= 30 ? 15 : daysSince <= 60 ? 5 : 0
  const patientPts = u.patientCount >= 5 ? 15 : u.patientCount >= 3 ? 10 : u.patientCount >= 1 ? 5 : 0
  const sessionPts = u.sessionsLast30d >= 10 ? 25 : u.sessionsLast30d >= 4 ? 17 : u.sessionsLast30d >= 1 ? 8 : 0
  const financialPts = u.hasFinancialLast30d ? 10 : 0
  const aiPts = u.plan === 'pro' && u.hasAiUsageLast30d ? 10 : 0
  return [
    { label: 'Recência de login', pts: recencyPts, max: 40 },
    { label: 'Pacientes cadastrados', pts: patientPts, max: 15 },
    { label: 'Sessões (últimos 30d)', pts: sessionPts, max: 25 },
    { label: 'Financeiro ativo', pts: financialPts, max: 10 },
    { label: 'Uso de IA (Pro)', pts: aiPts, max: u.plan === 'pro' ? 10 : 0 },
  ]
}

function healthScoreToAdminUser(h: HealthScore): AdminUser {
  return {
    id: h.id, name: h.name, email: h.email, crp: '', specialty: '',
    isActive: true, emailVerified: true, createdAt: h.createdAt,
    subscription: h.plan ? {
      id: '', plan: h.plan, status: h.subscriptionStatus ?? 'none',
      trialEndsAt: null, cancelAtPeriodEnd: false, hasUsedTrial: false,
    } : null,
  }
}

function HealthScoresTab() {
  const { data: response, isLoading } = useAdminHealthScores()
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<HealthScore['tier'] | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overrideUser, setOverrideUser] = useState<AdminUser | null>(null)

  const allData = response?.data ?? []

  const filtered = allData.filter(u => {
    if (tierFilter && u.tier !== tierFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    return true
  })
  const sorted = [...filtered].sort((a, b) => sortAsc ? a.score - b.score : b.score - a.score)

  const counts = { healthy: 0, attention: 0, risk: 0 }
  for (const u of allData) counts[u.tier]++

  function relativeDate(iso: string | null) {
    if (!iso) return '—'
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    if (days === 0) return 'hoje'
    if (days === 1) return 'ontem'
    return `${days}d atrás`
  }

  return (
    <div className="space-y-4">
      {/* Resumo por tier — clicável para filtrar */}
      <div className="grid grid-cols-3 gap-3">
        {(['healthy', 'attention', 'risk'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTierFilter(tierFilter === t ? '' : t)}
            className={`rounded-2xl border p-4 text-left transition-opacity ${
              tierFilter && tierFilter !== t ? 'opacity-40' : ''
            } ${
              t === 'healthy' ? 'border-emerald-100 bg-emerald-50' :
              t === 'attention' ? 'border-yellow-100 bg-yellow-50' :
              'border-rose-100 bg-rose-50'
            }`}
          >
            <p className={`text-2xl font-bold ${
              t === 'healthy' ? 'text-emerald-700' :
              t === 'attention' ? 'text-yellow-700' : 'text-rose-700'
            }`}>{counts[t]}</p>
            <p className="text-xs font-medium text-neutral-500 mt-0.5">{TIER_LABEL[t]}</p>
          </button>
        ))}
      </div>

      {/* Filtros + timestamp */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="h-9 w-full rounded-xl border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-sage-400"
          />
        </label>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value as HealthScore['tier'] | '')}
          className="h-9 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-600 outline-none focus:border-sage-400"
        >
          <option value="">Todos os tiers</option>
          <option value="healthy">Saudável</option>
          <option value="attention">Atenção</option>
          <option value="risk">Risco</option>
        </select>
        {(search || tierFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setTierFilter('') }}
            className="h-9 inline-flex items-center gap-1 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-500 hover:bg-neutral-50"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
        {response?.generatedAt && (
          <span className="ml-auto text-[11px] text-neutral-400 whitespace-nowrap">
            Calculado às {new Date(response.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-neutral-100 rounded-xl" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-3 w-6"></th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSortAsc(v => !v)}
                      className="flex items-center gap-1 hover:text-neutral-600 transition-colors"
                    >
                      Score <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Último acesso</th>
                  <th className="px-4 py-3">Pacientes</th>
                  <th className="px-4 py-3">Sessões 30d</th>
                  <th className="px-4 py-3" title="Uso financeiro nos últimos 30 dias">Fin.</th>
                  <th className="px-4 py-3" title="Uso de IA nos últimos 30 dias (somente Pro)">IA</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {sorted.map(u => {
                  const expanded = expandedId === u.id
                  return (
                    <Fragment key={u.id}>
                      <tr
                        className="hover:bg-neutral-50/60 cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : u.id)}
                      >
                        <td className="px-4 py-3 text-neutral-300">
                          {expanded
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-800 truncate max-w-[160px]">{u.name}</p>
                          <p className="text-xs text-neutral-400 truncate max-w-[160px]">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBar score={u.score} tier={u.tier} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_COLOR[u.tier]}`}>
                            {TIER_LABEL[u.tier]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                          {relativeDate(u.lastActiveAt)}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-700 font-medium">{u.patientCount}</td>
                        <td className="px-4 py-3 text-xs text-neutral-700 font-medium">{u.sessionsLast30d}</td>
                        <td className="px-4 py-3 text-xs">{u.hasFinancialLast30d ? '✓' : <span className="text-neutral-300">—</span>}</td>
                        <td className="px-4 py-3 text-xs">{u.hasAiUsageLast30d ? '✓' : <span className="text-neutral-300">—</span>}</td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setOverrideUser(healthScoreToAdminUser(u))}
                            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700"
                          >
                            Override
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${u.id}-detail`} className="bg-neutral-50/80">
                          <td colSpan={10} className="px-8 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                              Breakdown do score (raw: {u.rawScore})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {computeFactors(u).map(f => (
                                f.max === 0 ? null : (
                                  <div key={f.label} className="rounded-lg bg-white border border-neutral-100 px-3 py-2">
                                    <p className="text-[10px] text-neutral-400 leading-tight">{f.label}</p>
                                    <p className={`text-sm font-semibold mt-0.5 ${f.pts === 0 ? 'text-rose-500' : 'text-neutral-700'}`}>
                                      {f.pts}<span className="text-neutral-300 font-normal">/{f.max}</span>
                                    </p>
                                  </div>
                                )
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-xs text-neutral-400">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {response && (
        <p className="text-xs text-neutral-400 text-right">
          Exibindo {sorted.length} de {response.total} usuário{response.total !== 1 ? 's' : ''}
        </p>
      )}

      {overrideUser && <OverrideModal user={overrideUser} onClose={() => setOverrideUser(null)} />}
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'monitor' | 'health'>('users')
  const [confirmCleanup, setConfirmCleanup] = useState(false)
  const { data: stats } = useAdminStats()
  const cleanup = useCleanupTestUsers()

  function handleCleanupTestUsers() {
    cleanup.mutate(undefined, {
      onSuccess: (r) => {
        setConfirmCleanup(false)
        toast.success(`${r.deleted} usuário(s) de teste removido(s).`)
      },
      onError: () => toast.error('Não foi possível limpar usuários de teste.'),
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
            <ShieldCheck className="h-4 w-4 text-sage-600" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-800">Painel Admin</h1>
        </div>
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:ml-auto sm:w-auto sm:overflow-visible sm:pb-0">
          <button
            type="button"
            onClick={() => setConfirmCleanup(true)}
            disabled={cleanup.isPending}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            {cleanup.isPending ? 'Limpando…' : 'Limpar testes'}
          </button>
          <Link
            to="/admin/churn"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 hover:border-rose-300 hover:text-rose-700"
          >
            <TrendingDown className="h-4 w-4" />
            Churn
          </Link>
          <Link
            to="/admin/depoimentos"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 hover:border-sage-300 hover:text-sage-700"
          >
            <MessageCircle className="h-4 w-4" />
            Depoimentos
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Usuários" value={stats.totalUsers} icon={Users} />
          <StatCard label="Ativos" value={stats.activeUsers} icon={Users} />
          <StatCard label="MRR" value={brl.format(stats.mrr)} icon={TrendingUp} />
          <StatCard
            label="Trial"
            value={stats.byPlanStatus.find(r => r.status === 'trialing')?.count ?? '0'}
            icon={Users}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-neutral-100 bg-neutral-50 p-1">
        {([
          { key: 'users', icon: Users, label: 'Usuários' },
          { key: 'health', icon: TrendingUp, label: 'Engajamento' },
          { key: 'monitor', icon: Activity, label: 'Monitor' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors sm:gap-2 sm:text-sm ${
              tab === key
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'health' && <HealthScoresTab />}
      {tab === 'monitor' && <MonitorTab />}

      <ConfirmDialog
        open={confirmCleanup}
        title="Limpar usuários de teste"
        description="Remove contas de teste antigas e seus dados relacionados. Essa ação não deve ser usada durante atendimento real."
        confirmLabel="Remover testes"
        loading={cleanup.isPending}
        onConfirm={handleCleanupTestUsers}
        onClose={() => setConfirmCleanup(false)}
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-sage-50">
        <Icon className="h-4 w-4 text-sage-600" />
      </div>
      <p className="text-xl font-bold text-neutral-800">{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  )
}
