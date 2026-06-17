import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, Not, Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Appointment } from './entities/appointment.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { EmailService } from '../email/email.service'

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
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
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
      const now = new Date()
      const upcoming = await this.appointments.find({
        where: {
          date: Between(this.dateOnly(now), this.dateOnly(this.addDays(now, 2))),
          status: Not(In(['cancelled', 'no_show', 'completed'])),
        },
        relations: ['patient', 'psychologist'],
        order: { date: 'ASC', time: 'ASC' },
      })

      let sent = 0
      const planCache = new Map<string, boolean>()
      for (const appointment of upcoming) {
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
            }
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
          }
        }
      }

      if (sent > 0) {
        this.logger.log(`Enviados ${sent} lembrete(s) de sessao`)
      }
    } finally {
      this.running = false
    }
  }

  private appointmentStartsAt(appointment: Appointment): Date {
    const offset = this.config.get<string>('APPOINTMENT_TIMEZONE_OFFSET') ?? '-03:00'
    const time = String(appointment.time).slice(0, 5)
    return new Date(`${appointment.date}T${time}:00${offset}`)
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
