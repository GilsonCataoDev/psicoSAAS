import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { SalesService } from './sales.service'

const RELEASE_INTERVAL_MS = 60 * 60 * 1000
const INITIAL_DELAY_MS = 20 * 1000

@Injectable()
export class SalesCommissionReleaseJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SalesCommissionReleaseJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly sales: SalesService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(
      () => this.run().catch(err => this.logger.error('Falha ao liberar comissões', err)),
      RELEASE_INTERVAL_MS,
    )
    this.initialTimer = setTimeout(
      () => this.run().catch(err => this.logger.error('Falha na liberação inicial de comissões', err)),
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
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.SALES_COMMISSION_RELEASE, async () => {
        const released = await this.sales.releaseDueCommissions()
        if (released > 0) {
          this.logger.log(`${released} comissão(ões) liberada(s) para pagamento`)
        }
      })
    } finally {
      this.running = false
    }
  }
}
