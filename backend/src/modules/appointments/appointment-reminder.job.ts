import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, Not, Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Appointment } from './entities/appointment.entity'
import { NotificationsService, WhatsAppDeliveryResult, PushDeliveryResult } from '../notifications/notifications.service'
import { EmailService } from '../email/email.service'
import { User } from '../auth/entities/user.entity'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'
import { HeartbeatService } from '../../common/monitoring/heartbeat.service'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class AppointmentReminderJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentReminderJob.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly lock: AdvisoryLockService,
    private readonly heartbeat: HeartbeatService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.run().catch((err) => this.logger.error(err)), FIFTEEN_MINUTES_MS)
    setTimeout(() => this.run().catch((err) => this.logger.error(err)), 20_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async run(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.APPOINTMENT_REMINDER, () => this.runLocked())
      this.heartbeat.ping('BETTERSTACK_HEARTBEAT_REMINDER_URL')
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
    const now = new Date()
    const upcoming = await this.appointments.find({
      where: {
        date: Between(this.dateOnly(now), this.dateOnly(this.addDays(now, 2))),
        status: Not(In(['cancelled', 'no_show', 'completed'])),
      },
      relations: ['patient', 'psychologist'],
      order: { date: 'ASC', time: 'ASC' },
    })

    await this.sendDailyAgendaDigests(upcoming, now)

    let sent = 0
    const planCache = new Map<string, boolean>()
    for (const appointment of upcoming) {
      if (this.email.isRateLimited()) {
        this.logger.warn(
          `Lembretes por e-mail pausados por limite do provedor. Retry em ${Math.ceil(this.email.getRateLimitRetryAfterMs() / 1000)}s.`,
        )
        break
      }

      const prefs = (appointment.psychologist?.preferences ?? {}) as Record<string, any>
      const startsAt = this.appointmentStartsAt(appointment)
      const diff = startsAt.getTime() - now.getTime()

      if (!planCache.has(appointment.psychologistId)) {
        planCache.set(appointment.psychologistId, await this.notifications.canUseWhatsAppAutomation(appointment.psychologistId))
      }
      const canUseWhatsApp = planCache.get(appointment.psychologistId)!

      if (!appointment.reminder24hSentAt && prefs.reminder24h !== false && diff <= DAY_MS && diff > TWO_HOURS_MS) {
        const result = canUseWhatsApp
          ? await this.notifications.sendAppointmentReminder(appointment, '24h')
          : await this.notifications.sendAppointmentPushReminder(appointment, '24h')
        const delivered = Number(result.sent) > 0
        if (delivered) {
          appointment.reminder24hSentAt = new Date()
          await this.appointments.save(appointment)
          sent++
        } else if (appointment.patient?.email) {
          try {
            const psychologistName = (appointment.psychologist as any)?.name ?? 'seu psicólogo(a)'
            await this.email.sendSessionReminder({
              patientName: appointment.patient.name,
              patientEmail: appointment.patient.email,
              date: appointment.date,
              time: appointment.time,
              psychologistName,
            })
            appointment.reminder24hSentAt = new Date()
            await this.appointments.save(appointment)
            sent++
          } catch (err: any) {
            this.logger.warn(`Falha ao enviar lembrete por e-mail para appointment ${appointment.id}: ${err?.message}`)
            if (this.email.isRateLimited()) break
          }
        } else if (this.shouldStopRetrying(result)) {
          appointment.reminder24hSentAt = new Date()
          await this.appointments.save(appointment)
          this.logger.warn(`Lembrete 24h marcado como processado apos falha nao retentavel: appointment ${appointment.id}`)
        }
      }

      if (!appointment.reminder2hSentAt && prefs.reminder2h !== false && diff <= TWO_HOURS_MS && diff > 0) {
        const result = canUseWhatsApp
          ? await this.notifications.sendAppointmentReminder(appointment, '2h')
          : await this.notifications.sendAppointmentPushReminder(appointment, '2h')
        const delivered = Number(result.sent) > 0
        if (delivered) {
          appointment.reminder2hSentAt = new Date()
          await this.appointments.save(appointment)
          sent++
        } else if (appointment.patient?.email) {
          try {
            const psychologistName = (appointment.psychologist as any)?.name ?? 'seu psicólogo(a)'
            await this.email.sendSessionReminder({
              patientName: appointment.patient.name,
              patientEmail: appointment.patient.email,
              date: appointment.date,
              time: appointment.time,
              psychologistName,
            })
            appointment.reminder2hSentAt = new Date()
            await this.appointments.save(appointment)
            sent++
          } catch (err: any) {
            this.logger.warn(`Falha ao enviar lembrete 2h por e-mail para appointment ${appointment.id}: ${err?.message}`)
            if (this.email.isRateLimited()) break
          }
        } else if (this.shouldStopRetrying(result)) {
          appointment.reminder2hSentAt = new Date()
          await this.appointments.save(appointment)
          this.logger.warn(`Lembrete 2h marcado como processado apos falha nao retentavel: appointment ${appointment.id}`)
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`Enviados ${sent} lembrete(s) de sessao`)
    }
  }

  private appointmentStartsAt(appointment: Appointment): Date {
    const offset = this.config.get<string>('APPOINTMENT_TIMEZONE_OFFSET') ?? '-03:00'
    const time = String(appointment.time).slice(0, 5)
    return new Date(`${appointment.date}T${time}:00${offset}`)
  }

  private shouldStopRetrying(result: WhatsAppDeliveryResult | PushDeliveryResult): boolean {
    return 'nonRetryable' in result && result.nonRetryable === true
  }

  private async sendDailyAgendaDigests(upcoming: Appointment[], now: Date): Promise<void> {
    const currentHour = this.localHour(now)
    if (currentHour < 6) return

    const today = this.dateOnly(now)
    const byPsychologist = new Map<string, Appointment[]>()
    for (const appointment of upcoming) {
      if (appointment.date !== today || !appointment.psychologistId) continue
      const list = byPsychologist.get(appointment.psychologistId) ?? []
      list.push(appointment)
      byPsychologist.set(appointment.psychologistId, list)
    }

    for (const [psychologistId, appointments] of byPsychologist) {
      const psychologist = appointments[0]?.psychologist
      if (!psychologist) continue
      const prefs = (psychologist.preferences ?? {}) as Record<string, any>
      if (prefs.dailyAgendaDigest !== true) continue
      if (prefs.dailyAgendaDigestLastSentDate === today) continue

      const targetPhone = String(prefs.whatsapp || psychologist.phone || '').replace(/\D/g, '')
      if (!targetPhone) continue

      const message = this.buildDailyAgendaDigestMessage(psychologist, appointments)
      const result = await this.notifications.sendDailyAgendaDigest(psychologistId, targetPhone, message)

      if (!result.sent) {
        this.logger.warn(`Resumo diario da agenda nao enviado para user ${psychologistId}: ${result.error ?? result.reason}`)
        if (!result.nonRetryable) continue
      }

      psychologist.preferences = {
        ...prefs,
        dailyAgendaDigestLastSentDate: today,
      }
      await this.users.save(psychologist)
    }
  }

  private buildDailyAgendaDigestMessage(psychologist: User, appointments: Appointment[]): string {
    const firstName = psychologist.name?.split(' ')[0] || 'Psi'
    const ordered = [...appointments].sort((a, b) => String(a.time).localeCompare(String(b.time)))
    const lines = ordered.map((appointment) => {
      const time = String(appointment.time).slice(0, 5)
      const patientName = appointment.patient?.name ?? 'Paciente'
      const modality = appointment.modality ? ` - ${appointment.modality}` : ''
      return `${time} - ${patientName}${modality}`
    })

    return [
      `Bom dia, ${firstName}.`,
      '',
      `Sua agenda de hoje tem ${ordered.length} ${ordered.length === 1 ? 'sessao' : 'sessoes'}:`,
      ...lines,
      '',
      'Bom atendimento.',
    ].join('\n')
  }

  private localHour(date: Date): number {
    const timeZone = this.config.get<string>('GOOGLE_CALENDAR_TIMEZONE') ?? 'America/Sao_Paulo'
    const hour = new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    }).format(date)
    return Number(hour)
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
  }

  private dateOnly(date: Date): string {
    const timeZone = this.config.get<string>('GOOGLE_CALENDAR_TIMEZONE') ?? 'America/Sao_Paulo'
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  }
}
