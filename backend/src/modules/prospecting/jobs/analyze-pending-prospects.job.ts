import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ProspectingService } from '../prospecting.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../../common/advisory-lock/advisory-lock.service'

const INTERVAL_MS = 30 * 60 * 1000 // 30min
const INITIAL_DELAY_MS = 120 * 1000
const BATCH_SIZE = 20

/**
 * Analisa prospects com status "discovered" ainda não processados, aplicando
 * o crawler (só sites próprios, com robots.txt/SSRF/rate-limit) e os
 * detectores de sinais. Só roda se PROSPECTING_ENABLED=true.
 */
@Injectable()
export class AnalyzePendingProspectsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyzePendingProspectsJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly svc: ProspectingService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (process.env.PROSPECTING_ENABLED !== 'true') return
    // PROSPECTING_CRON_EXTERNAL=true: job roda via Railway Cron Service
    // separado (node dist/cron-prospecting.js analyze) em vez de setInterval
    // no processo sempre-ativo da API. Ver docs/RAILWAY_CRON_PROSPECTING.md.
    if (process.env.PROSPECTING_CRON_EXTERNAL === 'true') return
    this.timer = setInterval(() => this.run().catch(err => this.logger.error('Falha no job analyzePendingProspects', err)), INTERVAL_MS)
    this.initialTimer = setTimeout(() => this.run().catch(err => this.logger.error('Falha na execução inicial de analyzePendingProspects', err)), INITIAL_DELAY_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PROSPECTING_ANALYZE, async () => {
        const result = await this.svc.analyzeBatch(['discovered'], BATCH_SIZE)
        this.logger.log(`analyzePendingProspects processed=${result.processed} errors=${result.errors}`)
      })
    } finally {
      this.running = false
    }
  }
}
