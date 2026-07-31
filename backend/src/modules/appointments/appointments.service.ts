import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { randomUUID } from 'crypto'
import { Appointment } from './entities/appointment.entity'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { Booking } from '../booking/entities/booking.entity'
import { GoogleCalendarService } from '../google-calendar/google-calendar.service'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { FinancialRecord } from '../financial/entities/financial-record.entity'
import { encrypt } from '../../common/crypto/encrypt.util'

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name)

  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    @InjectRepository(Session) private sessions: Repository<Session>,
    @InjectRepository(FinancialRecord) private financial: Repository<FinancialRecord>,
    private dataSource: DataSource,
    private notifications: NotificationsService,
    private googleCalendar: GoogleCalendarService,
  ) {}

  findAll(psychologistId: string, dateFrom?: string, dateTo?: string, patientId?: string) {
    const qb = this.repo.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('appointment.psychologistId = :psychologistId', { psychologistId })
      .orderBy('appointment.date', 'ASC')
      .addOrderBy('appointment.time', 'ASC')
      .select([
        'appointment.id',
        'appointment.date',
        'appointment.time',
        'appointment.duration',
        'appointment.status',
        'appointment.modality',
        'appointment.meetingUrl',
        'appointment.isRecurring',
        'appointment.recurringFrequency',
        'appointment.recurringGroupId',
        'appointment.isFixedScheduleException',
        'appointment.originalDate',
        'appointment.originalTime',
        'appointment.patientId',
        'appointment.psychologistId',
        'patient.id',
        'patient.name',
        'patient.phone',
        'patient.avatarColor',
      ])

    if (dateFrom && dateTo) {
      qb.andWhere('appointment.date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
    }
    if (patientId) {
      qb.andWhere('appointment.patientId = :patientId', { patientId })
    }

    return qb.getMany()
  }

  async findOne(id: string, psychologistId: string) {
    const appointment = await this.repo.findOne({
      where: { id, psychologistId }, // Retorna 404 também para registros de outro psicólogo.
      relations: ['patient'],
    })
    if (!appointment) throw new NotFoundException()
    return appointment
  }

  async create(dto: CreateAppointmentDto, psychologistId: string) {
    await this.assertPatientBelongsToPsychologist(dto.patientId, psychologistId)

    const dates = this.buildOccurrenceDates(dto.date, dto.recurrence, dto.repeatUntil)
    if (dates.length > 1) {
      for (const date of dates) {
        await this.assertSlotAvailable(psychologistId, date, dto.time, dto.duration)
      }
      const recurringGroupId = randomUUID()
      const saved: Appointment[] = []
      for (const date of dates) {
        saved.push(await this.createOne({ ...dto, date }, psychologistId, recurringGroupId))
      }
      return saved
    }

    return this.createOne(dto, psychologistId)
  }

  async update(id: string, dto: UpdateAppointmentDto, psychologistId: string) {
    const appointment = await this.findOne(id, psychologistId)
    const nextDate = dto.date ?? appointment.date
    const nextTime = dto.time ?? appointment.time
    const nextDuration = dto.duration ?? appointment.duration
    const changedSlot = nextDate !== appointment.date || nextTime !== appointment.time
      || nextDuration !== appointment.duration

    if (changedSlot) {
      await this.assertSlotAvailable(psychologistId, nextDate, nextTime, nextDuration, id)
      appointment.isFixedScheduleException = true
      appointment.originalDate = appointment.originalDate ?? appointment.date
      appointment.originalTime = appointment.originalTime ?? appointment.time
      this.resetReminderTracking(appointment)
    }

    if (dto.meetingUrl !== undefined) dto.meetingUrl = this.cleanMeetingUrl(dto.meetingUrl)
    const { autoVideoRoom = true, ...appointmentDto } = dto
    Object.assign(appointment, appointmentDto)
    if (appointment.modality === 'online' && !appointment.meetingUrl && autoVideoRoom) {
      appointment.meetingUrl = this.generateJitsiRoomUrl()
    }
    const saved = await this.repo.save(appointment)
    await this.syncLinkedBookingFromAppointment(saved)
    this.googleCalendar.syncAppointment(saved).catch(err => this.logCalendarError('sync', saved.id, err))
    return this.findOne(saved.id, psychologistId)
  }

  async updateStatus(id: string, status: string, psychologistId: string) {
    const appointment = await this.findOne(id, psychologistId)
    appointment.status = status
    const saved = await this.repo.save(appointment)
    await this.syncLinkedBookingStatus(saved, status)

    if (['cancelled', 'no_show'].includes(status)) {
      this.googleCalendar.deleteAppointment(saved, status === 'cancelled').catch(err => this.logCalendarError('delete', saved.id, err))
    } else {
      this.googleCalendar.syncAppointment(saved).catch(err => this.logCalendarError('sync', saved.id, err))
    }

    // Registra falta no prontuário automaticamente
    if (status === 'no_show') {
      await this.registerNoShowSession(saved, psychologistId)
    }

    return saved
  }

  private async registerNoShowSession(appointment: Appointment, psychologistId: string): Promise<void> {
    // Evita duplicata se já existe sessão vinculada a este agendamento
    const existing = await this.sessions.findOne({ where: { appointmentId: appointment.id } })
    if (existing) return

    await this.sessions.save(this.sessions.create({
      patientId:       appointment.patientId,
      psychologistId,
      date:            appointment.date,
      duration:        appointment.duration,
      appointmentId:   appointment.id,
      summary:         encrypt('Paciente não compareceu à sessão agendada.'),
      tags:            ['falta'],
      paymentStatus:   'waived',
    }))
  }

  async remove(id: string, psychologistId: string) {
    const appointment = await this.findOne(id, psychologistId)
    await this.syncLinkedBookingStatus(appointment, 'cancelled')
    this.googleCalendar.deleteAppointment(appointment).catch(err => this.logCalendarError('delete', appointment.id, err))
    return this.repo.remove(appointment)
  }

  async updateGroup(recurringGroupId: string, fromDate: string, dto: UpdateGroupDto, psychologistId: string) {
    const all = await this.repo.find({ where: { recurringGroupId, psychologistId }, relations: ['patient'] })
    if (!all.length) throw new NotFoundException()
    if (dto.meetingUrl !== undefined) dto.meetingUrl = this.cleanMeetingUrl(dto.meetingUrl)
    const { autoVideoRoom = true, ...groupDto } = dto
    const toUpdate = all.filter(a => a.date >= fromDate)
    for (const appt of toUpdate) {
      await this.assertSlotAvailable(
        psychologistId,
        appt.date,
        groupDto.time ?? appt.time,
        groupDto.duration ?? appt.duration,
        appt.id,
      )
    }
    for (const appt of toUpdate) {
      const changedSlot = (groupDto.time !== undefined && groupDto.time !== appt.time)
        || (groupDto.duration !== undefined && Number(groupDto.duration) !== Number(appt.duration))
      if (changedSlot) this.resetReminderTracking(appt)
      Object.assign(appt, groupDto)
      if (appt.modality === 'online' && !appt.meetingUrl && autoVideoRoom) {
        appt.meetingUrl = this.generateJitsiRoomUrl()
      }
    }
    const saved = await this.repo.save(toUpdate)
    for (const appt of saved) {
      await this.syncLinkedBookingFromAppointment(appt)
      this.googleCalendar.syncAppointment(appt).catch(err => this.logCalendarError('sync', appt.id, err))
    }
    return { updated: toUpdate.length }
  }

  async removeGroup(recurringGroupId: string, fromDate: string, psychologistId: string) {
    const all = await this.repo.find({ where: { recurringGroupId, psychologistId }, relations: ['patient'] })
    if (!all.length) throw new NotFoundException()
    const toRemove = all.filter(a => a.date >= fromDate)
    for (const appt of toRemove) {
      await this.syncLinkedBookingStatus(appt, 'cancelled')
      this.googleCalendar.deleteAppointment(appt).catch(err => this.logCalendarError('delete', appt.id, err))
    }
    await this.repo.remove(toRemove)
    return { removed: toRemove.length }
  }

  private async createOne(dto: CreateAppointmentDto, psychologistId: string, recurringGroupId?: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        ['appointment-day', `${psychologistId}:${dto.date}`],
      )

      await this.assertSlotAvailable(psychologistId, dto.date, dto.time, dto.duration)

      const appointment = manager.create(Appointment, {
        patientId: dto.patientId,
        date: dto.date,
        time: dto.time,
        duration: dto.duration,
        modality: dto.modality,
        meetingUrl: this.resolveMeetingUrl(dto.modality, dto.meetingUrl, dto.autoVideoRoom),
        notes: dto.notes,
        psychologistId,
        isRecurring: dto.recurrence === 'weekly' || dto.recurrence === 'biweekly',
        recurringFrequency: dto.recurrence && dto.recurrence !== 'none' ? dto.recurrence : undefined,
        recurringGroupId,
      })
      const saved = await manager.save(Appointment, appointment)
      return manager.findOneOrFail(Appointment, {
        where: { id: saved.id },
        relations: ['patient'],
      })
    })

    this.googleCalendar.syncAppointment(saved).catch(err => this.logCalendarError('sync', saved.id, err))
    return saved
  }

  private logCalendarError(action: 'sync' | 'delete', appointmentId: string, err: unknown): void {
    const message = err instanceof Error ? err.message : 'erro desconhecido'
    this.logger.warn(`google_calendar.${action}.failed appointmentId=${appointmentId} message=${message}`)
  }

  private resetReminderTracking(appointment: Appointment): void {
    appointment.reminder24hSentAt = null
    appointment.reminder2hSentAt = null
  }

  private async assertSlotAvailable(
    psychologistId: string,
    date: string,
    time: string,
    duration = 50,
    ignoreAppointmentId?: string,
  ): Promise<void> {
    const startMinute = this.timeToMinutes(time)
    const endMinute = startMinute + Number(duration || 50)

    const [appointmentConflict, bookingConflict] = await Promise.all([
      this.repo
        .createQueryBuilder('a')
        .where('a.psychologistId = :psychologistId', { psychologistId })
        .andWhere('a.date = :date', { date })
        .andWhere('a.status NOT IN (:...ignoredStatuses)', { ignoredStatuses: ['cancelled', 'no_show'] })
        .andWhere(ignoreAppointmentId ? 'a.id <> :ignoreAppointmentId' : '1=1', { ignoreAppointmentId })
        .andWhere('(EXTRACT(EPOCH FROM a.time::time) / 60) < :endMinute', { endMinute })
        .andWhere('((EXTRACT(EPOCH FROM a.time::time) / 60) + COALESCE(a.duration, 50)) > :startMinute', { startMinute })
        .getOne(),
      this.bookings
        .createQueryBuilder('b')
        .where('b.psychologistId = :psychologistId', { psychologistId })
        .andWhere('b.date = :date', { date })
        .andWhere('b.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
        .andWhere('(EXTRACT(EPOCH FROM b.time::time) / 60) < :endMinute', { endMinute })
        .andWhere('((EXTRACT(EPOCH FROM b.time::time) / 60) + COALESCE(b.duration, 50)) > :startMinute', { startMinute })
        .getOne(),
    ])

    if (appointmentConflict || bookingConflict) {
      throw new ConflictException('Este horario conflita com outro atendimento')
    }
  }

  private async assertPatientBelongsToPsychologist(patientId: string, psychologistId: string): Promise<void> {
    const patient = await this.patients.findOne({ where: { id: patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa nao encontrada')
  }

  private cleanMeetingUrl(value?: string): string | undefined {
    const trimmed = value?.trim()
    return trimmed || undefined
  }

  // Sala de video gerada automaticamente (Jitsi Meet, publico e gratuito) quando o
  // psicologo marca a sessao como online sem colar um link proprio (Zoom/Meet/Whereby).
  private generateJitsiRoomUrl(): string {
    return `https://meet.jit.si/UseCognia-${randomUUID().replace(/-/g, '')}`
  }

  private resolveMeetingUrl(
    modality: string | undefined,
    meetingUrl: string | undefined,
    autoVideoRoom = true,
  ): string | undefined {
    const cleaned = this.cleanMeetingUrl(meetingUrl)
    if (cleaned) return cleaned
    return modality === 'online' && autoVideoRoom ? this.generateJitsiRoomUrl() : undefined
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
    return (hours * 60) + (minutes || 0)
  }

  private async findLinkedBooking(appointment: Appointment): Promise<Booking | null> {
    return this.bookings.findOne({
      where: {
        appointmentId: appointment.id,
        psychologistId: appointment.psychologistId,
      },
    })
  }

  private async syncLinkedBookingFromAppointment(appointment: Appointment): Promise<void> {
    const booking = await this.findLinkedBooking(appointment)
    if (!booking || booking.status === 'cancelled') return

    booking.date = appointment.date
    booking.time = appointment.time
    booking.duration = appointment.duration
    booking.modality = appointment.modality === 'presencial' ? 'presencial' : 'online'
    await this.bookings.save(booking)

    await this.financial.update(
      [
        { appointmentId: appointment.id, psychologistId: appointment.psychologistId },
        { sessionId: appointment.id, psychologistId: appointment.psychologistId },
      ] as any,
      { dueDate: appointment.date },
    )
  }

  private async syncLinkedBookingStatus(appointment: Appointment, status: string): Promise<void> {
    const booking = await this.findLinkedBooking(appointment)
    if (!booking) return

    if (status === 'cancelled' || status === 'no_show' || status === 'completed') {
      booking.status = status as Booking['status']
      if (status === 'cancelled') booking.cancelledAt = new Date()
      await this.bookings.save(booking)
    }
  }

  private buildOccurrenceDates(date: string, recurrence?: string, repeatUntil?: string): string[] {
    if (recurrence !== 'weekly' && recurrence !== 'biweekly') return [date]

    const start = new Date(`${date}T00:00:00`)
    const end = repeatUntil ? new Date(`${repeatUntil}T00:00:00`) : new Date(start)
    if (!repeatUntil) end.setMonth(end.getMonth() + 3)

    const stepDays = recurrence === 'biweekly' ? 14 : 7
    const dates: string[] = []
    const cursor = new Date(start)

    while (cursor <= end && dates.length < 52) {
      dates.push(cursor.toISOString().slice(0, 10))
      cursor.setDate(cursor.getDate() + stepDays)
    }

    return dates
  }
}
