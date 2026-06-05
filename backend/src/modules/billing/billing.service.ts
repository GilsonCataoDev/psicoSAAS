import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { AsaasService } from './asaas.service'
import { Subscription } from './entities/subscription.entity'

const TRIAL_DAYS = 7
const PLAN_PRICES: Record<string, number> = { essencial: 79, pro: 149 }
const DEFAULT_COMPED_PRO_EMAILS = ['gilsonfilho96@outlook.com']
const COMPED_PRO_EMAILS = (process.env.COMPED_PRO_EMAILS ?? DEFAULT_COMPED_PRO_EMAILS.join(','))
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean)

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
    private readonly asaas: AsaasService,
  ) {}

  async getMine(user: Pick<User, 'id' | 'email'>) {
    if (this.isCompedProUser(user)) {
      return this.ensureCompedProSubscription(user)
    }

    const subscription = await this.repo.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    })

    if (!subscription) return { status: 'none' }

    const normalized = await this.normalizeSubscriptionState(subscription)
    if (normalized) return this.toPublicSubscription(normalized)

    return this.toPublicSubscription(subscription)
  }

  private async normalizeSubscriptionState(subscription: Subscription): Promise<Subscription | null> {
    if (
      subscription.status === 'trialing'
      && subscription.trialEndsAt
      && new Date(subscription.trialEndsAt).getTime() <= Date.now()
    ) {
      subscription.status = subscription.gatewaySubscriptionId ? 'past_due' : 'canceled'
      subscription.currentPeriodEnd = subscription.trialEndsAt
      subscription.trialEndsAt = null
      subscription.cancelAtPeriodEnd = false
      return this.repo.save(subscription)
    }

    if (
      subscription.cancelAtPeriodEnd
      && subscription.currentPeriodEnd
      && new Date(subscription.currentPeriodEnd).getTime() <= Date.now()
    ) {
      subscription.status = 'canceled'
      subscription.cancelAtPeriodEnd = false
      return this.repo.save(subscription)
    }

    return null
  }

  async subscribe(user: User, plan = 'pro', creditCardToken?: string) {
    if (this.isCompedProUser(user)) {
      return this.ensureCompedProSubscription(user)
    }

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
    const previousSubscription = existing ? { ...existing } : null

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
    let gatewayCustomerId: string
    let gatewaySubscriptionId: string

    try {
      gatewayCustomerId = saved.gatewayCustomerId ?? await this.asaas.createCustomer(user)
      gatewaySubscriptionId = await this.asaas.createSubscription(
        gatewayCustomerId,
        plan,
        saved.id,
        creditCardToken,
        nextDueDate,
      )
    } catch (err) {
      if (previousSubscription) {
        Object.assign(saved, {
          plan: previousSubscription.plan,
          status: previousSubscription.status,
          gatewayCustomerId: previousSubscription.gatewayCustomerId,
          gatewaySubscriptionId: previousSubscription.gatewaySubscriptionId,
          currentPeriodEnd: previousSubscription.currentPeriodEnd,
          trialEndsAt: previousSubscription.trialEndsAt,
          cancelAtPeriodEnd: previousSubscription.cancelAtPeriodEnd,
          hasUsedTrial: previousSubscription.hasUsedTrial,
        })
        await this.repo.save(saved)
      } else {
        await this.repo.remove(saved)
      }
      throw err
    }

    Object.assign(saved, {
      gatewayCustomerId,
      gatewaySubscriptionId,
      status: shouldStartTrial ? 'trialing' : 'active',
      trialEndsAt,
      hasUsedTrial: true,
      currentPeriodEnd: null,
    })

    return this.toPublicSubscription(await this.repo.save(saved))
  }

  async activateFree(user: Pick<User, 'id' | 'email'>) {
    if (this.isCompedProUser(user)) {
      return this.ensureCompedProSubscription(user)
    }

    const existing = await this.repo.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    })

    if (existing?.gatewaySubscriptionId && existing.status !== 'canceled') {
      throw new ConflictException('Cancele a assinatura atual antes de migrar para o plano gratis')
    }

    const subscription = existing ?? this.repo.create({ userId: user.id })
    Object.assign(subscription, {
      userId: user.id,
      plan: 'free',
      status: 'active',
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
    })

    return this.toPublicSubscription(await this.repo.save(subscription))
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

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  async changePlan(user: Pick<User, 'id' | 'email'>, plan?: string) {
    if (this.isCompedProUser(user)) {
      return this.ensureCompedProSubscription(user)
    }

    if (!plan || !PLAN_PRICES[plan]) throw new BadRequestException('Plano invalido')

    const subscription = await this.repo.findOne({
      where: { userId: user.id, status: In(['active', 'trialing', 'past_due']) },
      order: { createdAt: 'DESC' },
    })

    if (!subscription) throw new NotFoundException('Assinatura ativa nao encontrada')
    if (subscription.plan === plan) return this.toPublicSubscription(subscription)

    if (!subscription.gatewaySubscriptionId) {
      subscription.plan = plan
      subscription.cancelAtPeriodEnd = false
      return this.toPublicSubscription(await this.repo.save(subscription))
    }

    await this.asaas.updateSubscriptionPlan(subscription.gatewaySubscriptionId, plan)

    subscription.plan = plan
    subscription.cancelAtPeriodEnd = false
    if (subscription.status === 'past_due') subscription.status = 'active'

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  async cancel(user: Pick<User, 'id' | 'email'>) {
    if (this.isCompedProUser(user)) {
      return this.ensureCompedProSubscription(user)
    }

    const subscription = await this.repo.findOne({
      where: { userId: user.id, status: In(['active', 'trialing', 'past_due']) },
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
      return this.toPublicSubscription(await this.repo.save(subscription))
    }

    subscription.plan = 'free'
    subscription.status = 'active'
    subscription.gatewayCustomerId = null
    subscription.gatewaySubscriptionId = null
    subscription.cancelAtPeriodEnd = false
    subscription.currentPeriodEnd = new Date()
    subscription.trialEndsAt = null
    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  private isCompedProUser(user: Pick<User, 'email'>): boolean {
    return COMPED_PRO_EMAILS.includes(user.email.toLowerCase())
  }

  private async ensureCompedProSubscription(user: Pick<User, 'id' | 'email'>) {
    const subscription = await this.repo.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    }) ?? this.repo.create({ userId: user.id })

    if (subscription.gatewaySubscriptionId && subscription.status !== 'canceled') {
      await this.asaas.cancelSubscription(subscription.gatewaySubscriptionId)
    }

    Object.assign(subscription, {
      userId: user.id,
      plan: 'pro',
      status: 'active',
      gatewayCustomerId: null,
      gatewaySubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      hasUsedTrial: true,
    })

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  private toPublicSubscription(subscription: Subscription) {
    const { gatewayCustomerId, gatewaySubscriptionId, ...safeSubscription } = subscription
    void gatewayCustomerId
    void gatewaySubscriptionId
    return safeSubscription
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
