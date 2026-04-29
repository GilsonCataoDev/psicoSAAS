import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Session } from './entities/session.entity'
import { CreateSessionDto } from './dto/create-session.dto'
import { FinancialService } from '../financial/financial.service'
import { NotificationsService } from '../notifications/notifications.service'
import { Patient } from '../patients/entities/patient.entity'
import { User } from '../auth/entities/user.entity'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'

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

  // ─── Helpers de criptografia ────────────────────────────────────────────────

  /** Criptografa campos clínicos sensíveis antes de persistir no banco */
  private encryptFields<T extends Partial<CreateSessionDto>>(dto: T): T {
    const r: any = { ...dto }
    if (r.summary)      r.summary      = encrypt(r.summary)
    if (r.privateNotes) r.privateNotes = encrypt(r.privateNotes)
    if (r.nextSteps)    r.nextSteps    = encrypt(r.nextSteps)
    return r
  }

  /** Descriptografa campos clínicos ao retornar para a camada HTTP */
  private dec(s: Session): Session {
    return {
      ...s,
      summary:      safeDecrypt(s.summary),
      privateNotes: safeDecrypt(s.privateNotes),
      nextSteps:    safeDecrypt(s.nextSteps),
    } as Session
  }

  // ─── Finder interno (retorna entidade bruta para operações de escrita) ───────

  private async findRaw(id: string, psychologistId: string): Promise<Session> {
    const s = await this.repo.findOne({ where: { id }, relations: ['patient'] })
    if (!s) throw new NotFoundException()
    if (s.psychologistId !== psychologistId) throw new ForbiddenException()
    return s
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  async findAll(psychologistId: string, patientId?: string): Promise<Session[]> {
    const where: any = { psychologistId }
    if (patientId) where.patientId = patientId
    const sessions = await this.repo.find({ where, relations: ['patient'], order: { date: 'DESC' } })
    return sessions.map(s => this.dec(s))
  }

  async findOne(id: string, psychologistId: string): Promise<Session> {
    return this.dec(await this.findRaw(id, psychologistId))
  }

  async create(dto: CreateSessionDto, psychologistId: string): Promise<Session> {
    // Criptografa campos clínicos antes de persistir
    const encrypted = this.encryptFields(dto)
    const session   = this.repo.create({ ...encrypted, psychologistId })
    const saved     = await this.repo.save(session)

    // Auto-cria FinancialRecord para sessões pagas ou pendentes
    // Usa dto original (não criptografado) para paymentStatus, date, patientId
    if (dto.paymentStatus !== 'waived' && dto.patientId) {
      try {
        const patient = await this.patients.findOne({
          where: { id: dto.patientId, psychologistId },
        })

        if (patient) {
          const amount  = Number(patient.sessionPrice) || 0
          const isPaid  = dto.paymentStatus === 'paid'

          await this.financial.create(
            {
              type: 'income',
              amount,
              description: `Sessão — ${dto.date}`,
              status: isPaid ? 'paid' : 'pending',
              dueDate: dto.date,
              paidAt: isPaid ? dto.date : undefined,
              method: isPaid ? 'manual' : undefined,
              sessionId: saved.id,
              patientId: dto.patientId,
            },
            psychologistId,
          )

          if (!isPaid && patient.phone) {
            const user  = await this.users.findOneBy({ id: psychologistId })
            const prefs = (user?.preferences ?? {}) as Record<string, any>
            if (prefs.autoCharge !== false) {
              this.notifications.sendPaymentRequest(patient, amount, prefs.pixKey).catch(() => {})
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Falha ao criar registro financeiro para sessão ${saved.id}: ${err}`)
      }
    }

    return this.dec(saved)
  }

  async update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string): Promise<Session> {
    // Carrega entidade bruta (campos ainda criptografados no banco)
    const s              = await this.findRaw(id, psychologistId)
    const oldPaymentStatus = s.paymentStatus

    // Criptografa os campos que estão sendo atualizados; campos não enviados permanecem intactos
    const encrypted = this.encryptFields(dto)
    Object.assign(s, encrypted)
    const updated = await this.repo.save(s)

    // Sincroniza o registro financeiro quando o status de pagamento muda
    if (dto.paymentStatus && dto.paymentStatus !== oldPaymentStatus) {
      this.syncFinancialRecord(updated, psychologistId).catch(err =>
        this.logger.warn(`Falha ao sincronizar financeiro da sessão ${id}: ${err}`)
      )
    }

    return this.dec(updated)
  }

  async remove(id: string, psychologistId: string) {
    // remove() do TypeORM precisa da entidade real, não do plain object decriptado
    const s = await this.findRaw(id, psychologistId)
    await this.repo.remove(s)
    return { deleted: true }
  }

  // ─── Sincronização financeira ────────────────────────────────────────────────

  /** Sincroniza o registro financeiro vinculado a uma sessão após mudança de status */
  private async syncFinancialRecord(session: Session, psychologistId: string): Promise<void> {
    const existing = await this.financial.findBySessionId(session.id, psychologistId)

    if (session.paymentStatus === 'waived') {
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
      // Sessão antiga sem registro financeiro — cria agora
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

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard(psychologistId: string) {
    const allSessions = await this.repo.find({ where: { psychologistId } })

    return {
      sessionsThisMonth: allSessions.length,
      sessionsThisWeek:  allSessions.length,
      pendingPayments:   allSessions.filter(s => s.paymentStatus === 'pending').length,
      pendingAmount:     0,
    }
  }
}
