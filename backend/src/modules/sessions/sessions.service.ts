import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
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
  private readonly logger = new Logger(SessionsService.name)

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
    // Envolto em try/catch para não prejudicar o save da sessão em caso de falha financeira
    if (dto.paymentStatus !== 'waived' && dto.patientId) {
      try {
        const patient = await this.patients.findOne({
          where: { id: dto.patientId, psychologistId },
        })

        if (patient) {
          const amount = Number(patient.sessionPrice) || 0
          const description = `Sessão — ${dto.date}`
          const isPaid = dto.paymentStatus === 'paid'

          await this.financial.create(
            {
              type: 'income',
              amount,
              description,
              status: isPaid ? 'paid' : 'pending',
              dueDate: dto.date,
              paidAt: isPaid ? dto.date : undefined,
              method: isPaid ? 'manual' : undefined,
              sessionId: saved.id,
              patientId: dto.patientId,
            },
            psychologistId,
          )

          // Envia cobrança via WhatsApp se pagamento pendente e autoCharge ativo
          if (!isPaid && patient.phone) {
            const user = await this.users.findOneBy({ id: psychologistId })
            const prefs = (user?.preferences ?? {}) as Record<string, any>
            if (prefs.autoCharge !== false) {
              const pixKey = prefs.pixKey ?? undefined
              this.notifications.sendPaymentRequest(patient, amount, pixKey).catch(() => {})
            }
          }
        }
      } catch (err) {
        // Não falha a criação da sessão por erro no financeiro
        this.logger.warn(`Falha ao criar registro financeiro para sessão ${saved.id}: ${err}`)
      }
    }

    return saved
  }

  async update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string) {
    const s = await this.findOne(id, psychologistId)
    const oldPaymentStatus = s.paymentStatus
    Object.assign(s, dto)
    const updated = await this.repo.save(s)

    // Sincroniza o registro financeiro quando o status de pagamento muda
    if (dto.paymentStatus && dto.paymentStatus !== oldPaymentStatus) {
      this.syncFinancialRecord(updated, psychologistId).catch(err =>
        this.logger.warn(`Falha ao sincronizar financeiro da sessão ${id}: ${err}`)
      )
    }

    return updated
  }

  /** Sincroniza o registro financeiro vinculado a uma sessão após mudança de status */
  private async syncFinancialRecord(session: Session, psychologistId: string): Promise<void> {
    const existing = await this.financial.findBySessionId(session.id, psychologistId)

    if (session.paymentStatus === 'waived') {
      // Remove o registro financeiro se existir (cortesia não gera cobrança)
      if (existing) await this.financial.remove(existing.id, psychologistId)
      return
    }

    if (existing) {
      if (session.paymentStatus === 'paid' && existing.status !== 'paid') {
        await this.financial.markPaid(existing.id, 'manual', psychologistId)
      } else if (session.paymentStatus === 'pending' && existing.status === 'paid') {
        await this.financial.resetToPending(existing.id, psychologistId)
      }
    } else {
      // Sem registro financeiro (sessão antiga) — cria agora
      const patient = await this.patients.findOne({
        where: { id: session.patientId, psychologistId },
      })
      if (!patient) return

      const amount = Number(patient.sessionPrice) || 0
      const isPaid = session.paymentStatus === 'paid'

      await this.financial.create(
        {
          type: 'income',
          amount,
          description: `Sessão — ${session.date}`,
          status: isPaid ? 'paid' : 'pending',
          dueDate: session.date,
          paidAt: isPaid ? session.date : undefined,
          method: isPaid ? 'manual' : undefined,
          sessionId: session.id,
          patientId: session.patientId,
        },
        psychologistId,
      )
    }
  }

  async remove(id: string, psychologistId: string) {
    const s = await this.findOne(id, psychologistId)
    await this.repo.remove(s)
    return { deleted: true }
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
