import type { FinancialRecord } from '@/types'
import type { RecurringExpense } from '@/hooks/api/financial'

export const EXPENSE_CATEGORIES = [
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'supervisao', label: 'Supervisão/Formação' },
  { value: 'materiais', label: 'Materiais' },
  { value: 'assinaturas', label: 'Assinaturas/Software' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'outros', label: 'Outros' },
] as const

export function expenseCategoryLabel(value?: string): string {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? 'Sem categoria'
}

function parseDate(value: string): Date {
  return value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value)
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Próxima data em que uma despesa recorrente ainda não gerada neste mês vai virar lançamento. */
function nextRecurringExpenseDate(expense: RecurringExpense, now: Date): Date | null {
  if (expense.lastGeneratedMonth === toMonthKey(now)) return null // já gerada, já está nos lançamentos

  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dueDayThisMonth = Math.min(expense.dayOfMonth, lastDayThisMonth)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDayThisMonth)
  if (thisMonth >= now) return thisMonth

  const lastDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()
  const dueDayNextMonth = Math.min(expense.dayOfMonth, lastDayNextMonth)
  return new Date(now.getFullYear(), now.getMonth() + 1, dueDayNextMonth)
}

export type CashFlowForecast = {
  expectedIncome: number
  expectedExpense: number
  net: number
  days: number
}

/** Projeta entradas/saídas previstas para os próximos `days` dias, a partir de lançamentos pendentes/atrasados já existentes e despesas recorrentes ainda não geradas no mês. */
export function projectCashFlow(
  records: FinancialRecord[],
  recurringExpenses: RecurringExpense[],
  days = 30,
  now = new Date(),
): CashFlowForecast {
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + days)

  const isDueWithinHorizon = (record: FinancialRecord) => {
    if (!record.dueDate || (record.status !== 'pending' && record.status !== 'overdue')) return false
    const due = parseDate(record.dueDate)
    return due <= horizon
  }

  const expectedIncome = records
    .filter(r => r.type === 'income' && isDueWithinHorizon(r))
    .reduce((sum, r) => sum + Number(r.amount), 0)

  const expectedExpenseFromRecords = records
    .filter(r => r.type === 'expense' && isDueWithinHorizon(r))
    .reduce((sum, r) => sum + Number(r.amount), 0)

  const expectedExpenseFromRecurring = recurringExpenses
    .filter(e => e.active)
    .reduce((sum, e) => {
      const nextDate = nextRecurringExpenseDate(e, now)
      return nextDate && nextDate <= horizon ? sum + Number(e.amount) : sum
    }, 0)

  const expectedExpense = expectedExpenseFromRecords + expectedExpenseFromRecurring

  return {
    expectedIncome,
    expectedExpense,
    net: expectedIncome - expectedExpense,
    days,
  }
}
