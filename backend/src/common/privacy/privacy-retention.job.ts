import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../advisory-lock/advisory-lock.service'
import { EmailLog } from '../../modules/email/entities/email-log.entity'
import { LoginAttempt } from '../../modules/auth/entities/login-attempt.entity'
import { AuditLog } from '../../modules/audit/entities/audit-log.entity'
import { BookingContactMemory } from '../../modules/booking/entities/booking-contact-memory.entity'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class PrivacyRetentionJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrivacyRetentionJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(EmailLog) private readonly emailLogs: Repository<EmailLog>,
    @InjectRepository(LoginAttempt) private readonly loginAttempts: Repository<LoginAttempt>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(BookingContactMemory) private readonly contactMemories: Repository<BookingContactMemory>,
    private readonly lock: AdvisoryLockService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch(error => this.logger.error(error)), DAY_MS)
    setTimeout(() => this.run().catch(error => this.logger.error(error)), 45_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(now = new Date()): Promise<number | undefined> {
    if (this.running) return undefined
    this.running = true
    try {
      return await this.lock.withLock(JOB_LOCK_KEYS.PRIVACY_RETENTION, async () => {
        const [email, login, audit, memories] = await Promise.all([
          this.emailLogs.delete({ createdAt: LessThan(new Date(now.getTime() - 30 * DAY_MS)) }),
          this.loginAttempts.delete({ updatedAt: LessThan(new Date(now.getTime() - 90 * DAY_MS)) }),
          this.auditLogs.delete({ createdAt: LessThan(new Date(now.getTime() - 180 * DAY_MS)) }),
          this.contactMemories.delete({ expiresAt: LessThan(now) }),
        ])
        const removed = [email, login, audit, memories]
          .reduce((total, result) => total + (result.affected ?? 0), 0)
        if (removed) this.logger.log(`Registros expirados removidos count=${removed}`)
        return removed
      })
    } finally {
      this.running = false
    }
  }
}
