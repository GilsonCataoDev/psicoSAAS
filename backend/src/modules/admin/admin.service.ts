import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { Subscription, BillingSubscriptionStatus } from '../billing/entities/subscription.entity'
import { AsaasService } from '../billing/asaas.service'
import { OverrideSubscriptionDto } from './dto/override-subscription.dto'

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    private readonly asaas: AsaasService,
  ) {}

  async listUsers(page: number, limit: number) {
    const [users, total] = await this.users.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'name', 'email', 'crp', 'specialty', 'isActive', 'emailVerified', 'createdAt'],
    })

    const ids = users.map(u => u.id)
    const subscriptions = ids.length
      ? await this.subs.createQueryBuilder('s')
          .where('s.userId IN (:...ids)', { ids })
          .orderBy('s.createdAt', 'DESC')
          .getMany()
      : []

    const subByUser = new Map<string, Subscription>()
    for (const s of subscriptions) {
      if (!subByUser.has(s.userId)) subByUser.set(s.userId, s)
    }

    return {
      data: users.map(u => ({ ...u, subscription: subByUser.get(u.id) ?? null })),
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
