import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { AsaasService } from './asaas.service'
import { Subscription } from './entities/subscription.entity'
import { AdvisoryLockService, JOB_LOCK_KEYS } from '../../common/advisory-lock/advisory-lock.service'

const RECONCILIATION_INTERVAL_MS = 30 * 60 * 1000
const INITIAL_DELAY_MS = 15 * 1000
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 2_000
const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
const BLOCKED_PAYMENT_STATUSES = new Set([
  'OVERDUE',
  'DELETED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'REFUND_IN_PROGRESS',
  'CHARGEBACK_REQUESTED',
  'CHARGEBACK_DISPUTE',
  'AWAITING_CHARGEBACK_REVERSAL',
  'RECEIVED_IN_CASH_UNDONE',
])

@Injectable()
export class BillingReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingReconciliationJob.name)
  private timer?: NodeJS.Timeout
  private initialTimer?: NodeJS.Timeout
  private running = false

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    private readonly asaas: AsaasService,
    private readonly lock: AdvisoryLockService,
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
    if (this.running) return
    this.running = true
    try {
      await this.lock.withLock(JOB_LOCK_KEYS.BILLING_RECONCILIATION, () => this.runLocked())
    } finally {
      this.running = false
    }
  }

  private async runLocked(): Promise<void> {
    const subscriptions = await this.subscriptions.find({
      where: { status: In(['active', 'trialing', 'past_due']) },
    })

    const eligible = subscriptions.filter(s => s.gatewaySubscriptionId)

    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(s =>
          this.reconcile(s).catch((err: any) =>
            this.logger.warn(
              `Não foi possível reconciliar assinatura ${s.id}: ${err?.message ?? 'erro desconhecido'}`,
            ),
          ),
        ),
      )
      if (i + BATCH_SIZE < eligible.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    if (eligible.length > 0) {
      this.logger.log(`Reconciliação concluída: ${eligible.length} assinatura(s) processada(s)`)
    }
  }

  private async reconcile(subscription: Subscription): Promise<void> {
    const snapshot = await this.asaas.getSubscriptionBilling(subscription.gatewaySubscriptionId!)
    const previousStatus = subscription.status
    const previousState = this.reconciliationState(subscription)

    if (['INACTIVE', 'EXPIRED'].includes(snapshot.subscription.status)) {
      if (!this.hasPaidThroughAccess(subscription)) {
        this.downgradeToFree(subscription)
      }
    } else {
      const today = new Date().toISOString().slice(0, 10)
      const duePayments = snapshot.payments
        .filter(payment => payment.dueDate && payment.dueDate <= today)
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      const latestDuePayment = duePayments[0]

      if (
        !latestDuePayment
        && snapshot.subscription.status === 'ACTIVE'
        && !this.hasActiveTrial(subscription)
        && !this.hasPaidThroughAccess(subscription)
      ) {
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
      } else if (latestDuePayment && BLOCKED_PAYMENT_STATUSES.has(latestDuePayment.status)) {
        subscription.status = 'past_due'
        subscription.trialEndsAt = null
      }
      // PENDING / AWAITING_RISK_ANALYSIS → aguarda webhook, não altera status local
    }

    if (this.reconciliationState(subscription) === previousState) return

    await this.subscriptions.save(subscription)
    this.logger.log(
      `Assinatura ${subscription.id} reconciliada: ${previousStatus} -> ${subscription.status}`,
    )
  }

  private parseDate(value: string | null): Date | null {
    return value ? new Date(`${value}T00:00:00.000Z`) : null
  }

  private reconciliationState(subscription: Subscription): string {
    return JSON.stringify({
      plan: subscription.plan,
      status: subscription.status,
      gatewayCustomerId: subscription.gatewayCustomerId,
      gatewaySubscriptionId: subscription.gatewaySubscriptionId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    })
  }

  private hasActiveTrial(subscription: Subscription): boolean {
    return subscription.status === 'trialing'
      && !!subscription.trialEndsAt
      && new Date(subscription.trialEndsAt).getTime() > Date.now()
  }

  private hasPaidThroughAccess(subscription: Subscription): boolean {
    return subscription.cancelAtPeriodEnd
      && !!subscription.currentPeriodEnd
      && new Date(subscription.currentPeriodEnd).getTime() > Date.now()
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
}
