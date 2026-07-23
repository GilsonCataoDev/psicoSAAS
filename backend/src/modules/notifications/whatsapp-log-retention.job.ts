import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { WhatsAppDeliveryLog } from './entities/whatsapp-delivery-log.entity'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'

const DAY_MS = 24 * 60 * 60 * 1000
const RETENTION_DAYS = 7

@Injectable()
export class WhatsAppLogRetentionJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppLogRetentionJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(WhatsAppDeliveryLog)
    private readonly logs: Repository<WhatsAppDeliveryLog>,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch(err => this.logger.error(err)), DAY_MS)
    setTimeout(() => this.run().catch(err => this.logger.error(err)), 30_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(now = new Date()): Promise<number | undefined> {
    if (this.running) return undefined
    this.running = true
    try {
      return await this.lock.withLock(JOB_LOCK_KEYS.WHATSAPP_LOG_RETENTION, () => this.runLocked(now))
    } finally {
      this.running = false
    }
  }

  private async runLocked(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS)
    const result = await this.logs.delete({ createdAt: LessThan(cutoff) })
    const removed = result.affected ?? 0
    if (removed > 0) this.logger.log(`Logs de WhatsApp expirados removidos count=${removed}`)
    return removed
  }
}
