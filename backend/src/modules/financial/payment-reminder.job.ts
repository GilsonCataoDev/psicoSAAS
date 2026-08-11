import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, LessThanOrEqual, Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { Patient } from '../patients/entities/patient.entity'
import { FinancialService } from './financial.service'
import { HeartbeatService } from '../../common/monitoring/heartbeat.service'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const OVERDUE_AFTER_DAYS = 3
const REMINDER_INTERVAL_DAYS = 7

@Injectable()
export class PaymentReminderJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReminderJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(FinancialRecord)
    private readonly records: Repository<FinancialRecord>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    private readonly financial: FinancialService,
    private readonly notifications: NotificationsService,
    private readonly lock: AdvisoryLockService,
    private readonly heartbeat: HeartbeatService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), SIX_HOURS_MS)
    setTimeout(() => this.run().catch((err) => this.logger.error(err)), 10_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.PAYMENT_REMINDER, () => this.runLocked())
      this.heartbeat.ping('BETTERSTACK_HEARTBEAT_PAYMENT_URL')
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
    const monthlyPatients = await this.patients.find({
      where: { status: 'active', billingType: 'monthly_package' },
    })
    for (const patient of monthlyPatients) {
      await this.financial.ensureMonthlyPackageCharge(patient, new Date()).catch((error: unknown) => {
        this.logger.warn(`Pacote mensal nao gerado para paciente ${patient.id}: ${error instanceof Error ? error.message : error}`)
      })
    }

    const cutoff = this.cutoffDate()
    const reminderCutoff = this.reminderIntervalDate()
    const pendingAndOverdue = await this.records.find({
      where: [
        { type: 'income', status: 'pending', dueDate: LessThanOrEqual(cutoff) },
        { type: 'income', status: 'overdue', dueDate: LessThanOrEqual(cutoff), lastReminderSentAt: IsNull() },
        { type: 'income', status: 'overdue', dueDate: LessThanOrEqual(cutoff), lastReminderSentAt: LessThanOrEqual(reminderCutoff) },
      ],
      relations: ['patient', 'psychologist'],
    })

    const whatsappAccess = new Map<string, Promise<boolean>>()
    const notifiedPatients = new Set<string>()

    for (const record of pendingAndOverdue) {
      const prefs = (record.psychologist?.preferences ?? {}) as Record<string, any>
      let access = whatsappAccess.get(record.psychologistId)
      if (!access) {
        access = this.notifications.canUseWhatsAppAutomation(record.psychologistId)
        whatsappAccess.set(record.psychologistId, access)
      }
      const canUseWhatsApp = await access
      const patientId = record.patientId ?? record.patient?.id

      if (canUseWhatsApp && prefs.lateReminder !== false && record.patient?.phone && patientId) {
        if (!notifiedPatients.has(patientId)) {
          const result = await this.notifications.sendLatePaymentReminder(
            record.patient,
            Number(record.amount),
            prefs.pixKey,
            typeof prefs.lateReminderTemplate === 'string' ? prefs.lateReminderTemplate : undefined,
          )
          if (result.sent) {
            record.lastReminderSentAt = this.todayBR()
            notifiedPatients.add(patientId)
          } else {
            this.logger.warn(`Lembrete de atraso nao enviado para financeiro ${record.id}: ${result.error ?? 'erro desconhecido'}`)
          }
        }
      }

      record.status = 'overdue'
    }

    if (pendingAndOverdue.length > 0) {
      await this.records.save(pendingAndOverdue)
      this.logger.log(`Processadas ${pendingAndOverdue.length} cobranca(s) em atraso`)
    }
  }

  private todayBR(): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  }

  private cutoffDate(): string {
    const d = new Date()
    d.setDate(d.getDate() - OVERDUE_AFTER_DAYS)
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d)
  }

  private reminderIntervalDate(): string {
    const d = new Date()
    d.setDate(d.getDate() - REMINDER_INTERVAL_DAYS)
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d)
  }
}
