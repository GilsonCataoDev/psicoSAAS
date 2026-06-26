import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ChurnService } from './churn.service'

const INTERVAL_MS = 24 * 60 * 60 * 1000   // once per day
const INITIAL_DELAY_MS = 60 * 1000         // 60s after boot

@Injectable()
export class ChurnScoreJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChurnScoreJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(private readonly churn: ChurnService) {}

  onModuleInit(): void {
    this.timer = setInterval(
      () => this.run().catch(err => this.logger.error('Falha no job de churn score', err)),
      INTERVAL_MS,
    )
    this.initialTimer = setTimeout(
      () => this.run().catch(err => this.logger.error('Falha na execução inicial do churn score', err)),
      INITIAL_DELAY_MS,
    )
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    const start = Date.now()
    try {
      const result = await this.churn.recalculateAll()
      const nudges = await this.churn.sendActivationNudges()
      const elapsed = Date.now() - start
      this.logger.log(`Churn scores recalculados: processed=${result.processed} errors=${result.errors} nudges=${JSON.stringify(nudges)} elapsed=${elapsed}ms`)
    } finally {
      this.running = false
    }
  }
}
