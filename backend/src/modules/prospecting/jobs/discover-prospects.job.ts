import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ProspectingService } from '../prospecting.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../../common/advisory-lock/advisory-lock.service'

const INTERVAL_MS = 60 * 60 * 1000 // 1h
const INITIAL_DELAY_MS = 90 * 1000

/**
 * Recupera buscas (`ProspectingSearch`) que ficaram presas em "running" por um
 * processo reiniciado no meio da execução, marcando-as como erro para nova
 * tentativa manual pelo administrador. Não dispara novas buscas por conta
 * própria — descoberta é sempre iniciada por ação humana no painel.
 * Só roda se PROSPECTING_ENABLED=true; nunca habilitado por padrão.
 */
@Injectable()
export class DiscoverProspectsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscoverProspectsJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly svc: ProspectingService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (process.env.PROSPECTING_ENABLED !== 'true') return
    this.timer = setInterval(() => this.run().catch(err => this.logger.error('Falha no job discoverProspects', err)), INTERVAL_MS)
    this.initialTimer = setTimeout(() => this.run().catch(err => this.logger.error('Falha na execução inicial de discoverProspects', err)), INITIAL_DELAY_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PROSPECTING_DISCOVER, async () => {
        const { recovered } = await this.svc.recoverStaleSearches()
        this.logger.log(`discoverProspects recovered=${recovered}`)
      })
    } finally {
      this.running = false
    }
  }
}
