import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ProspectingService } from '../prospecting.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../../common/advisory-lock/advisory-lock.service'

const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24h
const INITIAL_DELAY_MS = 240 * 1000

/**
 * Expira leads não utilizados após PROSPECTING_RETENTION_DAYS (LGPD): remove
 * dados pessoais e mantém apenas hash mínimo do domínio. Só roda se
 * PROSPECTING_ENABLED=true.
 */
@Injectable()
export class ExpireOldProspectsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpireOldProspectsJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly svc: ProspectingService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (process.env.PROSPECTING_ENABLED !== 'true') return
    this.timer = setInterval(() => this.run().catch(err => this.logger.error('Falha no job expireOldProspects', err)), INTERVAL_MS)
    this.initialTimer = setTimeout(() => this.run().catch(err => this.logger.error('Falha na execução inicial de expireOldProspects', err)), INITIAL_DELAY_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PROSPECTING_EXPIRE, async () => {
        const { expired } = await this.svc.expireOldProspects()
        this.logger.log(`expireOldProspects expired=${expired}`)
      })
    } finally {
      this.running = false
    }
  }
}
