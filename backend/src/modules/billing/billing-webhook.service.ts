import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EmailService } from '../email/email.service'
import { User } from '../auth/entities/user.entity'
import { Subscription } from './entities/subscription.entity'
import { WebhookEvent } from './entities/webhook-event.entity'

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
  ) {}

  isValidOrigin(headers: Record<string, any>, payload: any): boolean {
    const expected = this.cfg.get<string>('ASAAS_WEBHOOK_TOKEN')
    if (!expected) return true

    const received =
      headers['asaas-access-token'] ??
      headers['access_token'] ??
      headers['access-token'] ??
      payload?.accessToken

    return received === expected
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

    const subscription = await this.findSubscription(payload)
    if (!subscription) {
      this.logger.warn(`[Asaas webhook] Subscription não encontrada event=${eventType} id=${eventId}`)
      return
    }

    const previousStatus = subscription.status

    switch (eventType) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        subscription.status = 'active'
        subscription.trialEndsAt = null
        subscription.currentPeriodEnd = this.getCurrentPeriodEnd(payload)
        break
      case 'PAYMENT_OVERDUE':
        subscription.status = 'past_due'
        subscription.trialEndsAt = null
        this.sendPaymentFailedEmail(subscription.userId).catch((err) => {
          this.logger.error('[Asaas webhook] Erro ao enviar email de pagamento recusado', err)
        })
        break
      case 'SUBSCRIPTION_CANCELLED':
      case 'SUBSCRIPTION_DELETED':
        subscription.status = 'canceled'
        break
      default:
        this.logger.log(`[Asaas webhook] Evento ignorado event=${eventType}`)
        return
    }

    await this.subscriptions.save(subscription)

    this.logger.log(
      `[Asaas webhook] Subscription ${subscription.id} status ${previousStatus} -> ${subscription.status}`,
    )
  }

  private async logOnce(eventId: string, eventType: string, payload: any): Promise<boolean> {
    try {
      await this.events.save(this.events.create({ eventId, eventType, payload }))
      return true
    } catch (err: any) {
      if (err?.code === '23505' || err?.driverError?.code === '23505') return false
      this.logger.error('[Asaas webhook] Erro ao registrar idempotência', err)
      throw err
    }
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

  private async sendPaymentFailedEmail(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) return

    await this.email.send({
      to: user.email,
      subject: 'Pagamento recusado — PsicoSaaS',
      html: `
        <p>Olá, ${user.name.split(' ')[0]}.</p>
        <p>Não conseguimos cobrar seu cartão. Atualize o pagamento para continuar usando o PsicoSaaS.</p>
      `,
    })
  }
}
