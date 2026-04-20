import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { Appointment } from './entities/appointment.entity'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
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
    const appointment = this.repo.create({ ...dto, psychologistId })
    const saved = await this.repo.save(appointment)
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
