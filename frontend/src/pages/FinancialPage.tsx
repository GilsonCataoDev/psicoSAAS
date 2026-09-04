import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Scale, Clock, CheckCircle, Plus, Download, Trash2,
  Percent, ReceiptText, AlertCircle, Repeat2, Pause, Play, Target, CalendarClock, MessageCircle,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import LightweightChart from '@/components/ui/LightweightChart'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  useFinancial, useMarkFinancialPaid, useDeleteFinancial, useSendCharge,
  useRecurringExpenses, useCreateRecurringExpense, useSetRecurringExpenseActive, useDeleteRecurringExpense,
} from '@/hooks/useApi'
import { FinancialRecord } from '@/types'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { EXPENSE_CATEGORIES, expenseCategoryLabel, projectCashFlow } from '@/lib/financial-forecast'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { useTerms } from '@/hooks/useTerms'

const NewPaymentModal = lazy(() => import('@/components/features/financial/NewPaymentModal'))
const MarkPaidModal = lazy(() => import('@/components/features/financial/MarkPaidModal'))

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX', credit_card: 'Cartao', debit_card: 'Debito', cash: 'Dinheiro', transfer: 'Transferencia',
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function displayDescription(description: string): string {
  return description.replace(/(Sess(?:ão|ao)\s*[—-]\s*)(\d{4})-(\d{2})-(\d{2})/i, '$1$4/$3/$2')
}

const FILTERS = [
  { v: 'all',     l: 'Todos'     },
  { v: 'pending', l: 'Pendentes' },
  { v: 'overdue', l: 'Atrasados' },
  { v: 'paid',    l: 'Pagos'     },
] as const

