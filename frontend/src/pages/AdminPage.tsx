import { useState } from 'react'
import { ShieldCheck, TrendingUp, Users } from 'lucide-react'
import { useAdminStats, useAdminUsers, useAdminOverrideSubscription, AdminUser } from '@/hooks/useApi'

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

export default function AdminPage() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const { data: stats } = useAdminStats()
  const { data: users, isLoading } = useAdminUsers(page)

  const totalPages = users ? Math.ceil(users.total / users.limit) : 1

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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex min-w-[620px] items-center justify-between border-t border-neutral-100 px-4 py-3">
            <span className="text-xs text-neutral-400">
              Página {page} de {totalPages}
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
