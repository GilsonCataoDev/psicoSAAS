import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Session } from './entities/session.entity'
import { CreateSessionDto } from './dto/create-session.dto'
import { FinancialService } from '../financial/financial.service'
import { NotificationsService } from '../notifications/notifications.service'
import { Patient } from '../patients/entities/patient.entity'
import { User } from '../auth/entities/user.entity'

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private repo: Repository<Session>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    @InjectRepository(User) private users: Repository<User>,
    private financial: FinancialService,
    private notifications: NotificationsService,
  ) {}

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

  async create(dto: CreateSessionDto, psychologistId: string) {
    const session = this.repo.create({ ...dto, psychologistId })
    const saved = await this.repo.save(session)

    // Auto-cria FinancialRecord para sessões pagas ou pendentes
    if (dto.paymentStatus !== 'waived' && dto.patientId) {
      const patient = await this.patients.findOne({
        where: { id: dto.patientId, psychologistId },
      })

      if (patient) {
        const amount = patient.sessionPrice || 0
        const description = `Sessão — ${dto.date}`

        const record = await this.financial.create(
          {
            type: 'income',
            amount,
            description,
            status: dto.paymentStatus === 'paid' ? 'paid' : 'pending',
            dueDate: dto.date,
            paidAt: dto.paymentStatus === 'paid' ? dto.date : undefined,
            method: dto.paymentStatus === 'paid' ? 'manual' : undefined,
            sessionId: saved.id,
            patientId: dto.patientId,
          } as any,
          psychologistId,
        )

        // Envia cobrança via WhatsApp se pagamento pendente e autoCharge ativo
        if (dto.paymentStatus === 'pending' && patient.phone) {
          const user = await this.users.findOneBy({ id: psychologistId })
          const prefs = (user?.preferences ?? {}) as Record<string, any>
          if (prefs.autoCharge !== false) {
            const pixKey = prefs.pixKey ?? undefined
            this.notifications.sendPaymentRequest(patient, Number(amount), pixKey).catch(() => {})
          }
        }
      }
    }

    return saved
  }

  async update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string) {
    const s = await this.findOne(id, psychologistId)
    Object.assign(s, dto)
    return this.repo.save(s)
  }

  async getDashboard(psychologistId: string) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const weekStart  = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]

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
      sessionsThisWeek:  weekSessions,
      pendingPayments:   allSessions.filter(s => s.paymentStatus === 'pending').length,
      pendingAmount,
    }
  }
}
