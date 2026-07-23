import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { CreateFinancialDto } from './dto/create-financial.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { Booking } from '../booking/entities/booking.entity'
import { Appointment } from '../appointments/entities/appointment.entity'

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name)

  constructor(
    @InjectRepository(FinancialRecord) private repo: Repository<FinancialRecord>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    @InjectRepository(Session) private sessions: Repository<Session>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(Appointment) private appointments: Repository<Appointment>,
    private notifications: NotificationsService,
  ) {}

  findAll(psychologistId: string, status?: string, patientId?: string) {
    const where: any = { psychologistId }
    if (status) where.status = status
    if (patientId) where.patientId = patientId
    return this.repo.find({
      where,
      relations: { patient: true },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        dueDate: true,
        paidAt: true,
        method: true,
        sessionId: true,
        appointmentId: true,
        bookingId: true,
        packageMonth: true,
        receiptUrl: true,
        patientId: true,
        psychologistId: true,
        createdAt: true,
        patient: {
          id: true,
          name: true,
          avatarColor: true,
        },
      } as any,
    })
  }

  async findOne(id: string, psychologistId: string) {
    const r = await this.repo.findOne({
      where: { id, psychologistId },
      relations: { patient: true },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        dueDate: true,
        paidAt: true,
        method: true,
        sessionId: true,
        appointmentId: true,
        bookingId: true,
        packageMonth: true,
        receiptUrl: true,
        asaasPaymentId: true,
        paymentLinkUrl: true,
        patientId: true,
        psychologistId: true,
        createdAt: true,
        patient: {
          id: true,
          name: true,
          phone: true,
          avatarColor: true,
        },
      } as any,
    })
    if (!r) throw new NotFoundException()
    return r
  }

  findBySessionId(sessionId: string, psychologistId: string) {
    return this.repo.findOne({ where: { sessionId, psychologistId } })
  }

  findByAppointmentId(appointmentId: string, psychologistId: string) {
    return this.repo.findOne({
      where: [
        { appointmentId, psychologistId },
        { sessionId: appointmentId, psychologistId },
      ],
    })
  }

  findByBookingId(bookingId: string, psychologistId: string) {
    return this.repo.findOne({ where: { bookingId, psychologistId } })
  }

  async updateLinkedRecord(
    id: string,
    psychologistId: string,
    patch: Partial<Pick<FinancialRecord, 'dueDate' | 'patientId' | 'status' | 'paidAt' | 'method'>>,
  ) {
    const record = await this.findOne(id, psychologistId)
    Object.assign(record, patch)
    return this.repo.save(record)
  }

  async create(dto: CreateFinancialDto & { status?: string; paidAt?: string }, psychologistId: string) {
    if (dto.patientId) {
      await this.assertPatientBelongsToPsychologist(dto.patientId, psychologistId)
    }
    if (dto.sessionId) {
      await this.assertSessionBelongsToPsychologist(dto.sessionId, psychologistId)
    }
    if (dto.appointmentId) {
      await this.assertAppointmentBelongsToPsychologist(dto.appointmentId, psychologistId)
    }
    if (dto.bookingId) {
      await this.assertBookingBelongsToPsychologist(dto.bookingId, psychologistId)
    }

    const record = this.repo.create({ ...dto, psychologistId })
    return this.repo.save(record)
  }

  async ensureMonthlyPackageCharge(patient: Patient, referenceDate: Date): Promise<FinancialRecord | null> {
    if (patient.status !== 'active' || patient.billingType !== 'monthly_package') return null
    const amount = Number(patient.monthlyPackagePrice) || 0
    if (amount <= 0) return null

    const year = referenceDate.getFullYear()
    const month = referenceDate.getMonth() + 1
    const packageMonth = `${year}-${String(month).padStart(2, '0')}`
    const existing = await this.repo.findOne({
      where: { psychologistId: patient.psychologistId, patientId: patient.id, packageMonth },
    })
    if (existing) return existing

    const lastDay = new Date(year, month, 0).getDate()
    // Ao ativar um pacote no meio do mês, nunca cria uma cobrança já vencida.
    // Nos meses seguintes o job roda desde o início do mês e respeita o dia configurado.
    const dueDay = Math.min(
      Math.max(Number(patient.billingDay) || 1, referenceDate.getDate(), 1),
      lastDay,
    )
    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(referenceDate)
    const record = this.repo.create({
      type: 'income',
      amount,
      description: `Pacote mensal — ${monthLabel}`,
      status: 'pending',
      dueDate: `${packageMonth}-${String(dueDay).padStart(2, '0')}`,
      packageMonth,
      patientId: patient.id,
      psychologistId: patient.psychologistId,
    })

    try {
      return await this.repo.save(record)
    } catch (error: any) {
      if (error?.code !== '23505') throw error
      return this.repo.findOne({
        where: { psychologistId: patient.psychologistId, patientId: patient.id, packageMonth },
      })
    }
  }

  async markPaid(id: string, method: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    r.status = 'paid'
    r.paidAt = new Date().toISOString()
    r.method = method
    const saved = await this.repo.save(r)
    await this.syncLinkedPaymentStatus(saved, psychologistId, 'paid', method)
    return saved
  }

  async resetToPending(id: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    r.status = 'pending'
    r.paidAt = undefined
    r.method = undefined
    const saved = await this.repo.save(r)
    await this.syncLinkedPaymentStatus(saved, psychologistId, 'pending')
    return saved
  }

  async sendChargeMessage(id: string, psychologistId: string): Promise<{ message: string }> {
    const record = await this.findOne(id, psychologistId)
    if (!record.patient) {
      throw new BadRequestException('Informe uma pessoa no lancamento antes de enviar cobranca')
    }
    const user = await this.users.findOneBy({ id: psychologistId })
    const prefs = (user?.preferences ?? {}) as Record<string, any>
    const result = await this.notifications.sendPaymentRequest(
      record.patient,
      Number(record.amount),
      prefs.pixKey,
      prefs.chargeTemplate,
      prefs.includeReceipt,
    )
    if (!result.sent) throw new BadRequestException(result.error ?? 'Cobranca nao enviada')
    return { message: 'Cobrança enviada via WhatsApp ✓' }
  }

  async handleAsaasWebhook(event: string, payment: { id: string; externalReference?: string; billingType: string }): Promise<void> {
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') return

    const internalId = payment.externalReference
    if (!internalId) return

    const record = await this.repo.findOne({ where: { id: internalId } })
    if (!record || record.status === 'paid') return

    record.status  = 'paid'
    record.paidAt  = new Date().toISOString()
    record.method  = payment.billingType === 'CREDIT_CARD' ? 'credit_card'
                   : payment.billingType === 'PIX'         ? 'pix'
                   : payment.billingType === 'BOLETO'      ? 'transfer'
                   : 'manual'
    const saved = await this.repo.save(record)
    await this.syncLinkedPaymentStatus(saved, record.psychologistId, 'paid', saved.method)
    this.logger.log(`[Asaas Webhook] Pagamento ${record.id} marcado como pago (${record.method})`)
  }

  async remove(id: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    await this.repo.remove(r)
    await this.syncLinkedPaymentStatus(r, psychologistId, 'waived')
    return { deleted: true }
  }

  async getMonthlyReport(psychologistId: string, month: string) {
    // month = 'YYYY-MM'
    const [year, m] = month.split('-').map(Number)
    if (!year || !m) throw new BadRequestException('Formato inválido. Use YYYY-MM.')
    const dateFrom = `${year}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(year, m, 0).getDate()
    const dateTo = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const dateToEnd = `${dateTo} 23:59:59`

    const records = await this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.patient', 'patient')
      .where('r.psychologistId = :psychologistId', { psychologistId })
      .andWhere(`COALESCE(r.paidAt, r.dueDate, CAST(r.createdAt AS text)) >= :dateFrom`, { dateFrom })
      .andWhere(`COALESCE(r.paidAt, r.dueDate, CAST(r.createdAt AS text)) <= :dateToEnd`, { dateToEnd })
      .orderBy('r.createdAt', 'DESC')
      .getMany()

    const income  = records.filter(r => r.type === 'income')
    const expense = records.filter(r => r.type === 'expense')

    return {
      month,
      records,
      totals: {
        income:  income.reduce((s, r) => s + Number(r.amount), 0),
        expense: expense.reduce((s, r) => s + Number(r.amount), 0),
        paidIncome:    income.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
        pendingIncome: income.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
        net: income.reduce((s, r) => s + Number(r.amount), 0) - expense.reduce((s, r) => s + Number(r.amount), 0),
      },
    }
  }

  async getSummary(psychologistId: string) {
    const records = await this.repo.find({ where: { psychologistId } })
    const income = records.filter(r => r.type === 'income')

    return {
      totalRevenue: income.reduce((s, r) => s + Number(r.amount), 0),
      paid: income.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
      pending: income.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
      overdue: income.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
    }
  }

  private async assertPatientBelongsToPsychologist(patientId: string, psychologistId: string): Promise<void> {
    const patient = await this.patients.findOne({ where: { id: patientId, psychologistId } })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
  }

  private async assertSessionBelongsToPsychologist(sessionId: string, psychologistId: string): Promise<void> {
    const session = await this.sessions.findOne({ where: { id: sessionId, psychologistId } })
    if (!session) throw new NotFoundException('Sessão não encontrada')
  }

  private async assertAppointmentBelongsToPsychologist(appointmentId: string, psychologistId: string): Promise<void> {
    const appointment = await this.appointments.findOne({ where: { id: appointmentId, psychologistId } })
    if (!appointment) throw new NotFoundException('Agendamento não encontrado')
  }

  private async assertBookingBelongsToPsychologist(bookingId: string, psychologistId: string): Promise<void> {
    const booking = await this.bookings.findOne({ where: { id: bookingId, psychologistId } })
    if (!booking) throw new NotFoundException('Agendamento público não encontrado')
  }

  private async syncLinkedPaymentStatus(
    record: FinancialRecord,
    psychologistId: string,
    status: 'paid' | 'pending' | 'waived',
    method?: string,
  ): Promise<void> {
    const appointmentId = record.appointmentId ?? record.sessionId
    if (!record.sessionId && !appointmentId && !record.bookingId) return

    const sessionPatch = status === 'paid'
      ? { paymentStatus: 'paid', paymentId: record.id }
      : { paymentStatus: status, paymentId: null }

    if (record.sessionId) {
      await this.sessions.update({ id: record.sessionId, psychologistId }, sessionPatch as any)
    }
    if (appointmentId) {
      await this.sessions.update({ appointmentId, psychologistId }, sessionPatch as any)
    }

    const bookingPatch = status === 'paid'
      ? {
          paymentStatus: 'paid' as Booking['paymentStatus'],
          paymentMethod: method,
          paidAt: new Date(record.paidAt ?? new Date()),
        }
      : {
          paymentStatus: status as Booking['paymentStatus'],
          paymentMethod: null,
          paidAt: null,
        }

    if (record.bookingId) {
      await this.bookings.update({ id: record.bookingId, psychologistId }, bookingPatch)
    }
    if (appointmentId) {
      await this.bookings.update({ appointmentId, psychologistId }, bookingPatch)
    }
  }
}
