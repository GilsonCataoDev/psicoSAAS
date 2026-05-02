import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FinancialRecord } from './entities/financial-record.entity'
import { CreateFinancialDto } from './dto/create-financial.dto'
import { ChargeCardDto } from './dto/charge-card.dto'
import { PatientAsaasService } from './asaas.service'
import { NotificationsService } from '../notifications/notifications.service'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { safeDecryptSecret } from '../../common/crypto/encrypt.util'

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name)

  constructor(
    @InjectRepository(FinancialRecord) private repo: Repository<FinancialRecord>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    private asaas: PatientAsaasService,
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
   *
   * cpfCnpj do paciente é obrigatório para criar o customer no Asaas.
   * Deve estar cadastrado na ficha do paciente antes de gerar o link.
   */
  async generatePaymentLink(id: string, psychologistId: string): Promise<{ url: string }> {
    const record  = await this.repo.findOne({ where: { id }, relations: ['patient'] })
    if (!record) throw new NotFoundException()
    if (record.psychologistId !== psychologistId) throw new ForbiddenException()

    const user   = await this.users.findOneBy({ id: psychologistId })
    const apiKey = safeDecryptSecret((user?.preferences as any)?.asaasApiKey) as string | undefined
    if (!apiKey) {
      throw new BadRequestException(
        'Configure sua chave Asaas em Configurações → Pagamentos para gerar links de cobrança.',
      )
    }

    // Reutiliza link já gerado se ainda não foi pago
    if (record.paymentLinkUrl && record.status !== 'paid') {
      return { url: record.paymentLinkUrl }
    }

    const patient    = record.patient
    const cpfCnpj    = patient?.cpfCnpj
    const patientName = patient?.name ?? record.description

    // ── 1. Criar/localizar customer (com cpfCnpj obrigatório) ────────────────
    const customerId = await this.asaas.findOrCreateCustomer(
      apiKey,
      record.patientId ?? id,
      patientName,
      cpfCnpj ?? '',
      patient?.email,
    )

    // Persiste customerId para reutilização
    if (patient && !patient.asaasCustomerId) {
      await this.patients.update(patient.id, { asaasCustomerId: customerId })
    }

    // ── 2. Criar cobrança (billingType UNDEFINED = paciente escolhe o método) ─
    const dueDate = record.dueDate
      ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const payment = await this.asaas.createInvoicePayment(apiKey, customerId, {
      value:        Number(record.amount),
      dueDate,
      description:  record.description,
      externalRef:  id,
    })

    // ── 3. Salva IDs para rastreamento e webhook ─────────────────────────────
    record.asaasPaymentId = payment.id
    record.paymentLinkUrl = payment.invoiceUrl
    await this.repo.save(record)

    this.logger.log(`[Asaas] Link gerado: ${payment.invoiceUrl} (paymentId=${payment.id})`)
    return { url: payment.invoiceUrl! }
  }

  /**
   * Cobra diretamente por cartão de crédito via Asaas (conta do próprio psicólogo):
   * 1. findOrCreateCustomer — usa patient.cpfCnpj (obrigatório pelo Asaas)
   * 2. tokenizeCard         — envia payload completo com remoteIp
   * 3. createCardPayment    — cria cobrança com o token
   * 4. Marca lançamento como pago
   */
  async chargeWithCard(
    id: string,
    psychologistId: string,
    dto: ChargeCardDto,
    remoteIp: string,
  ): Promise<{ message: string; paymentId: string }> {
    const record = await this.repo.findOne({ where: { id }, relations: ['patient'] })
    if (!record) throw new NotFoundException()
    if (record.psychologistId !== psychologistId) throw new ForbiddenException()
    if (record.status === 'paid') throw new BadRequestException('Este lançamento já foi pago.')

    const user   = await this.users.findOneBy({ id: psychologistId })
    const apiKey = safeDecryptSecret((user?.preferences as any)?.asaasApiKey) as string | undefined
    if (!apiKey) {
      throw new BadRequestException(
        'Configure sua chave Asaas em Configurações → Pagamentos para cobrar por cartão.',
      )
    }

    const patient = record.patient

    // ── 1. Criar/localizar customer no Asaas ────────────────────────────────
    // Prioridade: cpfCnpj do formulário > cpfCnpj salvo no paciente
    const cpfCnpj = dto.creditCardHolderInfo.cpfCnpj || patient?.cpfCnpj
    const customerId = await this.asaas.findOrCreateCustomer(
      apiKey,
      record.patientId ?? id,
      dto.creditCardHolderInfo.name,
      cpfCnpj ?? '',
      dto.creditCardHolderInfo.email,
    )

    // Persiste customerId no paciente para futuras cobranças sem precisar buscar
    if (patient && !patient.asaasCustomerId) {
      await this.patients.update(patient.id, { asaasCustomerId: customerId })
    }

    // ── 2. Tokenizar o cartão ────────────────────────────────────────────────
    const creditCardToken = await this.asaas.tokenizeCard(
      apiKey,
      customerId,
      dto.creditCard,
      dto.creditCardHolderInfo,
      remoteIp,
    )

    // ── 3. Criar cobrança com o token ────────────────────────────────────────
    const dueDate = record.dueDate ?? new Date().toISOString().split('T')[0]

    const payment = await this.asaas.createCardPayment(apiKey, customerId, {
      value:           Number(record.amount),
      dueDate,
      description:     record.description,
      externalRef:     id,
      creditCardToken,
      holderInfo:      dto.creditCardHolderInfo,
    })

    // ── 4. Marcar lançamento como pago ───────────────────────────────────────
    record.status         = 'paid'
    record.paidAt         = new Date().toISOString()
    record.method         = 'credit_card'
    record.asaasPaymentId = payment.id
    await this.repo.save(record)

    // Salva também o CPF no paciente para próximas cobranças (se ainda não tiver)
    if (patient && !patient.cpfCnpj && cpfCnpj) {
      await this.patients.update(patient.id, { cpfCnpj: cpfCnpj.replace(/\D/g, '') })
    }

    this.logger.log(`[Asaas] Cobrança por cartão confirmada: paymentId=${payment.id}`)
    return { message: 'Cobrança realizada com sucesso', paymentId: payment.id }
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
