import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThanOrEqual, Repository } from 'typeorm'
import { ProspectConversation } from '../entities/prospect-conversation.entity'
import { ProspectingMessageService } from '../messages/prospecting-message.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../../common/advisory-lock/advisory-lock.service'

const INTERVAL_MS = 60 * 60 * 1000 // 1h
const INITIAL_DELAY_MS = 2 * 60 * 1000 // 2min

@Injectable()
export class SendScheduledFollowupsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SendScheduledFollowupsJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(ProspectConversation)
    private readonly conversations: Repository<ProspectConversation>,
    private readonly messageSvc: ProspectingMessageService,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    if (process.env.PROSPECTING_OUTREACH_ENABLED !== 'true') return
    this.logger.log('SendScheduledFollowupsJob iniciado (PROSPECTING_OUTREACH_ENABLED=true)')

    this.timer = setInterval(() => this.run().catch(err => this.logger.error('SendScheduledFollowupsJob falha', err)), INTERVAL_MS)
    this.initialTimer = setTimeout(() => this.run().catch(err => this.logger.error('SendScheduledFollowupsJob falha inicial', err)), INITIAL_DELAY_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PROSPECTING_FOLLOWUPS, async () => {
        const sent = await this.processFollowups()
        this.logger.log(`send_scheduled_followups sent=${sent}`)
      })
    } finally {
      this.running = false
    }
  }

  private async processFollowups(): Promise<number> {
    const maxFollowups = Number(process.env.PROSPECTING_MAX_FOLLOWUPS ?? 3)
    const dailyLimit = Number(process.env.PROSPECTING_DAILY_LIMIT ?? 50)
    const quietHours = process.env.PROSPECTING_QUIET_HOURS ?? '09:00-18:00'
    const timezone = process.env.PROSPECTING_TIMEZONE ?? 'America/Sao_Paulo'

    if (!this.isWithinQuietHours(quietHours, timezone)) {
      this.logger.debug('followups_outside_quiet_hours skipping')
      return 0
    }

    let sent = 0
    const conversations = await this.conversations.find({
      where: {
        status: 'approved',
        nextFollowUpAt: LessThanOrEqual(new Date()),
      },
      relations: ['prospect', 'messages'],
      take: dailyLimit,
    })

    for (const conv of conversations) {
      if (sent >= dailyLimit) break
      if (!conv.prospect) continue

      if (conv.followUpCount >= maxFollowups) {
        conv.status = 'closed'
        await this.conversations.save(conv)
        this.logger.debug(`followup_max_reached conversationId=${conv.id}`)
        continue
      }

      try {
        const draftContent = this.generateFollowupContent(conv.followUpCount)
        const message = await this.messageSvc.createDraft(conv.id, draftContent, false, null)
        await this.messageSvc.approve(message.id, null as any, 'Auto-approved follow-up')

        const nextFollowupDays = [3, 7][conv.followUpCount] ?? 7
        conv.nextFollowUpAt = new Date(Date.now() + nextFollowupDays * 24 * 60 * 60 * 1000)
        conv.followUpCount += 1
        await this.conversations.save(conv)

        sent += 1
        this.logger.debug(`followup_created conversationId=${conv.id} followUpCount=${conv.followUpCount}`)
      } catch (err) {
        this.logger.warn(`followup_failed conversationId=${conv.id} error=${err instanceof Error ? err.message : err}`)
      }
    }

    return sent
  }

  private isWithinQuietHours(quietHours: string, timezone: string): boolean {
    try {
      const [start, end] = quietHours.split('-')
      const [startHour, startMin] = start.split(':').map(Number)
      const [endHour, endMin] = end.split(':').map(Number)

      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date())
      const currentHour = Number(parts.find(part => part.type === 'hour')?.value ?? 0)
      const currentMin = Number(parts.find(part => part.type === 'minute')?.value ?? 0)
      const currentTime = currentHour * 60 + currentMin

      const startTime = startHour * 60 + startMin
      const endTime = endHour * 60 + endMin

      return currentTime >= startTime && currentTime < endTime
    } catch {
      this.logger.warn(`quiet_hours_parse_failed usando padrão`)
      return true
    }
  }

  private generateFollowupContent(followupIndex: number): string {
    const names = ['', 'Seguindo', 'Ainda disponível']
    const prefix = names[followupIndex] || 'Alguém aí?'

    return `${prefix}:\n\nVocê recebeu nossa mensagem anterior? A ferramenta gratuita da UseCognia continua disponível para avaliação — sem compromisso.\n\nSe preferir não receber mais contatos, é só responder que prefere sair da lista.`
  }
}

// Import JOB_LOCK_KEYS from advisory lock service - add to existing imports if needed
