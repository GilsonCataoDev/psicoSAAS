import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { addDays, addMonths, addYears } from 'date-fns'
import { Subscription } from './entities/subscription.entity'
import { AsaasService, CreateSubscriptionDto as AsaasCreateDto } from './asaas.service'
import { CreateSubscriptionDto } from './dto/create-subscription.dto'
import { User } from '../auth/entities/user.entity'

const TRIAL_DAYS = 7

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(
    @InjectRepository(Subscription) private repo: Repository<Subscription>,
    private asaas: AsaasService,
  ) {}

  // ─── Consulta ────────────────────────────────────────────────────────────

  async getByUserId(userId: string): Promise<Subscription | null> {
    return this.repo.findOne({ where: { userId } })
  }

  async getOrCreateTrial(userId: string): Promise<Subscription> {
    let sub = await this.repo.findOne({ where: { userId } })
    if (sub) return sub

    sub = this.repo.create({
      userId,
      planId: 'essencial',
      status: 'trialing',
      trialEndsAt: addDays(new Date(), TRIAL_DAYS),
    })
    return this.repo.save(sub)
  }

  // ─── Criar assinatura via Asaas ──────────────────────────────────────────

  async subscribe(user: User, dto: CreateSubscriptionDto, remoteIp: string) {
    // Garante ou cria customer no Asaas
    let sub = await this.repo.findOne({ where: { userId: user.id } })

    let asaasCustomerId = sub?.asaasCustomerId
    if (!asaasCustomerId) {
      asaasCustomerId = await this.asaas.findOrCreateCustomer(
        user.id, user.name, user.email, dto.cpfCnpj,
      )
    }

    // Cria assinatura no Asaas
    const asaasDto: AsaasCreateDto = {
      customerId: asaasCustomerId,
      planId: dto.planId,
      billingType: dto.billingType,
      yearly: dto.yearly,
      ...(dto.creditCard && {
        creditCard: dto.creditCard,
        creditCardHolderInfo: dto.creditCardHolderInfo
          ? {
              ...dto.creditCardHolderInfo,
              email: dto.creditCardHolderInfo.email || user.email,
              cpfCnpj: dto.creditCardHolderInfo.cpfCnpj || dto.cpfCnpj,
            }
          : undefined,
        remoteIp,
      }),
    }

    const asaasSub = await this.asaas.createSubscription(asaasDto)

    // Salva/atualiza localmente
    if (!sub) sub = this.repo.create({ userId: user.id })

    sub.asaasCustomerId = asaasCustomerId
    sub.asaasSubscriptionId = asaasSub.id
    sub.planId = dto.planId
    sub.billingType = dto.billingType
    sub.yearly = dto.yearly

    // Cartão → imediatamente ativo; PIX/Boleto → aguarda pagamento
    if (dto.billingType === 'CREDIT_CARD') {
      sub.status = 'active'
      sub.currentPeriodEnd = dto.yearly
        ? addYears(new Date(), 1)
        : addMonths(new Date(), 1)
    } else {
      sub.status = 'trialing'  // mantém trialing até webhook confirmar
    }

    const saved = await this.repo.save(sub)

    // Para PIX/Boleto, busca o link de pagamento
    let paymentLink = {}
    if (dto.billingType !== 'CREDIT_CARD') {
      paymentLink = await this.asaas.getPaymentLink(asaasSub.id)
    }

    return { subscription: saved, ...paymentLink }
  }

  // ─── Webhook Asaas ───────────────────────────────────────────────────────

  async handleWebhook(event: any): Promise<void> {
    const { event: type, payment, subscription: asaasSub } = event

    this.logger.log(`[Webhook Asaas] ${type}`)

    // Localiza a assinatura pelo ID do Asaas
    const sub = asaasSub?.id
      ? await this.repo.findOne({ where: { asaasSubscriptionId: asaasSub.id } })
      : payment?.subscription
        ? await this.repo.findOne({ where: { asaasSubscriptionId: payment.subscription } })
        : null

    if (!sub) return

    switch (type) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        sub.status = 'active'
        sub.currentPeriodEnd = sub.yearly
          ? addYears(new Date(), 1)
          : addMonths(new Date(), 1)
        break

      case 'PAYMENT_OVERDUE':
        sub.status = 'past_due'
        break

      case 'SUBSCRIPTION_DELETED':
      case 'PAYMENT_REFUNDED':
        sub.status = 'cancelled'
        sub.cancelAtPeriodEnd = false
        break
    }

    await this.repo.save(sub)
  }

  // ─── Cancelamento ────────────────────────────────────────────────────────

  async cancel(userId: string): Promise<Subscription> {
    const sub = await this.repo.findOne({ where: { userId } })
    if (!sub) throw new NotFoundException()

    if (sub.asaasSubscriptionId) {
      await this.asaas.cancelSubscription(sub.asaasSubscriptionId)
    }

    sub.status = 'cancelled'
    sub.cancelAtPeriodEnd = false
    return this.repo.save(sub)
  }
}
