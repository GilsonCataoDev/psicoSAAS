import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ProspectingService } from '../prospecting.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../../common/advisory-lock/advisory-lock.service'

const INTERVAL_MS = 60 * 60 * 1000 // 1h
const INITIAL_DELAY_MS = 300 * 1000

/**
 * Calcula e registra as métricas de prospecção (buscas, descobertos,
 * analisados, qualificados, aprovados, contatados etc.) para observabilidade.
 * Só roda se PROSPECTING_ENABLED=true; os dados também ficam disponíveis sob
 * demanda via GET /admin/prospecting/metrics.
 */
@Injectable()
export class CalculateProspectingMetricsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CalculateProspectingMetricsJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly svc: ProspectingService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (process.env.PROSPECTING_ENABLED !== 'true') return
    this.timer = setInterval(() => this.run().catch(err => this.logger.error('Falha no job calculateProspectingMetrics', err)), INTERVAL_MS)
    this.initialTimer = setTimeout(() => this.run().catch(err => this.logger.error('Falha na execução inicial de calculateProspectingMetrics', err)), INITIAL_DELAY_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PROSPECTING_METRICS, async () => {
        const metrics = await this.svc.metrics()
        this.logger.log(`calculateProspectingMetrics ${JSON.stringify(metrics)}`)
      })
    } finally {
      this.running = false
    }
  }
}
