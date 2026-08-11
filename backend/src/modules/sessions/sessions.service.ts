import { BadRequestException, ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { Session } from './entities/session.entity'
import { CreateSessionDto } from './dto/create-session.dto'
import { FinancialService } from '../financial/financial.service'
import { NotificationsService } from '../notifications/notifications.service'
import { Patient } from '../patients/entities/patient.entity'
import { User } from '../auth/entities/user.entity'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'
import { Appointment } from '../appointments/entities/appointment.entity'
import { Booking } from '../booking/entities/booking.entity'

const sessionDescription = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split('-')
  return `Sessão — ${day}/${month}/${year}`
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name)

  constructor(
    @InjectRepository(Session) private repo: Repository<Session>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Appointment) private appointments: Repository<Appointment>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
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
    const s = await this.repo.findOne({ where: { id, psychologistId }, relations: ['patient'] })
    if (!s) throw new NotFoundException()
    return s
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  async findAll(
    psychologistId: string,
    patientId?: string,
    dateFrom?: string,
    dateTo?: string,
    includeClinical = false,
  ): Promise<Session[]> {
    const qb = this.repo.createQueryBuilder('s')
      .leftJoinAndSelect('s.patient', 'patient')
      .where('s.psychologistId = :psychologistId', { psychologistId })
      .orderBy('s.date', 'DESC')

    if (patientId) qb.andWhere('s.patientId = :patientId', { patientId })
    if (dateFrom)  qb.andWhere('s.date >= :dateFrom', { dateFrom })
    if (dateTo)    qb.andWhere('s.date <= :dateTo', { dateTo })

    if (includeClinical) {
      const sessions = await qb.getMany()
      return sessions.map(s => this.dec(s))
    }

    // Listagens não precisam transferir/descriptografar prontuário nem dados privados do paciente.
    qb.select([
      's.id',
      's.date',
      's.duration',
      's.appointmentId',
      's.mood',
      's.tags',
      's.paymentStatus',
      's.paymentId',
      's.patientId',
      's.psychologistId',
      's.createdAt',
      's.updatedAt',
      'patient.id',
      'patient.name',
      'patient.avatarColor',
    ]).addSelect('s.summary IS NOT NULL', 's_has_summary')

    const { entities, raw } = await qb.getRawAndEntities()
    return entities.map((session, index) => ({
      ...session,
      // A lista só informa a existência da evolução, nunca seu conteúdo clínico.
      summary: raw[index]?.s_has_summary ? 'registered' : undefined,
    } as Session))
  }

  async findOne(id: string, psychologistId: string): Promise<Session> {
    return this.dec(await this.findRaw(id, psychologistId))
  }

  async create(dto: CreateSessionDto, psychologistId: string): Promise<Session & { firstSession: boolean }> {
    return this.createInternal(dto, psychologistId, false)
  }

  /** Registra prontuário legado sem criar cobrança, mensalidade ou vínculo com agenda. */
  async createHistorical(dto: CreateSessionDto, psychologistId: string): Promise<Session & { firstSession: boolean }> {
    if (!dto.summary?.trim()) throw new BadRequestException('A transcrição revisada é obrigatória')
    if (dto.summary.trim().length > 12000) throw new BadRequestException('A transcrição deve ter no máximo 12.000 caracteres')
    const parsedDate = new Date(`${dto.date}T00:00:00.000Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dto.date) {
      throw new BadRequestException('A data da sessão histórica é inválida')
    }
    if (dto.date > new Date().toISOString().slice(0, 10)) throw new BadRequestException('A data da sessão histórica não pode estar no futuro')
    return this.createInternal({
      ...dto,
      appointmentId: undefined,
      paymentStatus: 'waived',
      summary: dto.summary.trim(),
    }, psychologistId, true)
  }

  private async createInternal(
    dto: CreateSessionDto,
    psychologistId: string,
    historical: boolean,
  ): Promise<Session & { firstSession: boolean }> {
    const patient = await this.assertPatientBelongsToPsychologist(dto.patientId, psychologistId)
    if (dto.appointmentId) {
      await this.assertAppointmentBelongsToPsychologist(dto.appointmentId, psychologistId, dto.patientId)
      await this.assertAppointmentHasNoSession(dto.appointmentId, psychologistId)
    }

    const previousSessions = await this.repo.count({ where: { psychologistId } })

    // Criptografa campos clínicos antes de persistir
    const effectiveDto = historical
      ? { ...dto, paymentStatus: 'waived' }
      : patient.billingType === 'monthly_package'
      ? { ...dto, paymentStatus: 'included' }
      : dto
    const encrypted = this.encryptFields(effectiveDto)
    const session   = this.repo.create({ ...encrypted, psychologistId })
    const saved     = await this.repo.save(session)

    if (dto.appointmentId) {
      await this.completeLinkedAppointment(dto.appointmentId, psychologistId)
    }

    // Auto-cria FinancialRecord para sessões pagas ou pendentes
    // Usa dto original (não criptografado) para paymentStatus, date, patientId
    if (!historical && patient.billingType === 'monthly_package') {
      try {
        const existingFinancial = dto.appointmentId
          ? await this.financial.findByAppointmentId(dto.appointmentId, psychologistId)
          : null
        if (existingFinancial) await this.financial.remove(existingFinancial.id, psychologistId)
        await this.financial.ensureMonthlyPackageCharge(patient, new Date(`${dto.date}T12:00:00`))
      } catch (err: any) {
        this.logger.warn(`Falha ao criar pacote mensal para sessao ${saved.id}: ${err?.message ?? 'erro desconhecido'}`)
      }
    } else if (!historical && dto.paymentStatus !== 'waived' && dto.patientId) {
      try {
        const patient = await this.patients.findOne({
          where: { id: dto.patientId, psychologistId },
        })

        if (patient) {
          const amount  = Number(patient.sessionPrice) || 0
          const isPaid  = dto.paymentStatus === 'paid'

          const existingFinancial = dto.appointmentId
            ? await this.financial.findByAppointmentId(dto.appointmentId, psychologistId)
            : null

          if (existingFinancial) {
            if (isPaid && existingFinancial.status !== 'paid') {
              await this.financial.markPaid(existingFinancial.id, 'manual', psychologistId)
            } else if (!isPaid && existingFinancial.status === 'paid') {
              await this.financial.resetToPending(existingFinancial.id, psychologistId)
            }
          } else {
            await this.financial.create(
              {
                type: 'income',
                amount,
                description: sessionDescription(dto.date),
                status: isPaid ? 'paid' : 'pending',
                dueDate: dto.date,
                paidAt: isPaid ? dto.date : undefined,
                method: isPaid ? 'manual' : undefined,
                sessionId: saved.id,
                appointmentId: dto.appointmentId,
                patientId: dto.patientId,
              },
              psychologistId,
            )
          }

          if (!isPaid && patient.phone) {
            const user  = await this.users.findOneBy({ id: psychologistId })
            const prefs = (user?.preferences ?? {}) as Record<string, any>
            if (prefs.autoCharge !== false) {
              this.notifications.sendPaymentRequest(
                patient,
                amount,
                prefs.pixKey,
                prefs.chargeTemplate,
                prefs.includeReceipt,
              ).catch(() => {})
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Falha ao criar registro financeiro para sessão ${saved.id}: ${err?.message ?? 'erro desconhecido'}`)
      }
    }

    return { ...this.dec(saved), firstSession: previousSessions === 0 }
  }

  async update(id: string, dto: Partial<CreateSessionDto>, psychologistId: string): Promise<Session> {
    // Carrega entidade bruta (campos ainda criptografados no banco)
    const s              = await this.findRaw(id, psychologistId)
    const oldPaymentStatus = s.paymentStatus

    if (dto.patientId) {
      await this.assertPatientBelongsToPsychologist(dto.patientId, psychologistId)
    }
    if (dto.appointmentId) {
      await this.assertAppointmentBelongsToPsychologist(dto.appointmentId, psychologistId, dto.patientId ?? s.patientId)
      await this.assertAppointmentHasNoSession(dto.appointmentId, psychologistId, id)
    }

    // Criptografa os campos que estão sendo atualizados; campos não enviados permanecem intactos
    const encrypted = this.encryptFields(dto)
    Object.assign(s, encrypted)
    const updated = await this.repo.save(s)

    if (dto.appointmentId) {
      await this.completeLinkedAppointment(dto.appointmentId, psychologistId)
    }

    // Sincroniza o financeiro quando status, data ou paciente mudam.
    if ((dto.paymentStatus && dto.paymentStatus !== oldPaymentStatus) || dto.date || dto.patientId) {
      this.syncFinancialRecord(updated, psychologistId).catch(err =>
        this.logger.warn(`Falha ao sincronizar financeiro da sessão ${id}: ${err?.message ?? 'erro desconhecido'}`)
      )
    }

    return this.dec(updated)
  }

  async remove(id: string, psychologistId: string) {
    // remove() do TypeORM precisa da entidade real, não do plain object decriptado
    const s = await this.findRaw(id, psychologistId)
    const financialRecord = await this.financial.findBySessionId(s.id, psychologistId)
    if (financialRecord) await this.financial.remove(financialRecord.id, psychologistId)
    if (s.appointmentId) await this.restoreLinkedAppointment(s.appointmentId, psychologistId)
    await this.repo.remove(s)
    return { deleted: true }
  }

  // ─── Sincronização financeira ────────────────────────────────────────────────

  /** Sincroniza o registro financeiro vinculado a uma sessão após mudança de status */
  private async syncFinancialRecord(session: Session, psychologistId: string): Promise<void> {
    const existing = await this.findFinancialForSession(session, psychologistId)

    const billingPatient = await this.patients.findOne({
      where: { id: session.patientId, psychologistId },
    })
    if (!billingPatient) return

    if (billingPatient.billingType === 'monthly_package') {
      if (existing) await this.financial.remove(existing.id, psychologistId)
      await this.financial.ensureMonthlyPackageCharge(billingPatient, new Date(`${session.date}T12:00:00`))
      if (session.paymentStatus !== 'included') {
        await this.repo.update({ id: session.id, psychologistId }, { paymentStatus: 'included' })
      }
      return
    }

    if (session.paymentStatus === 'waived') {
      if (existing) await this.financial.remove(existing.id, psychologistId)
      return
    }

    if (existing) {
      await this.financial.updateLinkedRecord(existing.id, psychologistId, {
        dueDate: session.date,
        patientId: session.patientId,
      })
      if (session.paymentStatus === 'paid' && existing.status !== 'paid') {
        await this.financial.markPaid(existing.id, 'manual', psychologistId)
      } else if (session.paymentStatus === 'pending' && existing.status === 'paid') {
        await this.financial.resetToPending(existing.id, psychologistId)
      }
    } else {
      // Sessão antiga sem registro financeiro — cria agora
      const amount = Number(billingPatient.sessionPrice) || 0
      const isPaid = session.paymentStatus === 'paid'

      await this.financial.create(
        {
          type: 'income',
          amount,
          description: sessionDescription(session.date),
          status: isPaid ? 'paid' : 'pending',
          dueDate: session.date,
          paidAt: isPaid ? session.date : undefined,
          method: isPaid ? 'manual' : undefined,
          sessionId: session.id,
          appointmentId: session.appointmentId,
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

  private async assertPatientBelongsToPsychologist(patientId: string, psychologistId: string): Promise<Patient> {
    const patient = await this.patients.findOne({ where: { id: patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
    return patient
  }

  private async assertAppointmentBelongsToPsychologist(appointmentId: string, psychologistId: string, patientId?: string): Promise<void> {
    const appointment = await this.appointments.findOne({ where: { id: appointmentId, psychologistId } })
    if (!appointment) throw new NotFoundException('Agendamento não encontrado')
    if (patientId && appointment.patientId !== patientId) throw new NotFoundException('Agendamento não encontrado para esta pessoa')
  }

  private async assertAppointmentHasNoSession(appointmentId: string, psychologistId: string, ignoreSessionId?: string): Promise<void> {
    const existing = await this.repo.findOne({
      where: {
        appointmentId,
        psychologistId,
        ...(ignoreSessionId ? { id: Not(ignoreSessionId) } : {}),
      },
    })
    if (existing) throw new ConflictException('Este agendamento já possui sessão registrada')
  }

  private async completeLinkedAppointment(appointmentId: string, psychologistId: string): Promise<void> {
    await this.appointments.update({ id: appointmentId, psychologistId }, { status: 'completed' })
    await this.bookings.update(
      { appointmentId, psychologistId },
      { status: 'completed' as Booking['status'] },
    )
  }

  private async restoreLinkedAppointment(appointmentId: string, psychologistId: string): Promise<void> {
    await this.appointments.update({ id: appointmentId, psychologistId }, { status: 'scheduled' })
    await this.bookings.update(
      { appointmentId, psychologistId, status: 'completed' as Booking['status'] },
      { status: 'confirmed' as Booking['status'] },
    )
  }

  private async findFinancialForSession(session: Session, psychologistId: string) {
    return (await this.financial.findBySessionId(session.id, psychologistId))
      ?? (session.appointmentId ? await this.financial.findByAppointmentId(session.appointmentId, psychologistId) : null)
  }
}
