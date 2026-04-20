import { useState } from 'react'
import { Wallet, TrendingUp, Clock, CheckCircle, Plus, MessageCircle, CreditCard } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { mockFinancial } from '@/lib/mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FinancialRecord } from '@/types'
import NewPaymentModal from '@/components/features/financial/NewPaymentModal'
import MarkPaidModal from '@/components/features/financial/MarkPaidModal'
import SendChargeModal from '@/components/features/financial/SendChargeModal'
import toast from 'react-hot-toast'

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX', credit_card: 'Cartão', debit_card: 'Débito', cash: 'Dinheiro', transfer: 'Transferência',
}

const revenueData = [
  { mes: 'Nov', valor: 3200, meta: 4000 },
  { mes: 'Dez', valor: 3800, meta: 4000 },
  { mes: 'Jan', valor: 3100, meta: 4200 },
  { mes: 'Fev', valor: 4200, meta: 4200 },
  { mes: 'Mar', valor: 3900, meta: 4200 },
  { mes: 'Abr', valor: 4680, meta: 4500 },
]

const FILTERS = [
  { v: 'all',     l: 'Todos'     },
  { v: 'pending', l: 'Pendentes' },
  { v: 'overdue', l: 'Atrasados' },
  { v: 'paid',    l: 'Pagos'     },
] as const

export default function FinancialPage() {
  const [records, setRecords] = useState<FinancialRecord[]>(mockFinancial)
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')
  const [showNew, setShowNew] = useState(false)
  const [markRecord, setMarkRecord] = useState<FinancialRecord | null>(null)
  const [chargeRecord, setChargeRecord] = useState<FinancialRecord | null>(null)

  const total   = records.reduce((s, r) => s + (r.type === 'income' ? r.amount : 0), 0)
  const paid    = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const pending = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const overdue = records.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0)

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)

  function handleMarkPaid(id: string, method: string) {
    setRecords(rs => rs.map(r =>
      r.id === id
        ? { ...r, status: 'paid', method: method as FinancialRecord['method'], paidAt: new Date().toISOString() }
        : r,
    ))
    toast.success('Pagamento registrado ✓')
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Controle simples e sem julgamentos</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo lançamento</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Receita total"  value={formatCurrency(total)}
          icon={<Wallet className="w-5 h-5" />}       accent="sage" />
        <StatCard label="Recebido"       value={formatCurrency(paid)}
          icon={<CheckCircle className="w-5 h-5" />}  accent="sage" />
        <StatCard label="Pendente"       value={formatCurrency(pending)}
          icon={<Clock className="w-5 h-5" />}        accent="amber" />
        <StatCard label="Em atraso"      value={formatCurrency(overdue)}
          icon={<TrendingUp className="w-5 h-5" />}   accent={overdue > 0 ? 'rose' : 'sage'} />
      </div>

      {/* Gráfico de receita mensal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Receita mensal</h2>
          <span className="text-xs text-neutral-400">Últimos 6 meses</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3f8866" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3f8866" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Receita']}
                contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="valor" stroke="#3f8866" strokeWidth={2}
                fill="url(#colorValor)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Mini resumo */}
        {(() => {
          const last = revenueData[revenueData.length - 1]
          const prev = revenueData[revenueData.length - 2]
          const pct  = (((last.valor - prev.valor) / prev.valor) * 100).toFixed(0)
          return (
            <div className="flex gap-6 mt-3 pt-3 border-t border-neutral-50">
              <div>
                <p className="text-xs text-neutral-400">Este mês</p>
                <p className="font-semibold text-neutral-800 text-sm">{formatCurrency(last.valor)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Meta</p>
                <p className="font-semibold text-neutral-800 text-sm">{formatCurrency(last.meta)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Vs. mês anterior</p>
                <p className="font-semibold text-sage-600 text-sm">+{pct}%</p>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Lista de lançamentos */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="section-title mb-0">Lançamentos</h2>
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {FILTERS.map(({ v, l }) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  filter === v
                    ? 'bg-white text-neutral-800 shadow-sm font-medium'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}>
                {l}
                {v !== 'all' && (
                  <span className="ml-1 font-bold">
                    {records.filter(r => r.status === v).length > 0
                      ? `(${records.filter(r => r.status === v).length})`
                      : ''}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {filtered.map(record => (
            <FinancialRow key={record.id} record={record}
              onMarkPaid={() => setMarkRecord(record)}
              onSendCharge={() => setChargeRecord(record)} />
          ))}
          {filtered.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-8">
              Nenhum lançamento nesta categoria.
            </p>
          )}
        </div>
      </div>

      {/* Modais */}
      <NewPaymentModal open={showNew} onClose={() => setShowNew(false)} />
      <MarkPaidModal
        record={markRecord}
        open={!!markRecord}
        onClose={() => setMarkRecord(null)}
        onConfirm={handleMarkPaid}
      />
      <SendChargeModal
        record={chargeRecord}
        open={!!chargeRecord}
        onClose={() => setChargeRecord(null)}
      />
    </div>
  )
}

// ─── Linha de lançamento ──────────────────────────────────────────────────────
function FinancialRow({ record, onMarkPaid, onSendCharge }: {
  record: FinancialRecord
  onMarkPaid: () => void
  onSendCharge: () => void
}) {
  const isPending = record.status === 'pending' || record.status === 'overdue'

  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
      <Avatar name={record.patient!.name} colorClass={record.patient!.avatarColor} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 truncate">{record.description}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {record.paidAt
            ? `Pago em ${formatDate(record.paidAt)}`
            : record.dueDate
            ? `Vence ${formatDate(record.dueDate)}`
            : '—'}
          {record.method && ` · ${METHOD_LABELS[record.method]}`}
        </p>
      </div>

      {/* Ações — aparecem no hover (desktop) ou sempre (mobile) */}
      {isPending && (
        <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onSendCharge}
            title="Enviar cobrança via WhatsApp"
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button onClick={onMarkPaid}
            title="Registrar pagamento"
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors">
            <CreditCard className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
        <span className={`font-semibold text-sm ${
          record.status === 'paid'    ? 'text-sage-600'  :
          record.status === 'overdue' ? 'text-rose-600'  : 'text-amber-600'
        }`}>
          {formatCurrency(record.amount)}
        </span>
        <StatusBadge status={record.status} />
      </div>
    </div>
  )
}
