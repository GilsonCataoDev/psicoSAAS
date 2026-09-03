import { describe, expect, it } from 'vitest'
import type { FinancialRecord } from '@/types'
import type { RecurringExpense } from '@/hooks/api/financial'
import { expenseCategoryLabel, projectCashFlow } from './financial-forecast'

const NOW = new Date('2026-08-05T12:00:00.000Z')

const record = (overrides: Partial<FinancialRecord>): FinancialRecord => ({
  id: `rec-${Math.random()}`,
  patientId: 'patient-1',
  type: 'income',
  amount: 100,
  description: 'Sessão',
  status: 'pending',
  createdAt: NOW.toISOString(),
  ...overrides,
})

const recurring = (overrides: Partial<RecurringExpense>): RecurringExpense => ({
  id: `exp-${Math.random()}`,
  description: 'Aluguel',
  amount: 500,
  dayOfMonth: 10,
  active: true,
  createdAt: NOW.toISOString(),
  ...overrides,
})

describe('financial-forecast', () => {
  it('soma receitas e despesas pendentes dentro do horizonte de dias', () => {
    const records = [
      record({ type: 'income', amount: 200, status: 'pending', dueDate: '2026-08-15' }),
      record({ type: 'income', amount: 300, status: 'overdue', dueDate: '2026-08-01' }),
      record({ type: 'expense', amount: 50, status: 'pending', dueDate: '2026-08-20' }),
      // fora do horizonte de 30 dias
      record({ type: 'income', amount: 999, status: 'pending', dueDate: '2026-12-01' }),
      // já pago não entra na projeção
      record({ type: 'income', amount: 999, status: 'paid', dueDate: '2026-08-10', paidAt: '2026-08-01' }),
    ]

    const forecast = projectCashFlow(records, [], 30, NOW)

    expect(forecast.expectedIncome).toBe(500)
    expect(forecast.expectedExpense).toBe(50)
    expect(forecast.net).toBe(450)
  })

  it('inclui despesa recorrente ainda não gerada neste mês, dentro do horizonte', () => {
    const expenses = [recurring({ dayOfMonth: 20, amount: 400 })] // 2026-08-20, dentro de 30 dias de 08-05

    const forecast = projectCashFlow([], expenses, 30, NOW)

    expect(forecast.expectedExpense).toBe(400)
  })

  it('não conta despesa recorrente já gerada neste mês (evita duplicar com o lançamento real)', () => {
    const expenses = [recurring({ dayOfMonth: 20, amount: 400, lastGeneratedMonth: '2026-08' })]

    const forecast = projectCashFlow([], expenses, 30, NOW)

    expect(forecast.expectedExpense).toBe(0)
  })

  it('ignora despesa recorrente pausada', () => {
    const expenses = [recurring({ dayOfMonth: 20, amount: 400, active: false })]

    const forecast = projectCashFlow([], expenses, 30, NOW)

    expect(forecast.expectedExpense).toBe(0)
  })

  it('empurra pro próximo mês quando o dia já passou neste mês', () => {
    // dia 1 já passou (agora é dia 5) -> próxima ocorrência é 2026-09-01, ainda dentro de 30 dias
    const expenses = [recurring({ dayOfMonth: 1, amount: 150 })]

    const forecast = projectCashFlow([], expenses, 30, NOW)

    expect(forecast.expectedExpense).toBe(150)
  })

  it('retorna o rótulo da categoria ou "Sem categoria"', () => {
    expect(expenseCategoryLabel('aluguel')).toBe('Aluguel')
    expect(expenseCategoryLabel(undefined)).toBe('Sem categoria')
    expect(expenseCategoryLabel('inexistente')).toBe('Sem categoria')
  })
})
