import { lazy, Suspense, useMemo, useState } from 'react'
import { Wallet, TrendingUp, Clock, CheckCircle, Plus, Download, Trash2 } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinancial, useMarkFinancialPaid, useDeleteFinancial } from '@/hooks/useApi'
import { FinancialRecord } from '@/types'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const NewPaymentModal = lazy(() => import('@/components/features/financial/NewPaymentModal'))
const MarkPaidModal = lazy(() => import('@/components/features/financial/MarkPaidModal'))

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX', credit_card: 'Cartao', debit_card: 'Debito', cash: 'Dinheiro', transfer: 'Transferencia',
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const FILTERS = [
  { v: 'all',     l: 'Todos'     },
  { v: 'pending', l: 'Pendentes' },
  { v: 'overdue', l: 'Atrasados' },
  { v: 'paid',    l: 'Pagos'     },
] as const

export default function FinancialPage() {
  const { data: records = [], isLoading } = useFinancial()
  const markPaid = useMarkFinancialPaid()
  const deleteRecord = useDeleteFinancial()
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')
  const [showNew, setShowNew] = useState(false)
  const [markRecord, setMarkRecord] = useState<FinancialRecord | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null)
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const financialSummary = useMemo(() => {
    return records.reduce((summary, record) => {
      const amount = Number(record.amount)
      if (record.type === 'income') summary.total += amount
      if (record.status === 'paid') summary.paid += amount
      if (record.status === 'pending') summary.pending += amount
      if (record.status === 'overdue') summary.overdue += amount
      summary.counts[record.status] = (summary.counts[record.status] ?? 0) + 1
      return summary
    }, {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      counts: {} as Record<string, number>,
    })
  }, [records])

  const filtered = useMemo(
    () => filter === 'all' ? records : records.filter(r => r.status === filter),
    [filter, records],
  )

  // Constroi grafico dos ultimos 6 meses a partir dos registros reais
  const revenueData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const mes = MONTH_NAMES[d.getMonth()]
      const valor = records
        .filter(r => {
          const rDate = new Date(r.paidAt ?? r.dueDate ?? r.createdAt)
          return r.status === 'paid' && rDate.getFullYear() === d.getFullYear() && rDate.getMonth() === d.getMonth()
        })
        .reduce((s, r) => s + Number(r.amount), 0)
      return { mes, valor }
    })
  }, [records])

  async function handleMarkPaid(id: string, method: string) {
    try {
      await markPaid.mutateAsync({ id, method })
      toast.success('Pagamento registrado ok')
    } catch {
      toast.error('Erro ao registrar pagamento.')
    }
  }

  function downloadCsv() {
    const [year, m] = exportMonth.split('-').map(Number)
    const monthRecords = records.filter(r => {
      const d = new Date(r.paidAt ?? r.dueDate ?? r.createdAt)
      return d.getFullYear() === year && d.getMonth() + 1 === m
    })
    const header = 'Tipo,Descrição,Paciente,Valor,Status,Método,Data venc.,Data pag.'
    const rows = monthRecords.map(r => [
      r.type === 'income' ? 'Receita' : 'Despesa',
      `"${(r.description ?? '').replace(/"/g, '""')}"`,
      `"${(r.patient?.name ?? '').replace(/"/g, '""')}"`,
      Number(r.amount).toFixed(2).replace('.', ','),
      r.status,
      r.method ?? '',
      r.dueDate ?? '',
      r.paidAt ?? '',
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro-${exportMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteRecord() {
    if (!recordToDelete) return
    try {
      await deleteRecord.mutateAsync(recordToDelete.id)
      toast.success('Lancamento excluido')
      setRecordToDelete(null)
    } catch {
      toast.error('Erro ao excluir lancamento')
    }
  }

  return (
    <div className="animate-slide-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Controle simples e sem julgamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1">
            <input
              type="month"
              value={exportMonth}
              onChange={e => setExportMonth(e.target.value)}
              className="text-xs text-neutral-600 bg-transparent border-none outline-none"
            />
            <button onClick={downloadCsv} title="Exportar CSV" className="flex items-center gap-1 text-xs text-sage-600 hover:text-sage-800 font-medium px-1">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo lancamento</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Receita total"  value={formatCurrency(financialSummary.total)}
          icon={<Wallet className="w-5 h-5" />}       accent="sage" />
        <StatCard label="Recebido"       value={formatCurrency(financialSummary.paid)}
          icon={<CheckCircle className="w-5 h-5" />}  accent="sage" />
        <StatCard label="Pendente"       value={formatCurrency(financialSummary.pending)}
          icon={<Clock className="w-5 h-5" />}        accent="amber" />
        <StatCard label="Em atraso"      value={formatCurrency(financialSummary.overdue)}
          icon={<TrendingUp className="w-5 h-5" />}   accent={financialSummary.overdue > 0 ? 'rose' : 'sage'} />
      </div>

      {/* Grafico de receita mensal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Receita mensal</h2>
          <span className="text-xs text-neutral-400">Ultimos 6 meses</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4DA8DA" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#4DA8DA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Receita']}
                contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="valor" stroke="#4DA8DA" strokeWidth={2}
                fill="url(#colorValor)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Mini resumo */}
        {(() => {
          const last = revenueData[revenueData.length - 1]
          const prev = revenueData[revenueData.length - 2]
          const diff = prev?.valor > 0 ? (((last.valor - prev.valor) / prev.valor) * 100).toFixed(0) : null
          return (
            <div className="flex gap-6 mt-3 pt-3 border-t border-neutral-50">
              <div>
                <p className="text-xs text-neutral-400">Este mes</p>
                <p className="font-semibold text-neutral-800 text-sm">{formatCurrency(last.valor)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Mes anterior</p>
                <p className="font-semibold text-neutral-800 text-sm">{formatCurrency(prev?.valor ?? 0)}</p>
              </div>
              {diff !== null && (
                <div>
                  <p className="text-xs text-neutral-400">Variacao</p>
                  <p className={`font-semibold text-sm ${Number(diff) >= 0 ? 'text-sage-600' : 'text-rose-500'}`}>
                    {Number(diff) >= 0 ? '+' : ''}{diff}%
                  </p>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Lista de lancamentos */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="section-title mb-0">Lancamentos</h2>
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
                    {financialSummary.counts[v] > 0
                      ? `(${financialSummary.counts[v]})`
                      : ''}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-neutral-400 text-sm text-center py-8">
              Nenhum lancamento nesta categoria.
            </p>
          ) : filtered.map(record => (
            <FinancialRow key={record.id} record={record}
              onMarkPaid={() => setMarkRecord(record)}
              onDelete={() => setRecordToDelete(record)}
            />
          ))}
        </div>
      </div>

      {/* Modais */}
      <Suspense fallback={(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="rounded-xl bg-white p-4 shadow-xl" role="status" aria-label="Carregando">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
          </div>
        </div>
      )}>
        {showNew && <NewPaymentModal open onClose={() => setShowNew(false)} />}
        {markRecord && (
          <MarkPaidModal
            record={markRecord}
            open
            onClose={() => setMarkRecord(null)}
            onConfirm={handleMarkPaid}
          />
        )}
      </Suspense>
      <ConfirmDialog
        open={!!recordToDelete}
        title="Excluir lancamento"
        description={`Excluir o lancamento de ${recordToDelete?.patient?.name ?? 'paciente'}? Essa acao remove o registro financeiro definitivamente.`}
        confirmLabel="Excluir lancamento"
        loading={deleteRecord.isPending}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteRecord}
      />
    </div>
  )
}

// --- Linha de lancamento ------------------------------------------------------
function FinancialRow({ record, onMarkPaid, onDelete }: {
  record: FinancialRecord
  onMarkPaid: () => void
  onDelete: () => void
}) {
  const isPending = record.status === 'pending' || record.status === 'overdue'
  const patientName = record.patient?.name ?? record.description

  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
      <Avatar name={patientName} colorClass={record.patient?.avatarColor} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 truncate">{record.description}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {record.paidAt
            ? `Pago em ${formatDate(record.paidAt)}`
            : record.dueDate
            ? `Vence ${formatDate(record.dueDate)}`
            : '-'}
          {record.method && ` · ${METHOD_LABELS[record.method] ?? record.method}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        {isPending && (
          <button onClick={onMarkPaid}
            title="Registrar pagamento manualmente"
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors">
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        <button onClick={onDelete}
          title="Excluir lancamento"
          className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

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

