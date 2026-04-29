import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import { FinancialRecord } from './entities/financial-record.entity'
import { CreateFinancialDto } from './dto/create-financial.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { User } from '../auth/entities/user.entity'

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name)

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

  /**
   * Gera um link de pagamento Asaas para o paciente pagar via cartão, PIX ou boleto.
   * Usa a chave Asaas do próprio psicólogo (salva em preferences.asaasApiKey).
   * O dinheiro vai direto para a conta Asaas do psicólogo.
   */
  async generatePaymentLink(id: string, psychologistId: string): Promise<{ url: string }> {
    const record = await this.findOne(id, psychologistId)
    const user   = await this.users.findOne({ where: { id: psychologistId }, relations: ['patients'] })

    const apiKey = (user?.preferences as any)?.asaasApiKey as string | undefined
    if (!apiKey) {
      throw new BadRequestException(
        'Configure sua chave Asaas em Configurações → Pagamentos para gerar links de cobrança.',
      )
    }

    // Reutiliza link já gerado se ainda não foi pago
    if (record.paymentLinkUrl && record.status !== 'paid') {
      return { url: record.paymentLinkUrl }
    }

    const isSandbox = process.env.NODE_ENV !== 'production'
    const baseURL   = isSandbox
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    const api = axios.create({
      baseURL,
      headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
    })

    try {
      // 1. Cria ou localiza o cliente no Asaas do psicólogo
      const patient = (record as any).patient ?? await this.repo
        .findOne({ where: { id }, relations: ['patient'] })
        .then(r => r?.patient)

      const patientName  = patient?.name  ?? record.description
      const patientEmail = patient?.email ?? undefined

      let customerId: string
      try {
        const { data: existing } = await api.get('/customers', {
          params: { externalReference: record.patientId ?? id, limit: 1 },
        })
        if (existing.data?.length) {
          customerId = existing.data[0].id
        } else {
          const payload: any = { name: patientName, externalReference: record.patientId ?? id, notificationDisabled: false }
          if (patientEmail) payload.email = patientEmail
          const { data: created } = await api.post('/customers', payload)
          customerId = created.id
        }
      } catch {
        // Fallback: cria cliente mínimo sem externalReference
        const { data: fallback } = await api.post('/customers', { name: patientName })
        customerId = fallback.id
      }

      // 2. Cria a cobrança (billingType UNDEFINED = paciente escolhe o método)
      const dueDate = record.dueDate
        ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: payment } = await api.post('/payments', {
        customer:     customerId,
        billingType:  'UNDEFINED',   // aceita cartão, PIX e boleto
        value:        Number(record.amount),
        dueDate,
        description:  record.description,
        externalReference: id,       // nosso ID — usado no webhook
      })

      // 3. Salva IDs para rastreamento e webhook
      record.asaasPaymentId = payment.id
      record.paymentLinkUrl = payment.invoiceUrl
      await this.repo.save(record)

      this.logger.log(`[Asaas] Link gerado: ${payment.invoiceUrl} (paymentId=${payment.id})`)
      return { url: payment.invoiceUrl }
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.[0]?.description ?? err?.message ?? 'Erro ao gerar link'
      this.logger.error('[Asaas] Erro ao gerar link de pagamento', err?.response?.data)
      throw new BadRequestException(msg)
    }
  }

  /**
   * Webhook do Asaas: marca o registro como pago quando o paciente paga.
   * Deve ser chamado pelo controller do webhook (rota pública, validada por token).
   */
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
    await this.repo.save(record)
    this.logger.log(`[Asaas Webhook] Pagamento ${record.id} marcado como pago (${record.method})`)
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
