import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { CreateFinancialDto } from './dto/create-financial.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { User } from '../auth/entities/user.entity'

@Injectable()
export class FinancialService {
  constructor(
    @InjectRepository(FinancialRecord) private repo: Repository<FinancialRecord>,
    @InjectRepository(User) private users: Repository<User>,
    private notifications: NotificationsService,
  ) {}

  findAll(psychologistId: string, status?: string, patientId?: string) {
    const where: any = { psychologistId }
    if (status) where.status = status
    if (patientId) where.patientId = patientId
    return this.repo.find({ where, relations: ['patient'], order: { createdAt: 'DESC' } })
  }

  async findOne(id: string, psychologistId: string) {
    const r = await this.repo.findOne({ where: { id } })
    if (!r) throw new NotFoundException()
    if (r.psychologistId !== psychologistId) throw new ForbiddenException()
    return r
  }

  /** Busca o registro financeiro vinculado a uma sessão específica */
  findBySessionId(sessionId: string, psychologistId: string) {
    return this.repo.findOne({ where: { sessionId, psychologistId } })
  }

  create(dto: CreateFinancialDto & { status?: string; paidAt?: string }, psychologistId: string) {
    const record = this.repo.create({ ...dto, psychologistId })
    return this.repo.save(record)
  }

  async markPaid(id: string, method: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    r.status = 'paid'
    r.paidAt = new Date().toISOString()
    r.method = method
    return this.repo.save(r)
  }

  /** Reverte um pagamento para pendente (ex: sessão editada) */
  async resetToPending(id: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    r.status = 'pending'
    r.paidAt = undefined
    r.method = undefined
    return this.repo.save(r)
  }

  /** Envia cobrança via WhatsApp usando a chave PIX das preferências do psicólogo */
  async sendChargeMessage(id: string, psychologistId: string): Promise<{ message: string }> {
    const record = await this.findOne(id, psychologistId)
    const user = await this.users.findOneBy({ id: psychologistId })
    const pixKey = (user?.preferences as any)?.pixKey ?? undefined
    await this.notifications.sendPaymentRequest(record.patient, Number(record.amount), pixKey)
    return { message: 'Cobrança enviada via WhatsApp ✓' }
  }

  async remove(id: string, psychologistId: string) {
    const r = await this.findOne(id, psychologistId)
    await this.repo.remove(r)
    return { deleted: true }
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
}
