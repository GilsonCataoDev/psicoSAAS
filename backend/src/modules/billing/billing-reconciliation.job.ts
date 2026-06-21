import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { AsaasService } from './asaas.service'
import { Subscription } from './entities/subscription.entity'

const RECONCILIATION_INTERVAL_MS = 30 * 60 * 1000
const INITIAL_DELAY_MS = 15 * 1000
const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

@Injectable()
export class BillingReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingReconciliationJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    private readonly asaas: AsaasService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(
      () => this.run().catch(err => this.logger.error('Falha na reconciliação de billing', err)),
      RECONCILIATION_INTERVAL_MS,
    )
    this.initialTimer = setTimeout(
      () => this.run().catch(err => this.logger.error('Falha na reconciliação inicial de billing', err)),
      INITIAL_DELAY_MS,
    )
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.initialTimer) clearTimeout(this.initialTimer)
  }

  async run(): Promise<void> {
    const subscriptions = await this.subscriptions.find({
      where: { status: In(['active', 'trialing', 'past_due']) },
    })

    for (const subscription of subscriptions) {
      if (!subscription.gatewaySubscriptionId) continue

      try {
        await this.reconcile(subscription)
      } catch (err: any) {
        this.logger.warn(
          `Não foi possível reconciliar assinatura ${subscription.id}: ${err?.message ?? 'erro desconhecido'}`,
        )
      }
    }
  }

  private async reconcile(subscription: Subscription): Promise<void> {
    const snapshot = await this.asaas.getSubscriptionBilling(subscription.gatewaySubscriptionId!)
    const previousStatus = subscription.status

    if (['INACTIVE', 'EXPIRED'].includes(snapshot.subscription.status)) {
      subscription.status = 'canceled'
      subscription.cancelAtPeriodEnd = false
    } else {
      const today = new Date().toISOString().slice(0, 10)
      const duePayments = snapshot.payments
        .filter(payment => payment.dueDate && payment.dueDate <= today)
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      const latestDuePayment = duePayments[0]

      if (!latestDuePayment && snapshot.subscription.status === 'ACTIVE') {
        // Assinatura recém-criada: nenhum pagamento vencido ainda, mas Asaas confirma que está ativa.
        subscription.status = 'active'
        subscription.trialEndsAt = null
        subscription.cancelAtPeriodEnd = false
        subscription.currentPeriodEnd = this.parseDate(snapshot.subscription.nextDueDate)
      } else if (latestDuePayment && PAID_STATUSES.has(latestDuePayment.status)) {
        subscription.status = 'active'
        subscription.trialEndsAt = null
        subscription.cancelAtPeriodEnd = false
        subscription.currentPeriodEnd = this.parseDate(snapshot.subscription.nextDueDate)
      } else if (latestDuePayment?.status === 'OVERDUE') {
        subscription.status = 'past_due'
        subscription.trialEndsAt = null
      }
      // PENDING / AWAITING_RISK_ANALYSIS → aguarda webhook, não altera status local
    }

    if (subscription.status === previousStatus) return

    await this.subscriptions.save(subscription)
    this.logger.log(
      `Assinatura ${subscription.id} reconciliada: ${previousStatus} -> ${subscription.status}`,
    )
  }

  private parseDate(value: string | null): Date | null {
    return value ? new Date(`${value}T00:00:00.000Z`) : null
  }
}
