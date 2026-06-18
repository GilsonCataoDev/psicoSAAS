import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  CreditCard,
  Database,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Webhook,
  X,
} from 'lucide-react'
import { useAdminStats, useAdminUsers, useAdminOverrideSubscription, useAdminMonitor, AdminUser } from '@/hooks/useApi'

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
  const { data: users, isLoading } = useAdminUsers({ page, search: search.trim() || undefined, plan: plan || undefined, status: status || undefined })

  const totalPages = users ? Math.ceil(users.total / users.limit) : 1
  const hasFilters = !!search.trim() || !!plan || !!status

  function resetFilters() {
    setSearch('')
    setPlan('')
    setStatus('')
    setPage(1)
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
        <table className="min-w-[620px] w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3 hidden sm:table-cell">E-mail</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {isLoading && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && users?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {users?.data.map(u => (
              <tr key={u.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-medium text-neutral-800">{u.name}</td>
                <td className="px-4 py-3 hidden text-neutral-500 sm:table-cell">{u.email}</td>
                <td className="px-4 py-3 capitalize text-neutral-600">{u.subscription?.plan ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[u.subscription?.status ?? 'none']}`}>
                    {STATUS_LABEL[u.subscription?.status ?? 'none']}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(u)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700"
                  >
                    Override
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex min-w-[620px] items-center justify-between border-t border-neutral-100 px-4 py-3">
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
            ok={integrations.whatsapp.configured}
            detail={integrations.whatsapp.configured ? 'Configurado' : 'Pendente'}
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

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'monitor'>('users')
  const { data: stats } = useAdminStats()

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
          <ShieldCheck className="h-4 w-4 text-sage-600" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-800">Painel Admin</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Usuários" value={stats.totalUsers} icon={Users} />
          <StatCard label="Ativos" value={stats.activeUsers} icon={Users} />
          <StatCard label="MRR" value={`R$ ${stats.mrr}`} icon={TrendingUp} />
          <StatCard
            label="Trial"
            value={stats.byPlanStatus.find(r => r.status === 'trialing')?.count ?? '0'}
            icon={Users}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-100 bg-neutral-50 p-1">
        <button
          onClick={() => setTab('users')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'users'
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Users className="h-4 w-4" />
          Usuários
        </button>
        <button
          onClick={() => setTab('monitor')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'monitor'
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Activity className="h-4 w-4" />
          Monitor
        </button>
      </div>

      {tab === 'users' ? <UsersTab /> : <MonitorTab />}
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
