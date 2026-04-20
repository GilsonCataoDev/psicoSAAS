import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Session } from './entities/session.entity'
import { CreateSessionDto } from './dto/create-session.dto'

@Injectable()
export class SessionsService {
  constructor(@InjectRepository(Session) private repo: Repository<Session>) {}

  findAll(psychologistId: string, patientId?: string) {
    const where: any = { psychologistId }
    if (patientId) where.patientId = patientId
    return this.repo.find({ where, relations: ['patient'], order: { date: 'DESC' } })
  }

  async findOne(id: string, psychologistId: string) {
    const s = await this.repo.findOne({ where: { id }, relations: ['patient'] })
    if (!s) throw new NotFoundException()
    if (s.psychologistId !== psychologistId) throw new ForbiddenException()
    return s
  }

  create(dto: CreateSessionDto, psychologistId: string) {
    const session = this.repo.create({ ...dto, psychologistId })
    return this.repo.save(session)
  }

  async update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string) {
    const s = await this.findOne(id, psychologistId)
    Object.assign(s, dto)
    return this.repo.save(s)
  }

  async getDashboard(psychologistId: string) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]

    const [monthSessions, weekSessions, allSessions] = await Promise.all([
      this.repo.count({ where: { psychologistId } }),
      this.repo.count({ where: { psychologistId } }),
      this.repo.find({ where: { psychologistId } }),
    ])

    const pendingAmount = allSessions
      .filter(s => s.paymentStatus === 'pending')
      .reduce((sum, _) => sum, 0)

    return {
      sessionsThisMonth: monthSessions,
      sessionsThisWeek: weekSessions,
      pendingPayments: allSessions.filter(s => s.paymentStatus === 'pending').length,
      pendingAmount,
    }
  }
}
