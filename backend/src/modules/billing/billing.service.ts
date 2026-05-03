import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { AsaasService } from './asaas.service'
import { Subscription } from './entities/subscription.entity'

const TRIAL_DAYS = 7
const PLAN_PRICES: Record<string, number> = { essencial: 79, pro: 149, premium: 249 }

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
    private readonly asaas: AsaasService,
  ) {}

  async getMine(userId: string) {
    const subscription = await this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (!subscription) return { status: 'none' }

    if (
      subscription.cancelAtPeriodEnd
      && subscription.currentPeriodEnd
      && new Date(subscription.currentPeriodEnd).getTime() <= Date.now()
    ) {
      subscription.status = 'canceled'
      subscription.cancelAtPeriodEnd = false
      return this.repo.save(subscription)
    }

    return subscription
  }

  async subscribe(user: User, plan = 'pro', creditCardToken?: string) {
    if (!PLAN_PRICES[plan]) throw new BadRequestException('Plano invalido')

    if (!creditCardToken) {
      throw new BadRequestException('Cartão de crédito obrigatório para iniciar o teste')
    }

    const existing = await this.repo.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    })

    const canUpgradeFromFree = existing?.status === 'active' && existing.plan === 'free' && !existing.gatewaySubscriptionId
    const canAttachPaymentToLocalTrial = existing?.status === 'trialing' && !existing.gatewaySubscriptionId

    if (
      (existing?.status === 'active' || existing?.status === 'trialing')
      && !canUpgradeFromFree
      && !canAttachPaymentToLocalTrial
    ) {
      throw new ConflictException('Usuario ja possui uma assinatura ativa')
    }

    const shouldStartTrial = !existing?.hasUsedTrial
    const trialEndsAt = shouldStartTrial ? new Date(Date.now() + TRIAL_DAYS * 86400000) : null
    const nextDueDate = shouldStartTrial ? this.asaas.addDays(TRIAL_DAYS) : this.asaas.addDays(1)

    const subscription = existing ?? this.repo.create({ userId: user.id })
    Object.assign(subscription, {
      userId: user.id,
      plan,
      status: shouldStartTrial ? 'trialing' : 'active',
      trialEndsAt,
      hasUsedTrial: true,
      currentPeriodEnd: null,
    })

    const saved = await this.repo.save(subscription)
    const gatewayCustomerId = saved.gatewayCustomerId ?? await this.asaas.createCustomer(user)
    const gatewaySubscriptionId = await this.asaas.createSubscription(
      gatewayCustomerId,
      plan,
      saved.id,
      creditCardToken,
      nextDueDate,
    )

    Object.assign(saved, {
      gatewayCustomerId,
      gatewaySubscriptionId,
      status: shouldStartTrial ? 'trialing' : 'active',
      trialEndsAt,
      hasUsedTrial: true,
      currentPeriodEnd: null,
    })

    return this.repo.save(saved)
  }

  async activateFree(userId: string) {
    const existing = await this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (existing?.gatewaySubscriptionId && existing.status !== 'canceled') {
      throw new ConflictException('Cancele a assinatura atual antes de migrar para o plano gratis')
    }

    const subscription = existing ?? this.repo.create({ userId })
    Object.assign(subscription, {
      userId,
      plan: 'free',
      status: 'active',
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
    })

    return this.repo.save(subscription)
  }

  async updateCard(userId: string, creditCardToken?: string) {
    if (!creditCardToken) throw new BadRequestException('creditCardToken é obrigatório')

    const subscription = await this.repo.findOne({
      where: { userId, status: In(['active', 'past_due']) },
      order: { createdAt: 'DESC' },
    })

    if (!subscription?.gatewaySubscriptionId) {
      throw new BadRequestException('Subscription não encontrada')
    }

    await this.asaas.updateSubscriptionCreditCard(subscription.gatewaySubscriptionId, creditCardToken)

    if (subscription.status === 'past_due') {
      await this.asaas.retryLatestSubscriptionPayment(subscription.gatewaySubscriptionId, creditCardToken)
    }

    return this.repo.save(subscription)
  }

  async cancel(userId: string) {
    const subscription = await this.repo.findOne({
      where: { userId, status: In(['active', 'trialing', 'past_due']) },
      order: { createdAt: 'DESC' },
    })

    if (!subscription) throw new NotFoundException('Assinatura ativa nao encontrada')

    if (subscription.gatewaySubscriptionId) {
      await this.asaas.cancelSubscription(subscription.gatewaySubscriptionId)
    }

    const periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null

    if (subscription.status === 'active' && periodEnd && periodEnd.getTime() > Date.now()) {
      subscription.cancelAtPeriodEnd = true
      return this.repo.save(subscription)
    }

    subscription.status = 'canceled'
    subscription.cancelAtPeriodEnd = false
    subscription.currentPeriodEnd = new Date()
    subscription.trialEndsAt = null
    return this.repo.save(subscription)
  }

  async getMetrics() {
    const [active, trialing, pastDue, canceled] = await Promise.all([
      this.repo.count({ where: { status: 'active' } }),
      this.repo.count({ where: { status: 'trialing' } }),
      this.repo.count({ where: { status: 'past_due' } }),
      this.repo.count({ where: { status: 'canceled' } }),
    ])

    const activeSubs = await this.repo.find({ where: { status: 'active' } })
    const mrr = activeSubs.reduce((sum, sub) => sum + (PLAN_PRICES[sub.plan] ?? 0), 0)

    return { active, trialing, past_due: pastDue, canceled, mrr }
  }
}
