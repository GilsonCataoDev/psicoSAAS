import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { AsaasService } from './asaas.service'
import { Subscription } from './entities/subscription.entity'
import { isCompedProEmail, LATEST_SUBSCRIPTION_ORDER, PLAN_PRICES } from '../../common/plans'

const TRIAL_DAYS = 7
const ACTIVATION_OFFER_CODE = 'ROTINA20'
const REFERRAL_OFFER_CODE = 'INDICACAO20'
const BETA_FREE_ACCESS = process.env.BETA_FREE_ACCESS !== 'false'

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
    private readonly asaas: AsaasService,
    private readonly dataSource: DataSource,
  ) {}

  async getMine(user: Pick<User, 'id' | 'email'>) {
    const subscription = await this.repo.findOne({
      where: { userId: user.id },
      order: LATEST_SUBSCRIPTION_ORDER,
    })

    if (!subscription) {
      if (this.isCompedProUser(user)) {
        return this.ensureCompedProSubscription(user)
      }
      if (BETA_FREE_ACCESS) {
        return this.ensureBetaFreeSubscription(user)
      }
      return { status: 'none' }
    }

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
      subscription.plan = 'free'
      subscription.status = 'active'
      subscription.gatewayCustomerId = null
      subscription.gatewaySubscriptionId = null
      subscription.cancelAtPeriodEnd = false
      subscription.currentPeriodEnd = new Date()
      subscription.trialEndsAt = null
      this.clearPromotion(subscription)
      return this.repo.save(subscription)
    }

    return null
  }

  async subscribe(user: User, plan = 'pro', creditCardToken?: string) {
    if (!PLAN_PRICES[plan]) throw new BadRequestException('Plano invalido')

    if (!creditCardToken) {
      throw new BadRequestException('Cartão de crédito obrigatório para iniciar o teste')
    }

    const existing = await this.repo.findOne({
      where: { userId: user.id },
      order: LATEST_SUBSCRIPTION_ORDER,
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
    const promo = await this.getApplicablePromotion(user, plan, existing)

    const subscription = existing ?? this.repo.create({ userId: user.id })
    Object.assign(subscription, {
      userId: user.id,
      plan,
      status: shouldStartTrial ? 'trialing' : 'active',
      trialEndsAt,
      hasUsedTrial: true,
      currentPeriodEnd: null,
      promoCode: promo?.code ?? null,
      promoDiscountPercent: promo?.discountPercent ?? 0,
      promoCyclesTotal: promo?.cycles ?? 0,
      promoCyclesUsed: 0,
      regularMonthlyValue: promo ? String(PLAN_PRICES[plan].toFixed(2)) : null,
      lastPromoPaymentId: null,
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
        promo ? {
          valueOverride: this.discountedValue(plan, promo.discountPercent),
          descriptionSuffix: `${promo.code} ${promo.discountPercent}% por ${promo.cycles} meses`,
        } : undefined,
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
          promoCode: previousSubscription.promoCode,
          promoDiscountPercent: previousSubscription.promoDiscountPercent,
          promoCyclesTotal: previousSubscription.promoCyclesTotal,
          promoCyclesUsed: previousSubscription.promoCyclesUsed,
          regularMonthlyValue: previousSubscription.regularMonthlyValue,
          lastPromoPaymentId: previousSubscription.lastPromoPaymentId,
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
    const existing = await this.repo.findOne({
      where: { userId: user.id },
      order: LATEST_SUBSCRIPTION_ORDER,
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
    this.clearPromotion(subscription)

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  async getFreeUpgradeOffer(user: Pick<User, 'id' | 'email'>) {
    const subscription = await this.repo.findOne({
      where: { userId: user.id },
      order: LATEST_SUBSCRIPTION_ORDER,
    })
    const plan = subscription?.plan ?? 'free'
    const activeFree = subscription?.status === 'active' && plan === 'free'

    type Row = { daysSinceSignup: string; patients: string; sessions: string }
    const [row] = await this.dataSource.query<Row[]>(`
      SELECT
        FLOOR(EXTRACT(EPOCH FROM (NOW() - u."createdAt")) / 86400)::int AS "daysSinceSignup",
        (SELECT COUNT(*)::int FROM patients p WHERE p."psychologistId" = u.id) AS patients,
        (SELECT COUNT(*)::int FROM sessions s WHERE s."psychologistId" = u.id) AS sessions
      FROM users u
      WHERE u.id = $1
      LIMIT 1
    `, [user.id])

    const daysSinceSignup = Number(row?.daysSinceSignup ?? 0)
    const patients = Number(row?.patients ?? 0)
    const sessions = Number(row?.sessions ?? 0)
    const activated = patients >= 2 || sessions >= 1
    const eligible = activeFree && daysSinceSignup >= 7 && activated

    return {
      eligible,
      daysSinceSignup,
      patients,
      sessions,
      offerCode: eligible ? 'ROTINA20' : null,
      discount: eligible ? {
        pro: '30% nos 3 primeiros meses',
      } : null,
      title: 'Sua rotina ja comecou. Agora libere mais limite.',
      message: 'Continue com documentos, mais pacientes, transcricao por IA e automacoes para reduzir retrabalho.',
      benefits: [
        'Pro: pacientes ilimitados, documentos, WhatsApp automatico, instrumentos e 120 min de IA',
      ],
    }
  }

  async updateCard(userId: string, creditCardToken?: string, plan?: string) {
    if (!creditCardToken) throw new BadRequestException('creditCardToken é obrigatório')
    if (plan && !PLAN_PRICES[plan]) throw new BadRequestException('Plano invalido')

    const subscription = await this.repo.findOne({
      where: { userId, status: In(['active', 'past_due']) },
      order: LATEST_SUBSCRIPTION_ORDER,
    })

    if (!subscription?.gatewaySubscriptionId) {
      throw new BadRequestException('Subscription não encontrada')
    }

    await this.asaas.updateSubscriptionCreditCard(subscription.gatewaySubscriptionId, creditCardToken)

    if (plan && subscription.plan !== plan) {
      await this.asaas.updateSubscriptionPlan(subscription.gatewaySubscriptionId, plan)
      subscription.plan = plan
      subscription.cancelAtPeriodEnd = false
    }

    if (subscription.status === 'past_due') {
      await this.asaas.retryLatestSubscriptionPayment(subscription.gatewaySubscriptionId, creditCardToken)
    }

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  async changePlan(user: Pick<User, 'id' | 'email'>, plan?: string) {
    if (!plan || !PLAN_PRICES[plan]) throw new BadRequestException('Plano invalido')

    const subscription = await this.repo.findOne({
      where: { userId: user.id, status: In(['active', 'trialing', 'past_due']) },
      order: LATEST_SUBSCRIPTION_ORDER,
    })

    if (!subscription) throw new NotFoundException('Assinatura ativa nao encontrada')
    if (subscription.plan === plan) return this.toPublicSubscription(subscription)

    if (!subscription.gatewaySubscriptionId) {
      subscription.plan = plan
      subscription.cancelAtPeriodEnd = false
      this.clearPromotion(subscription)
      return this.toPublicSubscription(await this.repo.save(subscription))
    }

    await this.asaas.updateSubscriptionPlan(subscription.gatewaySubscriptionId, plan)

    subscription.plan = plan
    subscription.cancelAtPeriodEnd = false
    this.clearPromotion(subscription)
    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  async cancel(user: Pick<User, 'id' | 'email'>) {
    const subscription = await this.repo.findOne({
      where: { userId: user.id, status: In(['active', 'trialing', 'past_due']) },
      order: LATEST_SUBSCRIPTION_ORDER,
    })

    if (!subscription) throw new NotFoundException('Assinatura ativa nao encontrada')

    let periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null

    if (subscription.gatewaySubscriptionId && subscription.status === 'active') {
      try {
        const snapshot = await this.asaas.getSubscriptionBilling(subscription.gatewaySubscriptionId)
        const gatewayPeriodEnd = snapshot.subscription.nextDueDate
          ? new Date(`${snapshot.subscription.nextDueDate}T00:00:00.000Z`)
          : null
        if (gatewayPeriodEnd && gatewayPeriodEnd.getTime() > Date.now()) {
          periodEnd = gatewayPeriodEnd
        }
      } catch {
        // Se a conciliação falhar, usa a data local para não impedir o cancelamento.
      }
    }

    if (subscription.status === 'active' && periodEnd && periodEnd.getTime() > Date.now()) {
      subscription.cancelAtPeriodEnd = true
      subscription.currentPeriodEnd = periodEnd
      const scheduled = await this.repo.save(subscription)

      if (subscription.gatewaySubscriptionId) {
        try {
          await this.asaas.cancelSubscription(subscription.gatewaySubscriptionId)
        } catch (err) {
          scheduled.cancelAtPeriodEnd = false
          await this.repo.save(scheduled)
          throw err
        }
      }

      return this.toPublicSubscription(scheduled)
    }

    if (subscription.gatewaySubscriptionId) {
      await this.asaas.cancelSubscription(subscription.gatewaySubscriptionId)
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
    return isCompedProEmail(user.email)
  }

  private async ensureCompedProSubscription(user: Pick<User, 'id' | 'email'>) {
    const subscription = await this.repo.findOne({
      where: { userId: user.id },
      order: LATEST_SUBSCRIPTION_ORDER,
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
      promoCode: null,
      promoDiscountPercent: 0,
      promoCyclesTotal: 0,
      promoCyclesUsed: 0,
      regularMonthlyValue: null,
      lastPromoPaymentId: null,
    })

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  private async ensureBetaFreeSubscription(user: Pick<User, 'id' | 'email'>) {
    const subscription = await this.repo.findOne({
      where: { userId: user.id },
      order: LATEST_SUBSCRIPTION_ORDER,
    }) ?? this.repo.create({ userId: user.id })

    Object.assign(subscription, {
      userId: user.id,
      plan: 'free',
      status: 'active',
      gatewayCustomerId: null,
      gatewaySubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      hasUsedTrial: false,
      promoCode: null,
      promoDiscountPercent: 0,
      promoCyclesTotal: 0,
      promoCyclesUsed: 0,
      regularMonthlyValue: null,
      lastPromoPaymentId: null,
    })

    return this.toPublicSubscription(await this.repo.save(subscription))
  }

  private toPublicSubscription(subscription: Subscription) {
    const { gatewayCustomerId, gatewaySubscriptionId, ...safeSubscription } = subscription
    void gatewayCustomerId
    void gatewaySubscriptionId
    return safeSubscription
  }

  private async getApplicablePromotion(
    user: Pick<User, 'id' | 'email'>,
    plan: string,
    existing?: Subscription | null,
  ): Promise<{ code: string; discountPercent: number; cycles: number } | null> {
    if (!PLAN_PRICES[plan]) return null
    if (existing?.gatewaySubscriptionId) return null

    const activationOffer = await this.getFreeUpgradeOffer(user)
    if (activationOffer.eligible) {
      return {
        code: ACTIVATION_OFFER_CODE,
        discountPercent: plan === 'pro' ? 30 : 20,
        cycles: 3,
      }
    }

    const [{ referralCode } = { referralCode: null }] = await this.dataSource.query<Array<{ referralCode: string | null }>>(
      'SELECT "referralCode" FROM users WHERE id = $1 LIMIT 1',
      [user.id],
    )

    if (referralCode) {
      return {
        code: REFERRAL_OFFER_CODE,
        discountPercent: 20,
        cycles: 1,
      }
    }

    return null
  }

  private discountedValue(plan: string, discountPercent: number): number {
    return Number((PLAN_PRICES[plan] * (1 - discountPercent / 100)).toFixed(2))
  }

  private clearPromotion(subscription: Subscription): void {
    subscription.promoCode = null
    subscription.promoDiscountPercent = 0
    subscription.promoCyclesTotal = 0
    subscription.promoCyclesUsed = 0
    subscription.regularMonthlyValue = null
    subscription.lastPromoPaymentId = null
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
