import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { NotificationsService } from './notifications.service'

const RECONCILIATION_INTERVAL_MS = 5 * 60_000

@Injectable()
export class WhatsAppOutboxReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppOutboxReconciliationJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly notifications: NotificationsService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch(error => this.logFailure(error)), RECONCILIATION_INTERVAL_MS)
    setTimeout(() => this.run().catch(error => this.logFailure(error)), 45_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(now = new Date()): Promise<number | undefined> {
    if (this.running) return undefined
    this.running = true
    try {
      return await this.lock.withLock(
        JOB_LOCK_KEYS.WHATSAPP_OUTBOX_RECONCILIATION,
        () => this.notifications.reconcileWhatsAppOutbox(now),
      )
    } finally {
      this.running = false
    }
  }

  private logFailure(error: unknown): void {
    this.logger.error(`Falha na reconciliacao da outbox: ${error instanceof Error ? error.message : error}`)
  }
}
