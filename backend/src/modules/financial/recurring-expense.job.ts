import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RecurringExpense } from './entities/recurring-expense.entity'
import { FinancialService } from './financial.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

// Gera automaticamente o lançamento (FinancialRecord) do mês corrente para cada
// despesa fixa recorrente ativa (aluguel, assinaturas, supervisão etc.), assim
// como o PaymentReminderJob já faz para pacotes mensais de pacientes.
@Injectable()
export class RecurringExpenseJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecurringExpenseJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(RecurringExpense)
    private readonly recurringExpenses: Repository<RecurringExpense>,
    private readonly financial: FinancialService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), SIX_HOURS_MS)
    setTimeout(() => this.run().catch((err) => this.logger.error(err)), 10_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.RECURRING_EXPENSE, () => this.runLocked())
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
    const now = new Date()
    const active = await this.recurringExpenses.find({ where: { active: true } })
    if (!active.length) return

    let generated = 0
    for (const expense of active) {
      try {
        const record = await this.financial.ensureRecurringExpenseCharge(expense, now)
        if (record) generated += 1
      } catch (error) {
        this.logger.warn(`Falha ao gerar despesa recorrente id=${expense.id}: ${error instanceof Error ? error.message : error}`)
      }
    }

    if (generated > 0) {
      this.logger.log(`Despesas recorrentes geradas: ${generated}`)
    }
  }
}