export default function FinancialPage() {
  const t = useTerms()
  const { data: records = [], isLoading } = useFinancial()
  const markPaid = useMarkFinancialPaid()
  const deleteRecord = useDeleteFinancial()
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')
  const [showNew, setShowNew] = useState(false)
  const [markRecord, setMarkRecord] = useState<FinancialRecord | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null)
  const recordsSectionRef = useRef<HTMLDivElement | null>(null)
  const [exportMonth, setExportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const financialSummary = useMemo(() => {
    const summary = records.reduce((summary, record) => {
      const amount = Number(record.amount)
      if (record.type === 'income') {
        summary.total += amount
        if (record.status === 'paid') summary.paid += amount
        if (record.status === 'pending') summary.pending += amount
        if (record.status === 'overdue') summary.overdue += amount
      } else {
        summary.expenseTotal += amount
        if (record.status === 'paid') summary.expensePaid += amount
      }
      summary.counts[record.status] = (summary.counts[record.status] ?? 0) + 1
      return summary
    }, {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      expenseTotal: 0,
      expensePaid: 0,
      counts: {} as Record<string, number>,
    })
    return { ...summary, net: summary.total - summary.expenseTotal }
  }, [records])

  const financialHealth = useMemo(() => {
    const incomes = records.filter(r => r.type === 'income')
    const paidRecords = incomes.filter(r => r.status === 'paid')
    const receivedMethods = paidRecords.reduce((acc, record) => {
      const key = !record.method || record.method === 'manual' ? 'sem_metodo' : record.method
      acc[key] = (acc[key] ?? 0) + Number(record.amount)
      return acc
    }, {} as Record<string, number>)
    const expected = financialSummary.paid + financialSummary.pending + financialSummary.overdue
    const receivable = financialSummary.pending + financialSummary.overdue

    return {
      collectionRate: expected > 0 ? Math.round((financialSummary.paid / expected) * 100) : 0,
      overdueRate: expected > 0 ? Math.round((financialSummary.overdue / expected) * 100) : 0,
      averageTicket: paidRecords.length > 0 ? financialSummary.paid / paidRecords.length : 0,
      receivable,
      paidCount: paidRecords.length,
      methodEntries: Object.entries(receivedMethods)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4),
    }
  }, [financialSummary, records])

  const filtered = useMemo(
    () => filter === 'all' ? records : records.filter(r => r.status === filter),
    [filter, records],
  )

  const expensesByCategory = useMemo(() => {
    const totals = records
      .filter(r => r.type === 'expense')
      .reduce((acc, r) => {
        const key = r.category ?? 'outros'
        acc[key] = (acc[key] ?? 0) + Number(r.amount)
        return acc
      }, {} as Record<string, number>)
    return Object.entries(totals).sort(([, a], [, b]) => b - a).slice(0, 5)
  }, [records])

  const { data: recurringExpenses = [] } = useRecurringExpenses()
  const createRecurringExpense = useCreateRecurringExpense()
  const setRecurringExpenseActive = useSetRecurringExpenseActive()
  const deleteRecurringExpense = useDeleteRecurringExpense()
  const [showNewRecurring, setShowNewRecurring] = useState(false)

  const forecast = useMemo(
    () => projectCashFlow(records, recurringExpenses, 30),
    [records, recurringExpenses],
  )

  const authUser = useAuthStore(s => s.user)
  const updateAuthUser = useAuthStore(s => s.updateUser)
  const [goalInput, setGoalInput] = useState(() => String(authUser?.preferences?.monthlyRevenueGoal ?? ''))
  const [savingGoal, setSavingGoal] = useState(false)
  const monthlyRevenueGoal = Number(authUser?.preferences?.monthlyRevenueGoal) || 0

  async function saveGoal() {
    const value = Number(goalInput)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Informe um valor válido.')
      return
    }
    setSavingGoal(true)
    try {
      await api.patch('/auth/preferences', { monthlyRevenueGoal: value })
      updateAuthUser({ preferences: { ...authUser?.preferences, monthlyRevenueGoal: value } })
      toast.success('Meta salva')
    } catch {
      toast.error('Erro ao salvar meta.')
    } finally {
      setSavingGoal(false)
    }
  }

  // Constroi grafico dos ultimos 6 meses a partir dos registros reais
  const revenueData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const mes = MONTH_NAMES[d.getMonth()]
      const valor = records
        .filter(r => {
          const rDate = new Date(r.paidAt ?? r.dueDate ?? r.createdAt)
          return r.type === 'income' && r.status === 'paid' && rDate.getFullYear() === d.getFullYear() && rDate.getMonth() === d.getMonth()
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
    const header = `Tipo,Descrição,${t.patientCapitalized},Valor,Status,Método,Data venc.,Data pag.`
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

  function showOverdueRecords() {
    setFilter('overdue')
    window.requestAnimationFrame(() => {
      recordsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="Receita total"  value={formatCurrency(financialSummary.total)}
          icon={<Wallet className="w-5 h-5" />}       accent="sage" />
        <StatCard label="Recebido"       value={formatCurrency(financialSummary.paid)}
          icon={<CheckCircle className="w-5 h-5" />}  accent="sage" />
        <StatCard label="Pendente"       value={formatCurrency(financialSummary.pending)}
          icon={<Clock className="w-5 h-5" />}        accent="amber" />
        <StatCard label="Em atraso"      value={formatCurrency(financialSummary.overdue)}
          icon={<TrendingUp className="w-5 h-5" />}   accent={financialSummary.overdue > 0 ? 'rose' : 'sage'} />
        <StatCard label="Despesas"       value={formatCurrency(financialSummary.expenseTotal)}
          icon={<TrendingDown className="w-5 h-5" />} accent="rose" />
        <StatCard label="Lucro líquido"  value={formatCurrency(financialSummary.net)}
          icon={<Scale className="w-5 h-5" />}        accent={financialSummary.net >= 0 ? 'sage' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="card lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="section-title mb-1">Saude financeira</h2>
              <p className="text-sm text-neutral-500">
                Visao rapida para saber se a clinica esta recebendo dentro do esperado.
              </p>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              financialHealth.overdueRate > 15
                ? 'bg-rose-50 text-rose-700'
                : financialHealth.collectionRate >= 80
                ? 'bg-sage-50 text-sage-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              <Percent className="h-3.5 w-3.5" />
              {financialHealth.collectionRate}% recebido
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs text-neutral-400">A receber</p>
              <p className="mt-1 text-lg font-semibold text-neutral-800">{formatCurrency(financialHealth.receivable)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs text-neutral-400">Ticket medio recebido</p>
              <p className="mt-1 text-lg font-semibold text-neutral-800">{formatCurrency(financialHealth.averageTicket)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs text-neutral-400">Lancamentos pagos</p>
              <p className="mt-1 text-lg font-semibold text-neutral-800">{financialHealth.paidCount}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-neutral-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${financialSummary.overdue > 0 ? 'text-rose-500' : 'text-sage-600'}`} />
              <p className="text-sm text-neutral-600">
                {financialSummary.overdue > 0
                  ? `Prioridade: revisar pagamentos em atraso e acionar ${t.patients} pendentes.`
                  : financialSummary.pending > 0
                  ? 'Fluxo ok. Existem pagamentos pendentes para acompanhar nos proximos dias.'
                  : 'Tudo em dia no financeiro registrado.'}
              </p>
            </div>
            {financialSummary.overdue > 0 && (
              <button type="button" onClick={showOverdueRecords} className="btn-secondary shrink-0 text-xs">
                Ver atrasados
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title mb-0">Recebimentos</h2>
            <ReceiptText className="h-4 w-4 text-neutral-400" />
          </div>
          {financialHealth.methodEntries.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum pagamento recebido ainda.</p>
          ) : (
            <div className="space-y-3">
              {financialHealth.methodEntries.map(([method, amount]) => (
                <div key={method}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-neutral-500">{METHOD_LABELS[method] ?? 'Sem metodo'}</span>
                    <span className="font-semibold text-neutral-800">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-sage-500"
                      style={{ width: `${financialSummary.paid > 0 ? Math.max(8, Math.round((amount / financialSummary.paid) * 100)) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta mensal, projeção de fluxo de caixa e despesas por categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0">Meta mensal</h2>
            <Target className="h-4 w-4 text-neutral-400" />
          </div>
          {(() => {
            const currentMonthRevenue = revenueData[revenueData.length - 1]?.valor ?? 0
            const progress = monthlyRevenueGoal > 0 ? Math.min(100, Math.round((currentMonthRevenue / monthlyRevenueGoal) * 100)) : 0
            return (
              <>
                {monthlyRevenueGoal > 0 && (
                  <>
                    <p className="text-sm text-neutral-500">
                      {formatCurrency(currentMonthRevenue)} de {formatCurrency(monthlyRevenueGoal)}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-neutral-100">
                      <div className="h-2 rounded-full bg-sage-500" style={{ width: `${Math.max(4, progress)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">{progress}% da meta este mês</p>
                  </>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    placeholder="Ex: 8000"
                    className="input-field text-sm"
                  />
                  <button type="button" onClick={saveGoal} disabled={savingGoal} className="btn-secondary shrink-0 text-xs">
                    Salvar
                  </button>
                </div>
              </>
            )
          })()}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0">Próximos 30 dias</h2>
            <CalendarClock className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Entradas previstas</span>
              <span className="font-semibold text-sage-600">{formatCurrency(forecast.expectedIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Saídas previstas</span>
              <span className="font-semibold text-rose-600">{formatCurrency(forecast.expectedExpense)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
              <span className="text-neutral-500">Saldo projetado</span>
              <span className={`font-semibold ${forecast.net >= 0 ? 'text-sage-600' : 'text-rose-600'}`}>
                {formatCurrency(forecast.net)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Baseado em lançamentos pendentes/atrasados e despesas fixas recorrentes ainda não geradas neste mês.
          </p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0">Despesas por categoria</h2>
            <TrendingDown className="h-4 w-4 text-neutral-400" />
          </div>
          {expensesByCategory.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma despesa registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {expensesByCategory.map(([category, amount]) => (
                <div key={category}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-neutral-500">{expenseCategoryLabel(category)}</span>
                    <span className="font-semibold text-neutral-800">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-rose-400"
                      style={{ width: `${financialSummary.expenseTotal > 0 ? Math.max(8, Math.round((amount / financialSummary.expenseTotal) * 100)) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Despesas recorrentes */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-neutral-400" />
            <h2 className="section-title mb-0">Despesas recorrentes</h2>
          </div>
          <button type="button" onClick={() => setShowNewRecurring(true)} className="btn-secondary text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Nova despesa fixa
          </button>
        </div>
        {recurringExpenses.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Nenhuma despesa fixa cadastrada. Aluguel, assinaturas e supervisão podem ser lançados automaticamente todo mês.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recurringExpenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-700 truncate">{expense.description}</p>
                  <p className="text-xs text-neutral-400">
                    {expenseCategoryLabel(expense.category)} · {formatCurrency(expense.amount)} · todo dia {expense.dayOfMonth}
                    {!expense.active && ' · pausada'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title={expense.active ? 'Pausar' : 'Retomar'}
                    onClick={() => setRecurringExpenseActive.mutate({ id: expense.id, active: !expense.active })}
                    disabled={setRecurringExpenseActive.isPending}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-sage-600 hover:bg-sage-50"
                  >
                    {expense.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    title="Excluir despesa recorrente"
                    onClick={() => {
                      if (confirm('Excluir esta despesa recorrente? Lançamentos já gerados não são apagados.')) {
                        deleteRecurringExpense.mutate(expense.id)
                      }
                    }}
                    disabled={deleteRecurringExpense.isPending}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grafico de receita mensal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Receita mensal</h2>
          <span className="text-xs text-neutral-400">Ultimos 6 meses</span>
        </div>
        <div className="h-40">
          <LightweightChart
            data={revenueData.map(item => ({ label: item.mes, value: item.valor }))}
            height={160}
            color="#4DA8DA"
            fillOpacity={0.18}
            showYAxis
            formatValue={value => value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : formatCurrency(value)}
          />
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

      {/* Painel de inadimplência */}
      <OverduePanel records={records} />

      {/* Lista de lancamentos */}
      <div ref={recordsSectionRef} className="card scroll-mt-4">
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
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
              ))}
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
        description={`Excluir o lancamento de ${recordToDelete?.patient?.name ?? t.patient}? Essa acao remove o registro financeiro definitivamente.`}
        confirmLabel="Excluir lancamento"
        loading={deleteRecord.isPending}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteRecord}
      />
      <NewRecurringExpenseModal
        open={showNewRecurring}
        onClose={() => setShowNewRecurring(false)}
        onCreate={data => createRecurringExpense.mutateAsync(data)}
      />
    </div>
  )
}

// --- Nova despesa recorrente ---------------------------------------------------
function NewRecurringExpenseModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (data: { description: string; amount: number; category?: string; dayOfMonth: number }) => Promise<unknown>
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('5')
  const [submitting, setSubmitting] = useState(false)

  function resetAndClose() {
    setDescription(''); setAmount(''); setCategory(''); setDayOfMonth('5')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountValue = Number(amount)
    const dayValue = Number(dayOfMonth)
    if (!description.trim()) { toast.error('Informe uma descrição.'); return }
    if (!Number.isFinite(amountValue) || amountValue <= 0) { toast.error('Informe um valor maior que zero.'); return }
    if (!Number.isInteger(dayValue) || dayValue < 1 || dayValue > 28) { toast.error('O dia deve ser entre 1 e 28.'); return }

    setSubmitting(true)
    try {
      await onCreate({ description: description.trim(), amount: amountValue, category: category || undefined, dayOfMonth: dayValue })
      toast.success('Despesa recorrente criada')
      resetAndClose()
    } catch {
      toast.error('Erro ao criar despesa recorrente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Nova despesa fixa"
      description="Lançada automaticamente todo mês no dia escolhido.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="Ex: Aluguel da sala" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Valor (R$)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" min="0.01" className="input-field" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Dia do mês</label>
            <input value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} type="number" min="1" max="28" className="input-field" />
          </div>
        </div>
        <div>
          <label className="label">Categoria</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
            <option value="">Sem categoria</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={resetAndClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar despesa fixa
          </button>
        </div>
      </form>
    </Modal>
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
        <p className="text-sm font-medium text-neutral-700 truncate">{displayDescription(record.description)}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {record.paidAt
            ? `Pago em ${formatDate(record.paidAt)}`
            : record.dueDate
            ? `Vence ${formatDate(record.dueDate)}`
            : '-'}
          {record.method && ` · ${METHOD_LABELS[record.method] ?? record.method}`}
          {record.type === 'expense' && record.category && ` · ${expenseCategoryLabel(record.category)}`}
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

function OverduePanel({ records }: { records: FinancialRecord[] }) {
  const sendCharge = useSendCharge()
  const [sending, setSending] = useState<string | null>(null)
  const today = new Date()

  const overdue = records.filter(r =>
    r.type === 'income' && (r.status === 'pending' || r.status === 'overdue'),
  ).sort((a, b) => (a.dueDate ?? a.createdAt) < (b.dueDate ?? b.createdAt) ? -1 : 1)

  if (overdue.length === 0) return null

  function daysOpen(record: FinancialRecord): number {
    const ref = record.dueDate ?? record.createdAt
    return Math.floor((today.getTime() - new Date(ref).getTime()) / 86400000)
  }

  async function charge(id: string) {
    setSending(id)
    try {
      await sendCharge.mutateAsync(id)
      toast.success('Cobrança enviada via WhatsApp')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao enviar cobrança')
    } finally { setSending(null) }
  }

  const total = overdue.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="card border-rose-100 bg-rose-50/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <h2 className="section-title mb-0 text-rose-700">Inadimplência</h2>
        </div>
        <span className="text-sm font-semibold text-rose-700">{formatCurrency(total)} em aberto</span>
      </div>
      <div className="space-y-2">
        {overdue.map(r => {
          const days = daysOpen(r)
          return (
            <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-rose-100">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{r.patient?.name ?? '—'}</p>
                <p className="text-xs text-neutral-400 truncate">{displayDescription(r.description)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-rose-600">{formatCurrency(Number(r.amount))}</p>
                <p className="text-xs text-neutral-400">{days > 0 ? `${days}d em aberto` : 'Vence hoje'}</p>
              </div>
              <button
                onClick={() => charge(r.id)}
                disabled={sending === r.id}
                title="Enviar cobrança via WhatsApp"
                className="btn-secondary p-2 shrink-0"
              >
                {sending === r.id
                  ? <Clock className="w-4 h-4 animate-spin" />
                  : <MessageCircle className="w-4 h-4 text-green-600" />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

