import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, MoreThan, Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { Subscription, BillingSubscriptionStatus } from '../billing/entities/subscription.entity'
import { WebhookEvent } from '../billing/entities/webhook-event.entity'
import { EmailLog } from '../email/entities/email-log.entity'
import { AsaasService } from '../billing/asaas.service'
import { OverrideSubscriptionDto } from './dto/override-subscription.dto'
import { ListAdminUsersDto } from './dto/list-admin-users.dto'

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(WebhookEvent) private readonly webhookEvents: Repository<WebhookEvent>,
    @InjectRepository(EmailLog) private readonly emailLogs: Repository<EmailLog>,
    private readonly asaas: AsaasService,
    private readonly cfg: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async listUsers(filters: ListAdminUsersDto) {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const latestSubscriptionId = this.subs
      .createQueryBuilder('latest')
      .select('latest.id')
      .where('latest.userId = u.id')
      .orderBy('latest.createdAt', 'DESC')
      .limit(1)
      .getQuery()

    const qb = this.users
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.crp', 'u.specialty', 'u.isActive', 'u.emailVerified', 'u.createdAt'])
      .leftJoinAndMapOne('u.subscription', Subscription, 'subscription', `subscription.id = (${latestSubscriptionId})`)
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const search = filters.search?.trim().toLowerCase()
    if (search) {
      qb.andWhere('(LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search OR LOWER(u.crp) LIKE :search)', {
        search: `%${search}%`,
      })
    }
    if (filters.plan) qb.andWhere('subscription.plan = :plan', { plan: filters.plan })
    if (filters.status === 'none') {
      qb.andWhere('subscription.id IS NULL')
    } else if (filters.status) {
      qb.andWhere('subscription.status = :status', { status: filters.status })
    }

    const [users, total] = await qb.getManyAndCount()

    return {
      data: users.map(u => ({ ...u, subscription: (u as User & { subscription?: Subscription }).subscription ?? null })),
      total,
      page,
      limit,
    }
  }

  async getUser(id: string) {
    const user = await this.users.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'crp', 'specialty', 'isActive', 'emailVerified', 'phone', 'createdAt', 'updatedAt'],
    })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    const subscription = await this.subs.findOne({
      where: { userId: id },
      order: { createdAt: 'DESC' },
    })

    return { ...user, subscription: subscription ?? null }
  }

  async overrideSubscription(userId: string, dto: OverrideSubscriptionDto) {
    const user = await this.users.findOneBy({ id: userId })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    let sub = await this.subs.findOne({ where: { userId }, order: { createdAt: 'DESC' } })

    if (!sub) {
      sub = this.subs.create({ userId, plan: 'free', status: 'none' as BillingSubscriptionStatus })
    }

    if (sub.gatewaySubscriptionId) {
      if (dto.status === 'canceled' || dto.plan === 'free') {
        await this.asaas.cancelSubscription(sub.gatewaySubscriptionId)
      } else if (dto.plan && dto.plan !== sub.plan) {
        await this.asaas.updateSubscriptionPlan(sub.gatewaySubscriptionId, dto.plan)
      }
    }

    if (dto.plan) sub.plan = dto.plan
    if (dto.status) {
      sub.status = dto.status as BillingSubscriptionStatus
      if (dto.status === 'canceled') {
        sub.cancelAtPeriodEnd = false
        sub.gatewaySubscriptionId = null
        sub.trialEndsAt = null
      }
    }
    if (dto.plan === 'free') {
      sub.status = dto.status ? sub.status : 'active'
      sub.cancelAtPeriodEnd = false
      sub.gatewayCustomerId = null
      sub.gatewaySubscriptionId = null
      sub.trialEndsAt = null
      sub.currentPeriodEnd = new Date()
    }

    return this.subs.save(sub)
  }

  async getMonitor() {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [database, emailSent, emailFailed, recentFailures, webhookEvents, subsByStatus, pastDueUsers] =
      await Promise.all([
        this.checkDatabase(),
        this.emailLogs.count({ where: { status: 'sent', createdAt: MoreThan(since7d) } }),
        this.emailLogs.count({ where: { status: 'failed', createdAt: MoreThan(since7d) } }),
        this.emailLogs.find({
          where: { status: 'failed', createdAt: MoreThan(since7d) },
          order: { createdAt: 'DESC' },
          take: 10,
          select: ['id', 'to', 'subject', 'error', 'createdAt'],
        }),
        this.webhookEvents.find({
          order: { processedAt: 'DESC' },
          take: 20,
          select: ['id', 'eventType', 'eventId', 'processedAt'],
        }),
        this.subs
          .createQueryBuilder('s')
          .select('s.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('s.status')
          .getRawMany<{ status: string; count: string }>(),
        this.subs
          .createQueryBuilder('s')
          .innerJoinAndSelect('s.user', 'u')
          .select(['s.id', 's.plan', 's.status', 's.createdAt', 'u.id', 'u.name', 'u.email'])
          .where('s.status = :status', { status: 'past_due' })
          .andWhere('s.createdAt > :since', { since: since30d })
          .orderBy('s.createdAt', 'DESC')
          .take(20)
          .getMany(),
      ])

    const integrations = this.getIntegrationStatus()

    return {
      generatedAt: new Date().toISOString(),
      system: {
        database,
        integrations,
      },
      email: {
        last7d: { sent: emailSent, failed: emailFailed },
        failureRate: emailSent + emailFailed > 0
          ? Math.round((emailFailed / (emailSent + emailFailed)) * 100)
          : 0,
        recentFailures,
      },
      billing: {
        byStatus: Object.fromEntries(subsByStatus.map(r => [r.status, Number(r.count)])),
        pastDueAccounts: pastDueUsers,
        recentWebhooks: webhookEvents,
      },
    }
  }

  private async checkDatabase() {
    const startedAt = Date.now()
    try {
      await this.dataSource.query('SELECT 1')
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      }
    } catch {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      }
    }
  }

  private getIntegrationStatus() {
    const whatsappUrl = this.cfg.get<string>('WHATSAPP_API_URL') ?? ''
    const whatsappKey = this.cfg.get<string>('WHATSAPP_API_KEY') ?? ''
    const resendKey = this.cfg.get<string>('RESEND_API_KEY') ?? ''
    const resendFrom = this.cfg.get<string>('RESEND_FROM') ?? ''
    const asaasKey = this.cfg.get<string>('ASAAS_API_KEY') ?? ''
    const asaasWebhookToken = this.cfg.get<string>('ASAAS_WEBHOOK_TOKEN') ?? ''
    const webPushPublic = this.cfg.get<string>('WEB_PUSH_PUBLIC_KEY') ?? ''
    const webPushPrivate = this.cfg.get<string>('WEB_PUSH_PRIVATE_KEY') ?? ''

    return {
      resend: {
        configured: Boolean(resendKey && resendFrom),
        fromConfigured: Boolean(resendFrom),
      },
      asaas: {
        configured: Boolean(asaasKey),
        webhookProtected: Boolean(asaasWebhookToken),
      },
      whatsapp: {
        configured: Boolean(
          whatsappUrl
          && whatsappKey
          && !whatsappUrl.includes('your-evolution-api')
          && whatsappKey !== 'your-api-key',
        ),
      },
      webPush: {
        configured: Boolean(webPushPublic && webPushPrivate),
      },
    }
  }

  async getHealthScores() {
    type RawRow = {
      id: string
      name: string
      email: string
      lastActiveAt: Date | null
      createdAt: Date
      plan: string | null
      subscriptionStatus: string | null
      patientCount: string
      sessionsLast30d: string
      hasFinancialLast30d: boolean
      hasAiUsageLast30d: boolean
    }

    const rows: RawRow[] = await this.dataSource.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u."lastActiveAt",
        u."createdAt",
        sub.plan,
        sub.status                                             AS "subscriptionStatus",
        (SELECT COUNT(*)::int FROM patients p
           WHERE p."psychologistId" = u.id)                   AS "patientCount",
        (SELECT COUNT(*)::int FROM sessions ses
           WHERE ses."psychologistId" = u.id
             AND ses."createdAt" > NOW() - INTERVAL '30 days') AS "sessionsLast30d",
        (SELECT EXISTS (
           SELECT 1 FROM financial_records fr
           WHERE fr."psychologistId" = u.id
             AND fr."createdAt" > NOW() - INTERVAL '30 days'
         ))                                                    AS "hasFinancialLast30d",
        (SELECT EXISTS (
           SELECT 1 FROM ai_usage au
           WHERE au."userId" = u.id::text
             AND au."updatedAt" > NOW() - INTERVAL '30 days'
             AND (au."transcriptionSeconds" > 0 OR au."summaryRequests" > 0)
         ))                                                    AS "hasAiUsageLast30d"
      FROM users u
      LEFT JOIN LATERAL (
        SELECT s.plan, s.status
        FROM billing_subscriptions s
        WHERE s."userId" = u.id
        ORDER BY s."createdAt" DESC
        LIMIT 1
      ) sub ON TRUE
      WHERE u."isActive" = true
      ORDER BY u."lastActiveAt" DESC NULLS LAST
    `)

    return rows.map(r => {
      const { rawScore, score } = this.computeScore(r)
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        lastActiveAt: r.lastActiveAt,
        createdAt: r.createdAt,
        plan: r.plan,
        subscriptionStatus: r.subscriptionStatus,
        patientCount: Number(r.patientCount),
        sessionsLast30d: Number(r.sessionsLast30d),
        hasFinancialLast30d: r.hasFinancialLast30d,
        hasAiUsageLast30d: r.hasAiUsageLast30d,
        rawScore,
        score,
        tier: score >= 80 ? 'healthy' : score >= 50 ? 'attention' : 'risk',
      }
    })
  }

  private computeScore(r: {
    lastActiveAt: Date | null
    createdAt: Date
    plan: string | null
    patientCount: string
    sessionsLast30d: string
    hasFinancialLast30d: boolean
    hasAiUsageLast30d: boolean
  }): { rawScore: number; score: number } {
    const now = Date.now()
    const reference = r.lastActiveAt ?? r.createdAt
    const daysSince = Math.floor((now - new Date(reference).getTime()) / 86_400_000)

    // Recência de login — 40 pts
    let recency = 0
    if (daysSince <= 7) recency = 40
    else if (daysSince <= 14) recency = 28
    else if (daysSince <= 30) recency = 15
    else if (daysSince <= 60) recency = 5

    // Pacientes cadastrados — 15 pts
    const patients = Number(r.patientCount)
    const patientPts = patients >= 5 ? 15 : patients >= 3 ? 10 : patients >= 1 ? 5 : 0

    // Sessões últimos 30 dias — 25 pts
    const sessions = Number(r.sessionsLast30d)
    const sessionPts = sessions >= 10 ? 25 : sessions >= 4 ? 17 : sessions >= 1 ? 8 : 0

    // Uso financeiro — 10 pts
    const financialPts = r.hasFinancialLast30d ? 10 : 0

    // Uso de IA (só Pro) — 10 pts; Free nunca marca aqui, teto bruto = 90
    const aiPts = r.plan === 'pro' && r.hasAiUsageLast30d ? 10 : 0

    const rawScore = recency + patientPts + sessionPts + financialPts + aiPts

    // Normaliza pelo teto do plano para que Free e Pro usem a mesma escala 0-100
    const maxPossible = r.plan === 'pro' ? 100 : 90
    const score = Math.min(100, Math.round((rawScore / maxPossible) * 100))

    return { rawScore, score }
  }

  async getStats() {
    const [totalUsers, activeUsers] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { isActive: true } }),
    ])

    const byPlanStatus = await this.subs
      .createQueryBuilder('s')
      .select('s.plan', 'plan')
      .addSelect('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.plan')
      .addGroupBy('s.status')
      .getRawMany<{ plan: string; status: string; count: string }>()

    const mrr = byPlanStatus
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + ({ essencial: 79, pro: 149 }[r.plan] ?? 0) * Number(r.count), 0)

    return { totalUsers, activeUsers, byPlanStatus, mrr }
  }
}
