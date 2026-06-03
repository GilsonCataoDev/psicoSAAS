import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository, Between, In, Not } from 'typeorm'
import { randomUUID } from 'crypto'
import { Appointment } from './entities/appointment.entity'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { Booking } from '../booking/entities/booking.entity'
import { GoogleCalendarService } from '../google-calendar/google-calendar.service'
import { Patient } from '../patients/entities/patient.entity'

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    private dataSource: DataSource,
    private notifications: NotificationsService,
    private googleCalendar: GoogleCalendarService,
  ) {}

  findAll(psychologistId: string, dateFrom?: string, dateTo?: string) {
    const where: any = { psychologistId }
    if (dateFrom && dateTo) where.date = Between(dateFrom, dateTo)
    return this.repo.find({ where, relations: ['patient'], order: { date: 'ASC', time: 'ASC' } })
  }

  async findOne(id: string, psychologistId: string) {
    const appointment = await this.repo.findOne({ where: { id }, relations: ['patient'] })
    if (!appointment) throw new NotFoundException()
    if (appointment.psychologistId !== psychologistId) throw new ForbiddenException()
    return appointment
  }

  async create(dto: CreateAppointmentDto, psychologistId: string) {
    await this.assertPatientBelongsToPsychologist(dto.patientId, psychologistId)

    const dates = this.buildOccurrenceDates(dto.date, dto.recurrence, dto.repeatUntil)
    if (dates.length > 1) {
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
    const changedSlot = nextDate !== appointment.date || nextTime !== appointment.time

    if (changedSlot) {
      await this.assertSlotAvailable(psychologistId, nextDate, nextTime, id)
      appointment.isFixedScheduleException = true
      appointment.originalDate = appointment.originalDate ?? appointment.date
      appointment.originalTime = appointment.originalTime ?? appointment.time
    }

    Object.assign(appointment, dto)
    const saved = await this.repo.save(appointment)
    this.googleCalendar.syncAppointment(saved).catch(console.error)
    return this.findOne(saved.id, psychologistId)
  }

  async updateStatus(id: string, status: string, psychologistId: string) {
    const appointment = await this.findOne(id, psychologistId)
    appointment.status = status
    const saved = await this.repo.save(appointment)
    if (['cancelled', 'no_show'].includes(status)) {
      this.googleCalendar.deleteAppointment(saved).catch(console.error)
    } else {
      this.googleCalendar.syncAppointment(saved).catch(console.error)
    }
    return saved
  }

  async remove(id: string, psychologistId: string) {
    const appointment = await this.findOne(id, psychologistId)
    this.googleCalendar.deleteAppointment(appointment).catch(console.error)
    return this.repo.remove(appointment)
  }

  async updateGroup(recurringGroupId: string, fromDate: string, dto: UpdateGroupDto, psychologistId: string) {
    const all = await this.repo.find({ where: { recurringGroupId, psychologistId }, relations: ['patient'] })
    if (!all.length) throw new NotFoundException()
    const toUpdate = all.filter(a => a.date >= fromDate)
    for (const appt of toUpdate) Object.assign(appt, dto)
    const saved = await this.repo.save(toUpdate)
    for (const appt of saved) {
      this.googleCalendar.syncAppointment(appt).catch(console.error)
    }
    return { updated: toUpdate.length }
  }

  async removeGroup(recurringGroupId: string, fromDate: string, psychologistId: string) {
    const all = await this.repo.find({ where: { recurringGroupId, psychologistId }, relations: ['patient'] })
    if (!all.length) throw new NotFoundException()
    const toRemove = all.filter(a => a.date >= fromDate)
    for (const appt of toRemove) {
      this.googleCalendar.deleteAppointment(appt).catch(console.error)
    }
    await this.repo.remove(toRemove)
    return { removed: toRemove.length }
  }

  private async createOne(dto: CreateAppointmentDto, psychologistId: string, recurringGroupId?: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        ['appointment-slot', `${psychologistId}:${dto.date}:${dto.time}`],
      )

      await this.assertSlotAvailable(psychologistId, dto.date, dto.time)

      const appointment = manager.create(Appointment, {
        patientId: dto.patientId,
        date: dto.date,
        time: dto.time,
        duration: dto.duration,
        modality: dto.modality,
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

    this.notifications.scheduleReminder(saved).catch(console.error)
    this.googleCalendar.syncAppointment(saved).catch(console.error)
    return saved
  }

  private async assertSlotAvailable(
    psychologistId: string,
    date: string,
    time: string,
    ignoreAppointmentId?: string,
  ): Promise<void> {
    const appointmentWhere: any = {
      psychologistId,
      date,
      time,
      status: Not(In(['cancelled', 'no_show'])),
    }
    if (ignoreAppointmentId) appointmentWhere.id = Not(ignoreAppointmentId)

    const [appointmentConflict, bookingConflict] = await Promise.all([
      this.repo.findOne({ where: appointmentWhere }),
      this.bookings.findOne({
        where: {
          psychologistId,
          date,
          time,
          status: In(['pending', 'confirmed']),
        },
      }),
    ])

    if (appointmentConflict || bookingConflict) {
      throw new ConflictException('Este horario ja esta ocupado')
    }
  }

  private async assertPatientBelongsToPsychologist(patientId: string, psychologistId: string): Promise<void> {
    const patient = await this.patients.findOne({ where: { id: patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa nao encontrada')
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
