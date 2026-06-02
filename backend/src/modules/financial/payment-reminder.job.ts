import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThanOrEqual, Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { NotificationsService } from '../notifications/notifications.service'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const OVERDUE_AFTER_DAYS = 3

@Injectable()
export class PaymentReminderJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReminderJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(FinancialRecord)
    private readonly records: Repository<FinancialRecord>,
    private readonly notifications: NotificationsService,
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
      const cutoff = this.cutoffDate()
      const overdue = await this.records.find({
        where: {
          type: 'income',
          status: 'pending',
          dueDate: LessThanOrEqual(cutoff),
        },
        relations: ['patient', 'psychologist'],
      })

      for (const record of overdue) {
        const prefs = (record.psychologist?.preferences ?? {}) as Record<string, any>

        if (prefs.lateReminder !== false && record.patient?.phone) {
          await this.notifications.sendLatePaymentReminder(
            record.patient,
            Number(record.amount),
            prefs.pixKey,
          )
        }

        record.status = 'overdue'
        await this.records.save(record)
      }

      if (overdue.length > 0) {
        this.logger.log(`Processadas ${overdue.length} cobranca(s) em atraso`)
      }
    } finally {
      this.running = false
    }
  }

  private cutoffDate(): string {
    const date = new Date()
    date.setDate(date.getDate() - OVERDUE_AFTER_DAYS)
    return date.toISOString().slice(0, 10)
  }
}
