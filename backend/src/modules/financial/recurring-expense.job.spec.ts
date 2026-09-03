import { RecurringExpenseJob } from './recurring-expense.job'

describe('RecurringExpenseJob', () => {
  function makeJob(expenses: any[]) {
    const recurringExpenseRepo = {
      find: jest.fn().mockResolvedValue(expenses),
    }
    const financial = {
      ensureRecurringExpenseCharge: jest.fn().mockResolvedValue({ id: 'record-new' }),
    }
    const lock = { withLock: jest.fn(async (_key: number, fn: () => Promise<void>) => fn()) }

    const job = new RecurringExpenseJob(recurringExpenseRepo as any, financial as any, lock as any)
    return { job, recurringExpenseRepo, financial }
  }

  it('chama ensureRecurringExpenseCharge para cada despesa ativa', async () => {
    const expenses = [{ id: 'exp-1' }, { id: 'exp-2' }]
    const { job, recurringExpenseRepo, financial } = makeJob(expenses)

    await job.run()

    expect(recurringExpenseRepo.find).toHaveBeenCalledWith({ where: { active: true } })
    expect(financial.ensureRecurringExpenseCharge).toHaveBeenCalledTimes(2)
  })

  it('não interrompe o lote quando uma despesa falha', async () => {
    const expenses = [{ id: 'exp-bad' }, { id: 'exp-ok' }]
    const { job, financial } = makeJob(expenses)
    financial.ensureRecurringExpenseCharge
      .mockRejectedValueOnce(new Error('db explodiu'))
      .mockResolvedValueOnce({ id: 'record-new' })

    await expect(job.run()).resolves.toBeUndefined()
    expect(financial.ensureRecurringExpenseCharge).toHaveBeenCalledTimes(2)
  })

  it('não faz nada quando não há despesas ativas', async () => {
    const { job, financial } = makeJob([])
    await job.run()
    expect(financial.ensureRecurringExpenseCharge).not.toHaveBeenCalled()
  })
})
