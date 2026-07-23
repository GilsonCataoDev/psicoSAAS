import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThanOrEqual, Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { HeartbeatService } from '../../common/monitoring/heartbeat.service'

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
    private readonly lock: AdvisoryLockService,
    private readonly heartbeat: HeartbeatService,
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
      await this.lock.withLock(JOB_LOCK_KEYS.PAYMENT_REMINDER, () => this.runLocked())
      this.heartbeat.ping('BETTERSTACK_HEARTBEAT_PAYMENT_URL')
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
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
      const canUseWhatsApp = await this.notifications.canUseWhatsAppAutomation(record.psychologistId)

      if (canUseWhatsApp && prefs.lateReminder !== false && record.patient?.phone) {
        const result = await this.notifications.sendLatePaymentReminder(
          record.patient,
          Number(record.amount),
          prefs.pixKey,
        )
        if (!result.sent) {
          this.logger.warn(`Lembrete de atraso nao enviado para financeiro ${record.id}: ${result.error ?? 'erro desconhecido'}`)
        }
      }

      record.status = 'overdue'
      await this.records.save(record)
    }

    if (overdue.length > 0) {
      this.logger.log(`Processadas ${overdue.length} cobranca(s) em atraso`)
    }
  }

  private cutoffDate(): string {
    const date = new Date()
    date.setDate(date.getDate() - OVERDUE_AFTER_DAYS)
    return date.toISOString().slice(0, 10)
  }
}
