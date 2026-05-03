import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Repository, Between, In, Not } from 'typeorm'
import { Appointment } from './entities/appointment.entity'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { Booking } from '../booking/entities/booking.entity'

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    private dataSource: DataSource,
    private notifications: NotificationsService,
  ) {}

  findAll(psychologistId: string, dateFrom?: string, dateTo?: string) {
    const where: any = { psychologistId }
    if (dateFrom && dateTo) where.date = Between(dateFrom, dateTo)
    return this.repo.find({ where, relations: ['patient'], order: { date: 'ASC', time: 'ASC' } })
  }

  async findOne(id: string, psychologistId: string) {
    const a = await this.repo.findOne({ where: { id }, relations: ['patient'] })
    if (!a) throw new NotFoundException()
    if (a.psychologistId !== psychologistId) throw new ForbiddenException()
    return a
  }

  async create(dto: CreateAppointmentDto, psychologistId: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        ['appointment-slot', `${psychologistId}:${dto.date}:${dto.time}`],
      )

      const [appointmentConflict, bookingConflict] = await Promise.all([
        manager.findOne(Appointment, {
          where: {
            psychologistId,
            date: dto.date,
            time: dto.time,
            status: Not(In(['cancelled', 'no_show'])),
          },
        }),
        manager.findOne(Booking, {
          where: {
            psychologistId,
            date: dto.date,
            time: dto.time,
            status: In(['pending', 'confirmed']),
          },
        }),
      ])
      if (appointmentConflict || bookingConflict) {
        throw new ConflictException('Este horario ja esta ocupado')
      }

      const appointment = manager.create(Appointment, { ...dto, psychologistId })
      const saved = await manager.save(Appointment, appointment)
      return manager.findOneOrFail(Appointment, {
        where: { id: saved.id },
        relations: ['patient'],
      })
    })

    // Schedule reminder notifications (fire-and-forget)
    this.notifications.scheduleReminder(saved).catch(console.error)
    return saved
  }

  async updateStatus(id: string, status: string, psychologistId: string) {
    const a = await this.findOne(id, psychologistId)
    a.status = status
    return this.repo.save(a)
  }

  async remove(id: string, psychologistId: string) {
    const a = await this.findOne(id, psychologistId)
    return this.repo.remove(a)
  }
}
