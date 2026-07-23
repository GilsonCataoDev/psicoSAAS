import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ProspectingService } from '../prospecting.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../../common/advisory-lock/advisory-lock.service'

const INTERVAL_MS = 6 * 60 * 60 * 1000 // 6h
const INITIAL_DELAY_MS = 180 * 1000
const BATCH_SIZE = 10

/**
 * Tenta reanalisar prospects que ficaram com status "error" (ex: timeout de
 * crawling, robots.txt indisponível). Só roda se PROSPECTING_ENABLED=true.
 */
@Injectable()
export class RetryFailedAnalysesJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetryFailedAnalysesJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly svc: ProspectingService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (process.env.PROSPECTING_ENABLED !== 'true') return
    this.timer = setInterval(() => this.run().catch(err => this.logger.error('Falha no job retryFailedAnalyses', err)), INTERVAL_MS)
    this.initialTimer = setTimeout(() => this.run().catch(err => this.logger.error('Falha na execução inicial de retryFailedAnalyses', err)), INITIAL_DELAY_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PROSPECTING_RETRY, async () => {
        const result = await this.svc.analyzeBatch(['error'], BATCH_SIZE)
        this.logger.log(`retryFailedAnalyses processed=${result.processed} errors=${result.errors}`)
      })
    } finally {
      this.running = false
    }
  }
}
