import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { EmailService } from '../email/email.service'
import { User } from '../auth/entities/user.entity'
import { Subscription } from './entities/subscription.entity'
import { WebhookEvent } from './entities/webhook-event.entity'
import { AsaasService } from './asaas.service'
import { secretsMatch } from '../../common/crypto/encrypt.util'
import { ReferralService } from '../referral/referral.service'
import { SalesService } from '../sales/sales.service'

const APPROVED_PAYMENT_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'] as const
const TERMINAL_PAYMENT_EVENTS = [
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_RECEIVED_IN_CASH_UNDONE',
] as const

@Injectable()
export class BillingWebhookService {
  private readonly logger = new Logger(BillingWebhookService.name)

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    @InjectRepository(WebhookEvent)
    private readonly events: Repository<WebhookEvent>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly cfg: ConfigService,
    private readonly email: EmailService,
    private readonly asaas: AsaasService,
    private readonly referrals: ReferralService,
    @Optional() private readonly sales?: SalesService,
  ) {}

  isValidOrigin(headers: Record<string, any>, payload: any): boolean {
    const expected = this.cfg.get<string>('ASAAS_WEBHOOK_TOKEN')
    if (!expected) return false // Falha fechado: sem segredo configurado, nenhum webhook é confiável.

    const received =
      headers['asaas-access-token'] ??
      headers['access_token'] ??
      headers['access-token'] ??
      payload?.accessToken

    return secretsMatch(typeof received === 'string' ? received : undefined, expected)
  }

  async process(payload: any): Promise<void> {
    const eventType = payload?.event
    const eventId = this.getEventId(payload)

    this.logger.log(`[Asaas webhook] Recebido event=${eventType} id=${eventId}`)

    if (!eventType || !eventId) {
      this.logger.warn('[Asaas webhook] Payload sem event/eventId processável')
      return
    }

    const logged = await this.logOnce(eventId, eventType, payload)
    if (!logged) {
      this.logger.log(`[Asaas webhook] Evento duplicado ignorado id=${eventId}`)
      return
    }

    try {
      await this.processLoggedEvent(eventType, eventId, payload)
    } catch (err) {
      await this.events.delete({ eventId }).catch(deleteErr => {
        this.logger.error(`[Asaas webhook] Falha ao liberar evento ${eventId} para retry`, deleteErr)
      })
      throw err
    }
  }

  private async processLoggedEvent(eventType: string, eventId: string, payload: any): Promise<void> {
    const supportedEvents = [
      ...APPROVED_PAYMENT_EVENTS,
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED',
      ...TERMINAL_PAYMENT_EVENTS,
      'SUBSCRIPTION_CANCELLED',
      'SUBSCRIPTION_DELETED',
      'SUBSCRIPTION_INACTIVATED',
    ]
    if (!supportedEvents.includes(eventType as any)) {
      this.logger.log(`[Asaas webhook] Evento ignorado event=${eventType}`)
      return
    }

    const paymentId = payload?.payment?.id as string | undefined
    if (
      APPROVED_PAYMENT_EVENTS.includes(eventType as any)
      && paymentId
      && await this.hasTerminalPaymentEvent(paymentId)
    ) {
      this.logger.warn(`[Asaas webhook] Aprovação obsoleta ignorada paymentId=${paymentId}`)
      return
    }

    const subscription = await this.findSubscription(payload)
    if (!subscription) {
      this.logger.warn(`[Asaas webhook] Subscription não encontrada event=${eventType} id=${eventId}`)
      throw new Error(`Subscription não encontrada para o evento ${eventId}`)
    }

    const previousStatus = subscription.status

    switch (eventType) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        subscription.status = 'active'
        subscription.trialEndsAt = null
        subscription.cancelAtPeriodEnd = false
        subscription.currentPeriodEnd = this.getCurrentPeriodEnd(payload)
        await this.applyPromotionCycle(subscription, payload)
        break
      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_PARTIALLY_REFUNDED':
      case 'PAYMENT_REFUND_IN_PROGRESS':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE':
      case 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL':
      case 'PAYMENT_RECEIVED_IN_CASH_UNDONE':
        subscription.status = 'past_due'
        subscription.trialEndsAt = null
        this.sendPaymentFailedEmail(subscription.userId).catch((err) => {
          this.logger.error('[Asaas webhook] Erro ao enviar email de pagamento recusado', err)
        })
        break
      case 'SUBSCRIPTION_CANCELLED':
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        if (
          subscription.cancelAtPeriodEnd
          && subscription.currentPeriodEnd
          && new Date(subscription.currentPeriodEnd).getTime() > Date.now()
        ) {
          subscription.status = 'active'
        } else {
          this.downgradeToFree(subscription)
        }
        break
      default:
        return
    }

    await this.subscriptions.save(subscription)

    if (APPROVED_PAYMENT_EVENTS.includes(eventType as any)) {
      const grossAmount = Number(payload?.payment?.value)
      const hasSalesAttribution = await this.sales?.hasAttribution(subscription.userId) ?? false
      if (hasSalesAttribution) {
        await this.sales?.handlePaymentApproved(subscription.userId, paymentId, grossAmount)
      } else {
        await this.referrals.handlePaymentApproved(subscription.userId, paymentId, grossAmount)
      }
    } else if (TERMINAL_PAYMENT_EVENTS.includes(eventType as any)) {
      await this.referrals.handlePaymentReversed(subscription.userId, paymentId, eventType)
      await this.sales?.handlePaymentReversed(subscription.userId, paymentId, eventType)
    }

    this.logger.log(
      `[Asaas webhook] Subscription ${subscription.id} status ${previousStatus} -> ${subscription.status}`,
    )
  }

  private async applyPromotionCycle(subscription: Subscription, payload: any): Promise<void> {
    if (!subscription.gatewaySubscriptionId) return
    if (!subscription.promoCode || !subscription.promoCyclesTotal) return

    const paymentId = payload?.payment?.id
    if (!paymentId || subscription.lastPromoPaymentId === paymentId) return

    const nextCycle = Math.min(
      (subscription.promoCyclesUsed ?? 0) + 1,
      subscription.promoCyclesTotal,
    )

    if (nextCycle < subscription.promoCyclesTotal) {
      subscription.lastPromoPaymentId = paymentId
      subscription.promoCyclesUsed = nextCycle
      return
    }

    try {
      await this.asaas.updateSubscriptionPlan(
        subscription.gatewaySubscriptionId,
        subscription.plan,
        { updatePendingPayments: true },
      )
      this.logger.log(`[Asaas webhook] Promo ${subscription.promoCode} encerrada; assinatura ${subscription.id} voltou ao valor cheio`)
      subscription.lastPromoPaymentId = paymentId
      subscription.promoCyclesUsed = nextCycle
      subscription.promoCode = null
      subscription.promoDiscountPercent = 0
      subscription.promoCyclesTotal = 0
      subscription.regularMonthlyValue = null
    } catch (err: any) {
      this.logger.error(`[Asaas webhook] Falha ao restaurar valor cheio da assinatura ${subscription.id}: ${err?.message ?? err}`)
    }
  }

  private async logOnce(eventId: string, eventType: string, payload: any): Promise<boolean> {
    try {
      await this.events.save(this.events.create({
        eventId,
        eventType,
        paymentId: payload?.payment?.id ?? null,
        payload: this.sanitizeWebhookPayload(payload), // Mantém auditoria sem persistir payload financeiro bruto.
      }))
      return true
    } catch (err: any) {
      if (err?.code === '23505' || err?.driverError?.code === '23505') return false
      this.logger.error('[Asaas webhook] Erro ao registrar idempotência', err)
      throw err
    }
  }

  private async hasTerminalPaymentEvent(paymentId: string): Promise<boolean> {
    return this.events.exist({
      where: {
        paymentId,
        eventType: In([...TERMINAL_PAYMENT_EVENTS]),
      },
    })
  }

  private async findSubscription(payload: any): Promise<Subscription | null> {
    const gatewaySubscriptionId = payload?.subscription?.id ?? payload?.payment?.subscription
    const externalReference =
      payload?.subscription?.externalReference ??
      payload?.payment?.externalReference

    if (gatewaySubscriptionId) {
      const byGatewayId = await this.subscriptions.findOne({
        where: { gatewaySubscriptionId },
      })
      if (byGatewayId) return byGatewayId
    }

    if (externalReference) {
      return this.subscriptions.findOne({
        where: { id: externalReference },
      })
    }

    return null
  }

  private getCurrentPeriodEnd(payload: any): Date {
    const date =
      payload?.subscription?.nextDueDate ??
      payload?.payment?.nextDueDate ??
      payload?.payment?.dueDate

    if (date) return new Date(`${date}T00:00:00.000Z`)

    const fallback = new Date()
    fallback.setMonth(fallback.getMonth() + 1)
    return fallback
  }

  private getEventId(payload: any): string | null {
    const eventType = payload?.event
    const objectId =
      payload?.id ??
      payload?.payment?.id ??
      payload?.subscription?.id ??
      payload?.payment?.subscription ??
      payload?.subscription?.externalReference ??
      payload?.payment?.externalReference

    if (!eventType || !objectId) return null
    return `${eventType}:${objectId}`
  }

  private sanitizeWebhookPayload(payload: any): Record<string, unknown> {
    const payment = payload?.payment ?? {}
    const subscription = payload?.subscription ?? {}
    return {
      event: payload?.event ?? null,
      id: payload?.id ?? null,
      status: payment?.status ?? subscription?.status ?? null,
      paymentId: payment?.id ?? null,
      subscriptionId: subscription?.id ?? payment?.subscription ?? null,
      externalReference: subscription?.externalReference ?? payment?.externalReference ?? null,
      dueDate: payment?.dueDate ?? null,
      paymentDate: payment?.paymentDate ?? payment?.clientPaymentDate ?? null,
      nextDueDate: subscription?.nextDueDate ?? payment?.nextDueDate ?? null,
      value: payment?.value ?? subscription?.value ?? null,
      netValue: payment?.netValue ?? null,
      billingType: payment?.billingType ?? null,
    }
  }

  private downgradeToFree(subscription: Subscription): void {
    subscription.plan = 'free'
    subscription.status = 'active'
    subscription.gatewayCustomerId = null
    subscription.gatewaySubscriptionId = null
    subscription.currentPeriodEnd = new Date()
    subscription.trialEndsAt = null
    subscription.cancelAtPeriodEnd = false
    subscription.promoCode = null
    subscription.promoDiscountPercent = 0
    subscription.promoCyclesTotal = 0
    subscription.promoCyclesUsed = 0
    subscription.regularMonthlyValue = null
    subscription.lastPromoPaymentId = null
  }

  private async sendPaymentFailedEmail(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) return

    await this.email.send({
      to: user.email,
      subject: 'Pagamento recusado — UseCognia',
      html: `
        <p>Olá, ${user.name.split(' ')[0]}.</p>
        <p>Não conseguimos cobrar seu cartão. Atualize o pagamento para continuar usando o UseCognia.</p>
      `,
    })
  }
}
