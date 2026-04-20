import { useState } from 'react'
import { Wallet, TrendingUp, Clock, CheckCircle, Plus } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { mockFinancial } from '@/lib/mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FinancialRecord } from '@/types'

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX', credit_card: 'Cartão', debit_card: 'Débito', cash: 'Dinheiro', transfer: 'Transferência',
}

const FILTERS = [
  { v: 'all',     l: 'Todos'     },
  { v: 'paid',    l: 'Pagos'     },
  { v: 'pending', l: 'Pendentes' },
  { v: 'overdue', l: 'Atrasados' },
] as const

export default function FinancialPage() {
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')

  const total   = mockFinancial.reduce((s, r) => s + (r.type === 'income' ? r.amount : 0), 0)
  const paid    = mockFinancial.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)
  const pending = mockFinancial.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const overdue = mockFinancial.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0)

  const filtered = filter === 'all' ? mockFinancial : mockFinancial.filter(r => r.status === filter)

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Controle simples e sem julgamentos</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo lançamento</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Receita total"  value={formatCurrency(total)}   icon={<Wallet className="w-5 h-5" />}     accent="sage" />
        <StatCard label="Recebido"       value={formatCurrency(paid)}    icon={<CheckCircle className="w-5 h-5" />} accent="sage" />
        <StatCard label="Pendente"       value={formatCurrency(pending)} icon={<Clock className="w-5 h-5" />}      accent="amber" />
        <StatCard label="Em atraso"      value={formatCurrency(overdue)} icon={<TrendingUp className="w-5 h-5" />} accent={overdue > 0 ? 'rose' : 'sage'} />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="section-title mb-0">Lançamentos</h2>
          {/* Filtros em scroll horizontal no mobile */}
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {FILTERS.map(({ v, l }) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  filter === v
                    ? 'bg-white text-neutral-800 shadow-sm font-medium'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {filtered.map(record => <FinancialRow key={record.id} record={record} />)}
          {filtered.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-8">
              Nenhum lançamento nesta categoria.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FinancialRow({ record }: { record: FinancialRecord }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
      <Avatar name={record.patient!.name} colorClass={record.patient!.avatarColor} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 truncate">{record.description}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {record.paidAt
            ? `Pago em ${formatDate(record.paidAt)}`
            : record.dueDate
            ? `Vence em ${formatDate(record.dueDate)}`
            : '—'}
          {record.method && ` · ${METHOD_LABELS[record.method]}`}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
        <span className={`font-semibold text-sm ${
          record.status === 'paid'    ? 'text-sage-600'    :
          record.status === 'overdue' ? 'text-rose-600'    : 'text-amber-600'
        }`}>
          {formatCurrency(record.amount)}
        </span>
        <StatusBadge status={record.status} />
      </div>
    </div>
  )
}
